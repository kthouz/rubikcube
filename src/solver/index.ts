/**
 * Public surface of the solver module. Downstream code (the tutorial UI) should
 * import from here.
 *
 * @example
 * ```ts
 * import { CubeState } from '../cube';
 * import { solve, warmUpSolver } from '../solver';
 *
 * warmUpSolver();                          // build tables in the worker, early
 * const state = CubeState.fromStickerColors(stickers);
 * const moves = await solve(state);        // Move[] — animate these
 * ```
 */
export {
  Solver,
  solve,
  warmUpSolver,
  getDefaultSolver,
  disposeDefaultSolver,
  type SolveOptions,
} from './solver.js';

export {
  parseMove,
  parseAlgorithm,
  moveToNotation,
  algorithmToNotation,
  isMoveToken,
} from './moves.js';

export {
  SolverError,
  MOVE_FACES,
  type Move,
  type MoveFace,
  type TurnDirection,
  type Solution,
} from './types.js';

export {
  InlineBackend,
  WorkerBackend,
  createDefaultBackend,
  defaultWorkerFactory,
  type SolverBackend,
  type WorkerFactory,
} from './backend.js';

export type {
  SolverRequest,
  SolverResponse,
  SolveRequest,
  WarmUpRequest,
  ReadyResponse,
  SolveResultResponse,
  ErrorResponse,
} from './messages.js';
