# Elle · Workbench

Local superadmin desktop workbench for Elle — a React + Vite renderer running
inside Electron. Direct access to the unified router surface, the Optimus
phase-state journal, the code engine, and the eval/training bench. Local only,
no public deploy; per-user JWT against `elle-worker`.

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
