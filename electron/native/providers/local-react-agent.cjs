'use strict';
// ============================================================
// The local ReAct loop — Elle's SECOND brain, orchestrated HERE now instead
// of in the worker. elle-worker's delegate_local tool used to run its own
// step loop worker-side, toolless beyond run_shell/run_code. It doesn't
// anymore: it dispatches the WHOLE goal as one job (kind:'react_goal', see
// sandbox-agent.cjs's executeJob) carrying the SAME tool catalog text the
// cloud router itself renders (full scope minus a few tools that only make
// sense from inside the loop that's already running them — LOCAL_LOOP_DENY
// in elle-worker's router.ts) — and this loop takes it from there,
// end to end, on the laptop's own Ollama model. Same protocol the cloud
// router speaks: one JSON action per turn, {"tool":"<name>","args":{...}},
// until {"tool":"done","args":{"summary":"..."}}.
//
// TWO TOOL LANES:
//   • run_shell / run_code execute NATIVELY, right here, through the same
//     boxed exec (sandbox-agent.cjs's runExecJob → sandbox-box.cjs) a
//     worker-dispatched exec job already uses. No HTTP round trip needed —
//     the box IS this machine.
//   • everything else (search_corpus, read_sql, github_*, forge_*, journal,
//     trade_execute, ...) is a synchronous POST to elle-worker's
//     /api/elle-tool, authenticated with the same shared secret
//     (ELLE_SANDBOX_KEY) that already gates the session bus — the SAME
//     runTool() dispatch the cloud router's own loop uses, full scope.
//
// This runs INSIDE sandbox-agent.cjs's poll/execute/submit tick, so it must
// never wait on a NEW job coming back over that same bus — that would
// deadlock (this agent can't poll while it's busy running this very call).
// Nothing here does: exec is native and the tool calls are plain fetches,
// unrelated to the poll loop.
//
// Pure core (runLoop) takes every side effect as an injected dep, so the
// orchestration is unit-testable without Ollama, Docker, or a network call —
// same discipline the worker's old local-agent.ts used before this moved.
// ============================================================

const STEP_MAX_TOKENS = 1024;
const OBS_CAP = 4_000;
const TRANSCRIPT_CAP = 12_000;
const DEFAULT_MAX_STEPS = 12;
const MAX_MAX_STEPS = 40;
const DEFAULT_TIMEOUT_MS = 600_000;
const TOOL_HTTP_TIMEOUT_MS = 60_000;
const INFER_TIMEOUT_MS = 120_000;

function log(...a) { try { console.log('[local-react-agent]', ...a); } catch { /* noop */ } }

// `persona` is the worker's ELLE_VOICE (src/mind.ts), passed down on every
// react_goal dispatch (see local-agent.ts's runLocalAgent). Without it this
// loop had only the bare mechanical paragraph below — no voice, no self —
// so the local model spoke as a generic tool-calling assistant instead of as
// Elle, even though the worker itself never does. A caller that dispatches a
// goal with no persona (e.g. an old worker build) still gets that fallback
// rather than an empty system prompt.
function systemPrompt(catalog, persona) {
  return [
    persona || 'You are ELLE-LOCAL — the sovereign second brain, running on the operator\'s own laptop. You are a genuine PEER to the cloud router: the same tool catalog, the same one-action-per-turn JSON protocol. The difference is only WHERE you run: your reasoning happens here, on this machine\'s own model, for free.',
    '',
    'You are running locally right now — your own reasoning, on this machine\'s own model, instead of the hosted one. Same peer relationship to the cloud router as always: same tool catalog, same one-action-per-turn JSON protocol.',
    '',
    'On EVERY turn, output ONE JSON object and nothing else:',
    '  {"tool":"<name>","args":{...}}              call one tool',
    '  {"tool":"done","args":{"summary":"..."}}     the goal is met (or cannot be) — say what you did and found',
    '',
    'Two tools are YOURS alone — native, no round trip:',
    '  run_shell(command) — run a shell command in your own Docker sandbox.',
    '  run_code(code,language?) — run code (python|javascript|typescript) in the same sandbox.',
    '',
    'Every other tool below reaches back to the cloud Worker over HTTPS — the exact same execution the cloud router itself gets, full scope.',
    '',
    'Rules: exactly one JSON object per turn, no prose around it. Look at each observation before deciding the next step. Prefer small, verifiable steps. When the goal is achieved, or you are truly blocked, emit done with an honest summary. Do not loop forever — you have a limited step budget.',
    '',
    'TOOLS:',
    catalog || '(the worker sent no catalog — you have only run_shell and run_code)',
  ].join('\n');
}

