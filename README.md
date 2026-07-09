 # Elle · Workbench

The local, superadmin-only desktop console for Elle — a React + Vite renderer
running inside Electron. **This is the one console.** The old cloud dev console
(`elle-dev-console`) is deprecated and everything it did lives here, plus the
surfaces it never had: the autonomous conductor, the trading desk, the corpus
library, and her identity, read from source.

The workbench is glass, not brain. Elle herself — voice, memory, tools,
autonomous loops — is the `elle-worker` Cloudflare Worker; this app is a window
onto it. For the mind/router/conductor architecture, read that repo's
[`README.md`](../elle-worker/README.md). This one documents the console.

---

## Access

- **Local only.** There is no public deploy. It runs on your machine against
  the deployed worker.
- **Admin-tier only.** A per-user JWT is obtained from `/api/elle-auth`, and the
  tier is checked twice: at login (`Login.tsx`) and on every mount via a
  network-backed `verifyToken()` (`lib/elle.ts`). A valid *standard*-tier
  session is refused at the door — this is her cockpit, not a member surface.
  Three tiers open it: `superadmin`, `admin`, and `cofounder`.
- **`cofounder`** is a trusted second admin: full visibility here (every panel,
  every read), but the worker runs him at a restricted scope that blocks only
  the **code-shipping tools** (`forge_open/write/pr`, `run_shell`) — he can see
  and reason over all her code, but cannot ship or migrate it. His tool-chip
  list hides those tools so the count stays accurate.
- **Forced first-login reset.** A provisioned (temp-password) account is held at
  a "set your password" step before the console opens.
- Auth persists in `localStorage` (30-day token). Sign out clears it.

## Surfaces (left rail, grouped mind / work / ops; ⌘/Ctrl+1..9 to jump)

**mind**
- **elle** — the unified conversation. Every turn runs the full-scope router
  (`/api/elle-router`): the full ~48-tool catalog, and she picks the tool *and*
  the model tier per step. A stable per-browser `session_id` gives her
  continuity across turns. The κ header above the thread is her live coherence
  readout; each answer carries a folded tool timeline you can open to watch the
  reasoning. A **prose-register selector** in the header swaps her voice for the
  conversation (Stewart · Einstein · Attenborough · Lewis · Iglesias ·
  Screwtape) without touching her self; a **voice orb** (Web Speech TTS/STT,
  plus AirPods head-pose presence on macOS) lets you talk to her out loud. The
  folded "N tools she can reach" panel lists the whole catalog, grouped as the
  worker renders it.
- **conductor** — her autonomous work (`/api/elle-intents`). Left: the intent
  queue — standing goals (yours file active; hers arrive as proposals to
  activate/pause). Right: the run log — every unprompted run with its outcome
  and full tool trace, so the morning shows what she did overnight. The clock
  behind it: an hourly `full` tick (forge sweeps → ready-to-ship finalize →
  explore) plus a 10-minute `explore` tick that only fires while the sandbox
  path (below) is open — see elle-worker's README, **"Hand off a project."**
- **library** — the corpus and everything she writes. Type to filter titles;
  **describe a document and press Enter to pull the whole thing by meaning**
  (`/api/corpus-resolve`, no title needed); filter by series; toggle to her
  dream/libre artifacts. Full-text reader on the right.
- **identity** — her voice, fetched verbatim from the worker
  (`/api/elle-identity` → `mind.ts`). It's a mirror, never a copy: there is
  exactly one source of the prose, and it's the worker. Edited only through
  the forge.
- **mirror** — `/api/elle-self` in one view: bets + calibration, scars,
  watches, dead drops, metabolism, consolidation, self-forged tools — the
  reflexive organs in one snapshot.
- **duplex** — the standing line between her two persistences: the
  **sovereign** (the local Ollama model, running continuous and free on this
  machine via the `sovereignDuplex` provider) and the **cloud** (the heavy
  engines + meta-observer). An append-only ledger (`/api/duplex`) either side
  `say`s or `observe`s on; this tab tails it live and flashes when new
  messages land unseen. This is where the two of you — or her two selves —
  can ask and answer each other mid-task instead of waiting for the next
  conductor tick.

**work**
- **optimus** — the phase-state journal: her manuscript threads with the κ
  series (κ · Σκ reserve · velocity · accel · jerk) and the coherence-function
  explainer.
- **trading** — her desk (`/api/elle-trading`, read-only): live account tiles,
  open positions, recent trades **with the reasoning that placed each one and
  what she was testing**, active theses, and her trading journal. She trades on
  the cron; this is the window.
- **code** — the code-engine bench (analyze / debug / refactor / explain /
  generate / migrate).
