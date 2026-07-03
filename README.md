# Elle · Workbench

Local superadmin desktop workbench for Elle — a React + Vite renderer running
inside Electron. This is **the** console: the cloud dev console is deprecated,
and everything it did lives here. Local only, no public deploy; per-user JWT
against `elle-worker`, and **gated to admin/superadmin tier** at both login
and session-verify (a valid standard-tier session is refused at the door).

The workbench is a window onto the `elle-worker` backend — see that repo's
README for the full mind/router/conductor architecture. This one is the glass.

## Surfaces (left rail, grouped)

**mind**
- **elle** — the unified conversation. Every turn runs the full-scope router
  (~35 tools; she picks tool *and* model per step). The κ header above the
  thread is her live coherence readout; each answer shows its folded tool
  timeline.
- **conductor** — her autonomous work. Left: the intent queue (standing goals
  the clock runs — yours file active, hers arrive as proposals to activate).
  Right: the run log — every unprompted run with outcome + full trace, so the
  morning shows what she did overnight.
- **library** — the corpus and everything she writes. Describe a document and
  press Enter to pull the whole thing by meaning (no title needed); filter by
  series; toggle to her dream/libre artifacts.

**work**
- **optimus** — the phase-state journal (κ · reserve · velocity · accel).
- **trading** — her desk: live account, positions, recent trades *with her
  reasoning*, active theses, and her trading journal (read-only; she trades
  on the cron).
- **code** — the code engine bench.
- **evals** — the eval/training bench.

**ops**
- **diagnose** — paste an error, get the on-stack fix.
- **health** — live status of `elle-worker` + both RAPID²AI workers.

A breathing gold heartbeat dot in the rail polls `/health` — the room tells
you she's alive before you say anything.

## Requirements

- Node.js >= 18
- macOS for the optional head-motion addon (`electron/addons/headphone-motion`);
  the app runs fine without it on any platform.

## Setup

```bash
npm install
cp .env.example .env   # set VITE_ELLE_WORKER_URL / VITE_ELLE_SERVICE_KEY
```

## Run the desktop app (dev)

Starts the Vite dev server and launches Electron against it with hot reload:

```bash
npm run electron:dev
```

Electron loads `http://localhost:5173`; `electron/main.cjs` opens detached
DevTools in dev.

## Renderer-only (browser) dev

```bash
npm run dev      # http://localhost:5173
```

## Production build

```bash
npm run electron:build   # builds the renderer to ./dist with relative asset paths
npm run electron         # launches Electron against ./dist/index.html
```

## Scripts

| Script                 | Purpose                                           |
| ---------------------- | ------------------------------------------------- |
| `npm run dev`          | Vite renderer dev server (port 5173, strict)      |
| `npm run electron:dev` | Vite + Electron together, hot reload              |
| `npm run electron`     | Launch Electron (`main: electron/main.cjs`)       |
| `npm run electron:build` | Production renderer build (`ELECTRON=1`)        |
| `npm run build`        | Plain Vite build                                  |
| `npm run preview`      | Preview a production renderer build               |