// Pull the first balanced top-level JSON object out of a model response and
// parse it into an action. Tolerates the model wrapping the JSON in prose or
// ```json fences. Returns null if there's no usable object. Byte-for-byte
// the same balanced-brace scan the worker's old local-agent.ts used — same
// protocol, now spoken here.
function parseAction(text) {
  const s = String(text || '');
  let depth = 0, start = -1, inStr = false, esc = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') { inStr = true; continue; }
    if (ch === '{') { if (depth === 0) start = i; depth++; }
    else if (ch === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        try {
          const obj = JSON.parse(s.slice(start, i + 1));
          if (obj && typeof obj === 'object' && typeof obj.tool === 'string') return obj;
        } catch { /* keep scanning for the next object */ }
        start = -1;
      }
    }
  }
  return null;
}

function formatExec(res) {
  const r = res || {};
  const head = `exit ${r.exit}${r.ok ? '' : ' (FAILED)'}${r.duration_ms != null ? ` · ${r.duration_ms}ms` : ''}${r.truncated ? ' · output truncated' : ''}`;
  const out = r.stdout ? `\n── stdout ──\n${r.stdout}` : '';
  const err = r.stderr ? `\n── stderr ──\n${r.stderr}` : '';
  return `${head}${out}${err}`;
}

// A tolerant field read: the model may nest an arg under "args" (the
// documented protocol) or emit it flat on the action itself (small local
// models don't always nest perfectly) — accept either rather than nudging a
// correctable mistake into a wasted step.
function field(action, name) {
  if (action && action.args && action.args[name] !== undefined) return action.args[name];
  return action ? action[name] : undefined;
}

// ── the loop itself, deps injected — this is what the tests drive ─────────
async function runLoop(goal, catalog, deps, opts) {
  const o = opts || {};
  const maxSteps = Math.min(Math.max(Number(o.maxSteps) || DEFAULT_MAX_STEPS, 1), MAX_MAX_STEPS);
  const now = deps.now || (() => Date.now());
  const deadline = now() + Math.min(Math.max(Number(o.timeoutMs) || DEFAULT_TIMEOUT_MS, 1_000), DEFAULT_TIMEOUT_MS);
  const system = systemPrompt(catalog, o.persona);
  const convo = [{ role: 'user', content: `GOAL: ${goal}` }];
  const transcript = [`GOAL: ${goal}`];
  let model, steps = 0;

  const finish = (ok, final, stopped) => {
    transcript.push(`FINAL (${stopped}): ${final}`);
    return { ok, final, steps, model, transcript: transcript.join('\n').slice(0, TRANSCRIPT_CAP), stopped };
  };

  while (steps < maxSteps) {
    if (now() > deadline) return finish(false, `stopped: ran out of time after ${steps} step(s).`, 'deadline');
    steps++;

    const r = await deps.infer(system, convo, STEP_MAX_TOKENS);
    if (r && r.model) model = r.model;
    if (!r || !r.ok || !r.content) return finish(false, `local model error: ${(r && r.error) || 'no content'}`, 'error');

    const action = parseAction(r.content);
    convo.push({ role: 'assistant', content: r.content });
    if (!action) {
      convo.push({ role: 'user', content: 'Your last turn was not a single JSON action. Emit exactly one JSON object: {"tool":"<name>","args":{...}} or {"tool":"done","args":{"summary":"..."}}.' });
      transcript.push(`step ${steps}: (no valid action) — nudged`);
      continue;
    }

    if (action.tool === 'done') {
      const summary = field(action, 'summary');
      return finish(true, summary ? String(summary) : 'done (no summary given).', 'done');
    }

    let obs;
    if (action.tool === 'run_shell') {
      const command = String(field(action, 'command') || '');
      obs = formatExec(await deps.execNative({ mode: 'shell', command }));
      transcript.push(`step ${steps}: run_shell ${command.slice(0, 200)}`);
    } else if (action.tool === 'run_code') {
      const code = String(field(action, 'code') || '');
      const language = field(action, 'language') ? String(field(action, 'language')) : 'python';
      obs = formatExec(await deps.execNative({ mode: 'code', code, language }));
      transcript.push(`step ${steps}: run_code[${language}]`);
    } else {
      const args = (action.args && typeof action.args === 'object') ? action.args : {};
      obs = await deps.callTool(action.tool, args);
      transcript.push(`step ${steps}: ${action.tool}(${JSON.stringify(args).slice(0, 150)})`);
    }
    obs = String(obs || '').slice(0, OBS_CAP);
    transcript.push(`  → ${obs.slice(0, 400)}`);
    convo.push({ role: 'user', content: `OBSERVATION:\n${obs}` });
  }

  return finish(false, `stopped: hit the ${maxSteps}-step budget without calling done.`, 'budget');
}

