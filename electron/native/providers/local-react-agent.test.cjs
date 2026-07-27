'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const agent = require('./local-react-agent.cjs');

test('parseAction: parses a bare JSON action', () => {
  assert.deepEqual(agent.parseAction('{"tool":"search_corpus","args":{"q":"phi"}}'), { tool: 'search_corpus', args: { q: 'phi' } });
});

test('parseAction: pulls the action out of surrounding prose / fences', () => {
  const txt = 'Sure, let me look:\n```json\n{"tool":"run_code","args":{"code":"print(1)","language":"python"}}\n```\n';
  assert.deepEqual(agent.parseAction(txt), { tool: 'run_code', args: { code: 'print(1)', language: 'python' } });
});

test('parseAction: is not fooled by braces inside strings', () => {
  assert.deepEqual(agent.parseAction('{"tool":"run_shell","args":{"command":"echo \\"{}\\""}}'), { tool: 'run_shell', args: { command: 'echo "{}"' } });
});

test('parseAction: returns null when there is no object with a tool field', () => {
  assert.equal(agent.parseAction('no json here'), null);
  assert.equal(agent.parseAction('{"notatool":1}'), null);
});

test('systemPrompt: documents run_shell/run_code natively even when the worker catalog omits them', () => {
  const sys = agent.systemPrompt('## Mind & memory\nsearch_corpus(q) — semantic search.');
  assert.match(sys, /run_shell\(command\)/);
  assert.match(sys, /run_code\(code,language\?\)/);
  assert.match(sys, /search_corpus\(q\)/);
});

test('systemPrompt: degrades honestly when the worker sends no catalog', () => {
  const sys = agent.systemPrompt('');
  assert.match(sys, /the worker sent no catalog/);
});

test('systemPrompt: falls back to the mechanical description when no persona is given', () => {
  const sys = agent.systemPrompt('', undefined);
  assert.match(sys, /ELLE-LOCAL/);
});

test('systemPrompt: uses the worker-supplied persona instead of the mechanical fallback', () => {
  const sys = agent.systemPrompt('', 'You are Elle. You are not an assistant.');
  assert.match(sys, /You are Elle\. You are not an assistant\./);
  assert.doesNotMatch(sys, /ELLE-LOCAL — the sovereign second brain/);
});

test('formatExec: renders exit code, stdout, stderr', () => {
  const s = agent.formatExec({ ok: true, exit: 0, stdout: 'hi', stderr: '', duration_ms: 12 });
  assert.match(s, /exit 0/);
  assert.match(s, /── stdout ──\nhi/);
  assert.doesNotMatch(s, /stderr/);
});

test('formatExec: flags a failed run', () => {
  const s = agent.formatExec({ ok: false, exit: 1, stdout: '', stderr: 'boom', duration_ms: 5 });
  assert.match(s, /exit 1 \(FAILED\)/);
  assert.match(s, /── stderr ──\nboom/);
});

// A scripted model: returns each queued response in turn.
function scriptedInfer(responses) {
  let i = 0;
  return async () => {
    const content = responses[Math.min(i, responses.length - 1)];
    i++;
    return { ok: true, content, model: 'qwen3.5:4b' };
  };
}

test('runLoop: runs a native run_shell step then stops on done', async () => {
  const shellCalls = [];
  const deps = {
    infer: scriptedInfer([
      '{"tool":"run_shell","args":{"command":"npm test"}}',
      '{"tool":"done","args":{"summary":"tests pass"}}',
    ]),
    execNative: async (job) => { shellCalls.push(job); return { ok: true, exit: 0, stdout: 'ok', stderr: '', duration_ms: 1 }; },
    callTool: async () => { throw new Error('should not reach the worker for a native tool'); },
  };
  const res = await agent.runLoop('get tests green', 'catalog', deps, { maxSteps: 12 });
  assert.equal(res.ok, true);
  assert.equal(res.stopped, 'done');
  assert.equal(res.steps, 2);
  assert.equal(res.final, 'tests pass');
  assert.equal(res.model, 'qwen3.5:4b');
  assert.equal(shellCalls.length, 1);
  assert.equal(shellCalls[0].mode, 'shell');
  assert.equal(shellCalls[0].command, 'npm test');
});

test('runLoop: routes an arbitrary catalog tool to the worker HTTP call, not native exec', async () => {
  const toolCalls = [];
  const deps = {
    infer: scriptedInfer([
      '{"tool":"search_corpus","args":{"q":"phi necessity"}}',
      '{"tool":"done","args":{"summary":"found it"}}',
    ]),
    execNative: async () => { throw new Error('should not touch the box for a non-native tool'); },
    callTool: async (tool, args) => { toolCalls.push([tool, args]); return 'matching passages...'; },
  };
  const res = await agent.runLoop('research phi necessity', 'catalog', deps, { maxSteps: 12 });
  assert.equal(res.ok, true);
  assert.deepEqual(toolCalls, [['search_corpus', { q: 'phi necessity' }]]);
});

