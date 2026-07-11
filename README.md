# Cube Coach

A browser web app for **scanning a Rubik's cube with your camera, solving it, and learning how** through guided tutorials.

This repository currently contains the **project skeleton** — a working app shell with navigation between the three planned views. The scanning, solving, and tutorial features are stubbed out and not yet implemented.

## Tech stack

- [Vite](https://vite.dev/) — dev server & build tool
- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [React Router](https://reactrouter.com/) — client-side routing
- [three.js](https://threejs.org/) — 3D cube rendering _(declared; not yet wired up)_
- [cubejs](https://github.com/ldez/cubejs) — Rubik's cube solver _(declared; not yet wired up)_
- ESLint + Prettier — linting & formatting

## Getting started

Requires Node.js 18+ (developed on Node 20+).

```bash
npm install
npm run dev
```

This serves the app at http://localhost:5173 (it opens automatically). You should see the landing screen with working navigation to the Scan, Solve, and Tutorial views.

## Available scripts

| Script                 | Description                                  |
| ---------------------- | -------------------------------------------- |
| `npm run dev`          | Start the Vite dev server with HMR.          |
| `npm run build`        | Type-check and build for production.         |
| `npm run preview`      | Preview the production build locally.        |
| `npm run lint`         | Run ESLint over the project.                 |
| `npm run format`       | Format `src/` with Prettier.                 |
| `npm run format:check` | Check formatting without writing changes.    |

## Project structure

```
src/
  components/   Reusable UI (AppShell, NavBar, PlaceholderView)
  views/        Route-level screens (Landing, Scan, Solve, Tutorial, NotFound)
  lib/          Non-UI logic adapters (scanner, solver) — placeholders
  state/        App state & cube domain model (CubeState, AppStateContext)
  App.tsx       Route definitions
  main.tsx      App entry point (router + state provider)
  index.css     Global styles & responsive app shell
```

## Planned views

- **Scan** — capture each cube face via the camera and detect sticker colors.
- **Solve** — compute a solution and step through it on an interactive 3D cube.
- **Tutorial** — learn notation and the beginner's layer-by-layer method.

## Roadmap / next steps

The following are intentionally stubbed and throw if called:

- `src/lib/scanner.ts` — `detectFace()` (camera color detection)
- `src/lib/solver.ts` — `solve()` (cubejs integration)

Wire these up alongside their respective views to bring the skeleton to life.
