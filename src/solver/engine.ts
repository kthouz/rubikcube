/**
 * Thin, transport-agnostic wrapper around the `cubejs` two-phase Kociemba
 * solver. This is the actual solving core; it is deliberately free of any
 * worker or DOM concerns so it can run either inside a web worker (the normal
 * case) or directly on the calling thread (tests, SSR, environments without
 * `Worker`).
 *
 * The heavy work is {@link initEngine}, which builds the two-phase pruning
 * tables. It is synchronous and blocking — which is exactly why production code
 * runs it off the main thread (see `worker.ts` / `WorkerBackend`).
 */
import Cube from 'cubejs';
import { SolverError } from './types.js';

let initialized = false;

/**
 * Build the two-phase solver tables. Expensive but idempotent — safe to call
 * before every {@link solveFacelets}; only the first call does work.
 */
export function initEngine(): void {
  if (initialized) return;
  Cube.initSolver();
  initialized = true;
}

/** Whether {@link initEngine} has already built the tables on this thread. */
export function isEngineReady(): boolean {
  return initialized;
}

/**
 * Solve a validated facelet string and return the raw solution as a Singmaster
 * notation string (e.g. `"R U2 F' ..."`). Initializes the engine on first use.
 *
 * @param facelets a valid 54-char URFDLB facelet string (as produced by
 *   `CubeState.faceletString`).
 * @throws {SolverError} if the engine cannot solve the input.
 */
export function solveFacelets(facelets: string): string {
  initEngine();
  let solution: string;
  try {
    solution = Cube.fromString(facelets).solve();
  } catch (cause) {
    throw new SolverError(
      `Kociemba engine failed to solve facelets "${facelets}".`,
      { cause },
    );
  }
  if (typeof solution !== 'string') {
    throw new SolverError(
      `Kociemba engine returned no solution for facelets "${facelets}".`,
    );
  }
  return solution.trim();
}
