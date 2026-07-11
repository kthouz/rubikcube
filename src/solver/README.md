# Solver

Turns a validated **cube state** into a short **solution** the tutorial UI can
render and animate.

```
CubeState ──▶ faceletString ──▶ [ web worker: Kociemba two-phase ] ──▶ Move[]
(validated)   (URFDLB, 54)       cubejs, ~20 moves                   (typed)
```

Built on [`cubejs`](https://github.com/ldez/cubejs), a two-phase Kociemba
solver, so solutions are near-optimal (~20 moves). The heavy table build and the
solve run **in a web worker**, so the UI thread never freezes.

## Usage

```ts
import { CubeState } from '../cube';
import { solve, warmUpSolver } from '../solver';

// Optional: build the solver tables early (e.g. when scanning starts) so the
// first solve returns instantly. Runs in the worker; safe to fire-and-forget.
warmUpSolver();

const state = CubeState.fromStickerColors(stickers); // validated, solvable
const moves = await solve(state);                    // Promise<Move[]>
```

`solve` is the clean one-call API. An **already-solved** cube resolves to `[]`
without touching the engine.

### Managing lifecycle explicitly

`solve` / `warmUpSolver` use a shared default `Solver`. For finer control
(multiple solvers, deterministic teardown) construct your own:

```ts
import { Solver } from '../solver';

const solver = new Solver();
await solver.warmUp();
const moves = await solver.solve(state, { signal });  // AbortSignal supported
solver.dispose();                                     // terminates the worker
```

## The `Move` structure

Each move is a typed, render-ready record — no notation parsing needed in the UI:

```ts
interface Move {
  face: 'U' | 'R' | 'F' | 'D' | 'L' | 'B'; // which layer turns
  direction: 'cw' | 'ccw';                 // as seen looking at that face
  double: boolean;                         // true for a 180° half turn
  notation: string;                        // "R", "U'", "F2"
  quarterTurns: 1 | -1 | 2;                // signed CW quarter turns, for animation
}
```

A half turn (`double: true`) is normalized to `direction: 'cw'` and
`quarterTurns: 2` (the two senses are physically identical).

`parseAlgorithm("R U' F2")` and `algorithmToNotation(moves)` convert to/from
notation strings if you need them (e.g. rendering a hand-typed algorithm).

## Off the main thread

`solve` picks a backend automatically:

| Backend | When | Table build |
|---------|------|-------------|
| `WorkerBackend` | `Worker` is available (browsers) | in the worker — UI stays responsive |
| `InlineBackend` | no `Worker` (Node, SSR, tests) | on the calling thread (**blocks**) |

The worker is created lazily on first use and reused across solves; concurrent
requests are correlated by id. Bundlers (Vite, webpack 5) detect the
`new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })`
reference in `backend.ts` and emit the worker as a separate chunk.

To force a backend (e.g. a custom worker factory), pass one to `new Solver(...)`.

## Files

- `types.ts` — `Move`, `MoveFace`, `TurnDirection`, `SolverError`.
- `moves.ts` — notation ⇄ `Move[]` parsing/serialization (pure).
- `engine.ts` — `cubejs` wrapper (`initEngine`, `solveFacelets`); runs in worker or inline.
- `messages.ts` — worker request/response protocol.
- `worker.ts` — web worker entry point.
- `backend.ts` — `SolverBackend` interface, `WorkerBackend`, `InlineBackend`.
- `solver.ts` — `Solver` class and the `solve` / `warmUpSolver` convenience API.
- `index.ts` — public surface (import from here).
- `cubejs.d.ts` — ambient types for the untyped `cubejs` dependency.