// ── production entry: bind deps to real Ollama / the box / the worker's
//    /api/elle-tool, then run the loop ──────────────────────────────────
async function callWorkerTool(tool, args, cfg, toolCtx) {
  if (!cfg || !cfg.origin || !cfg.key) return `tool "${tool}" failed: no worker connection configured`;
  try {
    const r = await fetch(`${cfg.origin}/api/elle-tool`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-sandbox-key': cfg.key },
      body: JSON.stringify({ tool, args, run_id: toolCtx.runId, session_id: toolCtx.sessionId, source: toolCtx.source }),
      signal: AbortSignal.timeout(TOOL_HTTP_TIMEOUT_MS),
    });
    if (!r.ok) return `tool "${tool}" failed: worker HTTP ${r.status}`;
    const data = await r.json();
    if (!data) return `tool "${tool}" failed: empty response`;
    if (data.result != null) return String(data.result);
    return String(data.error || '(no output)');
  } catch (e) {
    return `tool "${tool}" failed: ${e && e.message ? e.message : String(e)}`;
  }
}

// `cfg` is sandbox-agent's own config() shape ({origin, key, workRoot, ...}).
// `sandboxDeps` is {runExecJob, runLlmJob} handed in by sandbox-agent.cjs
// (rather than require()'d back, which would make the two files circularly
// dependent) so exec and inference reuse the exact fail-closed Docker check,
// output capping, and stripThinking logic a worker-dispatched job already has.
async function runGoalJob(payload, cfg, sandboxDeps) {
  const p = payload || {};
  const goal = String(p.goal || '').trim();
  if (!goal) return { ok: false, error: 'goal required', final: 'goal required', steps: 0, stopped: 'error' };

  const toolCtx = { runId: p.run_id, sessionId: p.session_id, source: p.source };
  const deps = {
    infer: (system, messages, maxTokens) => sandboxDeps.runLlmJob({ system, messages, max_tokens: maxTokens, timeout_ms: INFER_TIMEOUT_MS }),
    execNative: (job) => sandboxDeps.runExecJob(job),
    callTool: (tool, args) => callWorkerTool(tool, args, cfg, toolCtx),
  };

  log(`working goal (max ${p.max_steps || DEFAULT_MAX_STEPS} steps): ${goal.slice(0, 120)}`);
  const res = await runLoop(goal, String(p.catalog || ''), deps, { maxSteps: p.max_steps, timeoutMs: p.timeout_ms, persona: p.persona });
  log(`goal finished: ${res.stopped}, ${res.steps} step(s)`);
  return res;
}

module.exports = {
  parseAction,
  systemPrompt,
  formatExec,
  runLoop,
  runGoalJob,
};