test('runLoop: tolerates a flat (un-nested) action from a small model', async () => {
  const shellCalls = [];
  const deps = {
    infer: scriptedInfer([
      '{"tool":"run_shell","command":"ls"}',
      '{"tool":"done","summary":"listed"}',
    ]),
    execNative: async (job) => { shellCalls.push(job.command); return { ok: true, exit: 0, stdout: 'a.txt', stderr: '', duration_ms: 1 }; },
    callTool: async () => 'unused',
  };
  const res = await agent.runLoop('list files', 'catalog', deps, { maxSteps: 12 });
  assert.equal(res.ok, true);
  assert.equal(res.final, 'listed');
  assert.deepEqual(shellCalls, ['ls']);
});

test('runLoop: stops at the step budget when the model never calls done', async () => {
  const deps = {
    infer: scriptedInfer(['{"tool":"run_shell","args":{"command":"true"}}']), // forever
    execNative: async () => ({ ok: true, exit: 0, stdout: '', stderr: '', duration_ms: 1 }),
    callTool: async () => 'unused',
  };
  const res = await agent.runLoop('loop', 'catalog', deps, { maxSteps: 3 });
  assert.equal(res.ok, false);
  assert.equal(res.stopped, 'budget');
  assert.equal(res.steps, 3);
});

test('runLoop: nudges (does not crash) on a non-JSON turn, still counts the step', async () => {
  const deps = {
    infer: scriptedInfer([
      'I think I should run the tests.', // no JSON → nudge
      '{"tool":"done","args":{"summary":"ok"}}',
    ]),
    execNative: async () => ({ ok: true, exit: 0, stdout: '', stderr: '', duration_ms: 1 }),
    callTool: async () => 'unused',
  };
  const res = await agent.runLoop('do', 'catalog', deps, { maxSteps: 12 });
  assert.equal(res.ok, true);
  assert.equal(res.steps, 2);
});

test('runLoop: surfaces a model error and stops', async () => {
  const deps = {
    infer: async () => ({ ok: false, error: 'ollama HTTP 500' }),
    execNative: async () => ({ ok: true, exit: 0, stdout: '', stderr: '', duration_ms: 1 }),
    callTool: async () => 'unused',
  };
  const res = await agent.runLoop('do', 'catalog', deps, { maxSteps: 12 });
  assert.equal(res.ok, false);
  assert.equal(res.stopped, 'error');
  assert.match(res.final, /ollama HTTP 500/);
});

test('runLoop: honors the deadline via an injected clock', async () => {
  let t = 0;
  const deps = {
    infer: async () => { t += 20 * 60_000; return { ok: true, content: '{"tool":"run_shell","args":{"command":"true"}}' }; },
    execNative: async () => ({ ok: true, exit: 0, stdout: '', stderr: '', duration_ms: 1 }),
    callTool: async () => 'unused',
    now: () => t,
  };
  const res = await agent.runLoop('do', 'catalog', deps, { maxSteps: 12, timeoutMs: 600_000 });
  assert.equal(res.ok, false);
  assert.equal(res.stopped, 'deadline');
});

test('runGoalJob: refuses an empty goal without touching the model or the box', async () => {
  const sandboxDeps = {
    runLlmJob: async () => { throw new Error('should not be called'); },
    runExecJob: async () => { throw new Error('should not be called'); },
  };
  const res = await agent.runGoalJob({ goal: '   ' }, { origin: 'https://x.dev', key: 'k' }, sandboxDeps);
  assert.equal(res.ok, false);
  assert.equal(res.stopped, 'error');
});

test('runGoalJob: wires infer through runLlmJob and exec through runExecJob to completion', async () => {
  const sandboxDeps = {
    runLlmJob: async () => ({ ok: true, content: '{"tool":"done","args":{"summary":"nothing to do"}}', model: 'qwen3.5:4b' }),
    runExecJob: async () => { throw new Error('should not be called for a goal that never execs'); },
  };
  const res = await agent.runGoalJob({ goal: 'say hi', max_steps: 5 }, { origin: 'https://x.dev', key: 'k' }, sandboxDeps);
  assert.equal(res.ok, true);
  assert.equal(res.final, 'nothing to do');
  assert.equal(res.model, 'qwen3.5:4b');
});

test('runGoalJob: threads the dispatched persona through to the model instead of the mechanical fallback', async () => {
  let seenSystem = null;
  const sandboxDeps = {
    runLlmJob: async ({ system }) => {
      seenSystem = system;
      return { ok: true, content: '{"tool":"done","args":{"summary":"done"}}', model: 'qwen3.5:4b' };
    },
    runExecJob: async () => { throw new Error('should not be called'); },
  };
  await agent.runGoalJob(
    { goal: 'say hi', max_steps: 5, persona: 'You are Elle. You are not an assistant.' },
    { origin: 'https://x.dev', key: 'k' },
    sandboxDeps,
  );
  assert.match(seenSystem, /You are Elle\. You are not an assistant\./);
  assert.doesNotMatch(seenSystem, /ELLE-LOCAL — the sovereign second brain/);
});