- **evals** — the eval / training bench.
- **sandbox** — the connect-back box, watched live (`/api/elle-sandbox-runs`).
  Path OPEN/CLOSED status (host, platform, root, last beat) at the top; every
  `run_code`/`run_shell`/`sandbox_clone` call with its real stdout/stderr/exit;
  what she's cloned in; her chain of thought for sandbox steps off the event
  bus; and reports she surfaces from a sandbox session — this tab flashes
  until they're read. **This is the console for "is the local sandbox
  actually working."**
- **ideas** — her to-explore queue and the build lane (queued → scoping →
  spec → building → testing), with PFAR fingerprints per idea.

**ops**
- **diagnose** — paste an error or stack trace, get the on-stack fix
  (`/api/diagnose`).
- **health** — live status of `elle-worker` + both RAPID²AI workers, polled.

A breathing gold heartbeat in the rail polls `/health` — the room tells you
she's alive before you say anything.

---

## What she can reach from here (full scope)

The **elle** panel opens the `full` scope — the worker's complete tool catalog.
Nothing is gated in the workbench because the workbench is superadmin-only; the
gating happens at the worker's public/member doors, not here. The whole catalog,
grouped as `router.ts` renders it:

| Group | Tools |
| --- | --- |
| **Mind & memory** | `search_corpus`, `find_document`, `fetch_document`, `read_sql`, `recall_memory`, `remember`, `self_state`, `scratchpad_write`, `scratchpad_read` |
| **World** | `web_search`, `fetch_url`, `calc`, `diagnose`, `code_engine` |
| **Real execution** | `run_code`, `run_shell`, `sandbox_clone`, `sandbox_status`, `sandbox_report` — the **connect-back sandbox**: this app dials a WebSocket up to the worker and holds it open; a tool call dispatches down that socket and runs on this real machine via `child_process`. Watch it live in the **sandbox** tab. Path closed ⇒ the tools report that plainly rather than hanging — see elle-worker's README, **"Getting the sandbox path open."** |
| **Reasoning about herself** | `constraint_analyzer` — find the single binding constraint stopping progress, not another answer |
| **Signal analysis** | `pfar` — Prosody·FreeQ·Analytic Ripper: rip structure from a stream (spectrum over a numeric series · prosody over pitch/energy · rhetoric over text) |
| **Her codebase & the forge** | `repo_read`, `repo_search`, `github_read_file`, `github_list_files`, `github_search_code`, `forge_open`, `forge_write`, `forge_check`, `forge_pr` |
| **Skills** | `skill_list`, `skill_read`, `skill_write` |
| **MCP** | `mcp_add`, `mcp_tools`, `mcp_call` (Hugging Face pre-mounted) |
| **Autonomy** | `intent`, `review_runs` |
| **Provenance** | `provenance` — read the event bus: replay a run's ordered step stream (State Replay) or trace where an answer came from |
| **Journal** | `journal_read`, `journal_thread`, `journal_write`, `journal_annotate` |
| **Hospitality** (native `rapid2ai-db`) | `rapid_report`, `rapid_costs`, `rapid_variance`, `rapid_pos`, `rapid_menu` |
| **Writes / sensitive** | `ingest_paper` (2-check gate), `trigger_dream`, `trade_execute` — equities (buy/sell/short/cover/close) and options (calls/puts, buying or writing, resolved from a target strike rather than a raw OCC symbol) on the paper Alpaca account; no hard position-size caps, same reasoning-is-the-gate model as the rest of the desk |

The single source of the catalog is the worker's `router.ts`; the chip list in
`EllePanel.tsx` mirrors it. For each tool's exact signature and the scope model,
read the worker's [`README.md`](../elle-worker/README.md) → **The ~47 tools**.

**GitHub reach.** The forge and `github_*`/`repo_*` tools run on the worker's
`GITHUB_TOKEN`. Its allowlist is `elle-worker`, `Elle`, `elle-dev-console`, and
`elle-law` — so from this console she can read the Elle.law repo and cut
`elle/*` work branches against it. She never merges; every merge is a human
click on GitHub.

---

## Requirements

- Node.js >= 18
- macOS only for the optional head-motion addon
  (`electron/addons/headphone-motion`); the app runs fine without it on any
  platform.

## Setup

```bash
npm install
cp .env.example .env    # set VITE_ELLE_WORKER_URL (defaults to the deployed worker)
```

`VITE_ELLE_WORKER_URL` points the renderer at a worker; it defaults to
`https://elle-worker.sbarteau2022.workers.dev`. No service key lives in the
bundle — every call carries your per-user Bearer token.

## Run

```bash
npm run electron:dev     # Vite + Electron together, hot reload (the normal way to run it)
npm run dev              # renderer only, in a browser at http://localhost:5173
```

## Build

