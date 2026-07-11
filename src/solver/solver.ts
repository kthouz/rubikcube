/**
 * The public solver: turns a validated {@link CubeState} into a typed
 * {@link Move}[] the tutorial UI can render and animate.
 *
 * By default the actual Kociemba work runs in a web worker (see
 * {@link WorkerBackend}), so building the two-phase tables and solving never
 * block the UI thread.
 */
import type { CubeState } from '../cube/index.js';
import { createDefaultBackend, type SolverBackend } from './backend.js';
import { parseAlgorithm } from './moves.js';
import type { Move } from './types.js';

/** Options for a single {@link Solver.solve} call. */
export interface SolveOptions {
  /** Abort the solve early (e.g. the user left the screen). */
  readonly signal?: AbortSignal;
}

/**
 * A reusable solver bound to one backend. Create once and share it: the first
 * solve builds the (expensive) solver tables, and every solve after reuses
 * them.
 *
 * ```ts
 * const solver = new Solver();
 * solver.warmUp();                 // optional: build tables during idle time
 * const moves = await solver.solve(cubeState);
 * // ...later, on teardown:
 * solver.dispose();
 * ```
 */
export class Solver {
  readonly #backend: SolverBackend;

  /**
   * @param backend override the transport (defaults to a web worker when
   *   available, else an in-process fallback). Mainly a testing seam.
   */
  constructor(backend: SolverBackend = createDefaultBackend()) {
    this.#backend = backend;
  }

  /**
   * Build the solver tables ahead of time so the first {@link solve} returns
   * quickly. Optional — {@link solve} triggers the build on demand otherwise.
   */
  warmUp(): Promise<void> {
    return this.#backend.warmUp();
  }

  /**
   * Solve a cube and return the moves that take it to solved.
   *
   * An already-solved cube resolves to `[]` without touching the engine.
   *
   * @throws {import('./types.js').SolverError} on solve failure or abort.
   */
  async solve(cube: CubeState, options: SolveOptions = {}): Promise<Move[]> {
    if (cube.isSolved) return [];
    const algorithm = await this.#backend.solve(cube.faceletString, options.signal);
    return parseAlgorithm(algorithm);
  }

  /** Tear down the backend (terminates the worker). */
  dispose(): void {
    this.#backend.dispose();
  }
}

let sharedSolver: Solver | null = null;

/**
 * The process-wide default {@link Solver}, created lazily. Most callers use the
 * convenience {@link solve} / {@link warmUpSolver} below rather than this
 * directly.
 */
export function getDefaultSolver(): Solver {
  return (sharedSolver ??= new Solver());
}

/**
 * Solve a validated cube using the shared default solver.
 *
 * This is the clean, one-call async API:
 * ```ts
 * import { solve } from './solver';
 * const moves = await solve(cubeState); // Move[]
 * ```
 */
export function solve(cube: CubeState, options?: SolveOptions): Promise<Move[]> {
  return getDefaultSolver().solve(cube, options);
}

/**
 * Warm up the shared default solver — ideal to call once at app start (or when
 * scanning begins) so the tables are ready before the user finishes.
 */
export function warmUpSolver(): Promise<void> {
  return getDefaultSolver().warmUp();
}

/** Dispose the shared default solver, if one was created. */
export function disposeDefaultSolver(): void {
  sharedSolver?.dispose();
  sharedSolver = null;
}
