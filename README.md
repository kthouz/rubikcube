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
  components/   Reusable UI (AppShell, NavBar, CameraView, FaceColorGrid, …)
  views/        Route-level screens (Landing, Scan, Review, Solve, Tutorial, NotFound)
  hooks/        React hooks (useCamera)
  lib/          Non-UI logic (capture, color, colorDetect; scanner/solver — placeholders)
  state/        App state & cube domain model (CubeState, AppStateContext)
  App.tsx       Route definitions
  main.tsx      App entry point (router + state provider)
  index.css     Global styles & responsive app shell
```

## Planned views

- **Scan** — capture each cube face via the camera.
- **Review** — inspect the detected sticker colors as an editable 3×3 grid per
  face, with per-sticker confidence, and correct any misclassification.
- **Solve** — compute a solution and step through it on an interactive 3D cube.
- **Tutorial** — learn notation and the beginner's layer-by-layer method.

## Sticker color detection

`src/lib/colorDetect.ts` turns the raw sampled sticker RGB from the camera step
into one of the six cube colors per sticker, plus a 54-sticker color array
(`stickerColors` on the app state).

Rather than hard-coded RGB thresholds — which break the moment the camera's
white-balance or the room's lighting shifts — it classifies each sticker
_relative to the capture itself_:

1. The six center stickers are, by construction, the six colors (one of each).
   They give six clean reference swatches taken under the same lighting we're
   classifying against.
2. Those centers are labeled by a global bijective assignment (each color used
   once), so labeling depends on the colors' relative ordering around the hue
   wheel, not absolute hues a white-balance shift would move.
3. Every sticker is then matched to the nearest labeled reference by perceptual
   CIELAB ΔE. Confidence comes from the margin to the runner-up, so ambiguous
   stickers (classically red vs. orange) surface as low-confidence for review.

## Roadmap / next steps

The following are intentionally stubbed and throw if called:

- `src/lib/solver.ts` — `solve()` (cubejs integration)

The `Solve` view consumes the 54-sticker color array from the app state.