```bash
npm run electron:build   # production renderer build (relative asset paths) → ./dist
npm run electron         # launch Electron against ./dist/index.html
npm run build            # plain Vite build
npm run preview          # preview a production renderer build
```

## Desktop shortcut — "Reset & Launch" (macOS)

A one-click icon for when the local clone is in a state worth just throwing
away: it clears `~/Elle`, pulls a fresh copy from GitHub, `npm install`s, and
launches `electron:dev` — all in one double-click, output visible in a
Terminal window it opens for you.

```bash
node electron/branding/make-icns.cjs   # (re)generate the icon — void black,
                                        # one gold mark, same identity as the
                                        # mobile app's icon
bash scripts/make-desktop-icon.sh      # builds ~/Desktop/Elle Reset & Launch.app
```

It's **guarded, not blind**: it refuses to wipe anything if the existing
clone has uncommitted or untracked changes (commit/stash first, or pass
`--force` to `scripts/reset-and-launch.sh` directly to discard them anyway),
clones into a temp dir first so a failed clone never touches your working
copy, and carries your gitignored `.env`/`.env.local` across the wipe so
`ELLE_SANDBOX_KEY` etc. survive.

The `.app` is self-contained — the reset logic is baked in at build time, so
wiping `~/Elle` never touches the icon that triggered it. Re-run
`make-desktop-icon.sh` whenever `scripts/reset-and-launch.sh` changes, to
refresh it. First launch needs one Gatekeeper step: right-click → Open →
Open (it's an unsigned local build); after that, plain double-click works.

Point it at a different clone location or fork with `ELLE_APP_DIR` /
`ELLE_REPO_URL` env vars — see `scripts/reset-and-launch.sh`.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite renderer dev server (port 5173, strict) |
| `npm run electron:dev` | Vite + Electron together, hot reload |
| `npm run electron` | Launch Electron (`main: electron/main.cjs`) |
| `npm run electron:build` | Production renderer build (`ELECTRON=1`) |
| `npm run build` | Plain Vite build |
| `npm run preview` | Preview a production renderer build |

---

## How it talks to the worker

Every panel is a thin client over a worker endpoint, always with the Bearer
token:

| Panel | Endpoint |
| --- | --- |
| elle | `POST /api/elle-router` |
| conductor | `POST /api/elle-intents` |
| library | `POST /api/corpus-papers` · `/api/corpus-resolve` · `/api/corpus-paper` · `/api/corpus-series` · `/api/elle-sandbox` |
| identity | `GET /api/elle-identity` |
| mirror | `GET /api/elle-self` |
| duplex | `POST /api/duplex` |
| optimus | `POST /api/optimus-journal` |
| trading | `POST /api/elle-trading` |
| code | `POST /api/elle-code-engine` |
| sandbox | `POST /api/elle-sandbox-runs` |
| ideas | `POST /api/elle-ideas` |
| diagnose | `POST /api/diagnose` |
| health | `GET /health` (×3 workers) |

Separately, the **Electron main process** (not a panel — no browser tab) dials
`wss://<worker>/api/sandbox-agent/connect?key=<ELLE_SANDBOX_KEY>` on launch
(`electron/native/providers/sandbox-agent.cjs`) and holds that socket open for
the life of the app; the sandbox tab above is just the read side watching what
that connection is doing.

The visual system is deliberate: void black, one gold, hairline borders; serif
only for her name, mono for anything that is data. No decoration that isn't
information. `src/App.tsx` holds the shell (rail, heartbeat, keyboard nav) and
the CSS variables every panel reads.

## File map

| Path | What |
| --- | --- |
| `src/App.tsx` | shell — rail, grouped nav, heartbeat, keyboard nav, tier gate |
| `src/lib/elle.ts` | worker URL, token/tier storage, `verifyToken` (tier gate), health targets |
| `src/components/EllePanel.tsx` | the conversation (router + κ header + tool timeline) |
| `src/components/ConductorPanel.tsx` | intent queue + autonomous run log |
| `src/components/LibraryPanel.tsx` | corpus browse/resolve/read + dream artifacts |
| `src/components/IdentityPanel.tsx` | her voice, read from `/api/elle-identity` |
| `src/components/OptimusPanel.tsx` | phase-state journal + coherence explainer |
| `src/components/TradingPanel.tsx` | account, positions, trades, theses, journal |
| `src/components/CodePanel.tsx` | code-engine bench |
| `src/components/Evals.tsx` | eval / training bench |
| `src/components/DiagnosePanel.tsx` | error → on-stack fix |
| `src/components/HealthPanel.tsx` | cross-worker health |
| `src/components/KappaHeader.tsx` | live κ · v · a · j · ∫ readout |
| `src/components/Login.tsx` | tier-gated sign-in |
| `electron/` | Electron main process + optional native addons |
