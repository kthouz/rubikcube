/**
 * The message protocol spoken between the main thread ({@link WorkerBackend})
 * and the solver web worker (`worker.ts`). Every request carries an `id` that
 * the matching response echoes, so concurrent solves can be correlated.
 */

/** Ask the worker to build the (expensive) solver tables ahead of time. */
export interface WarmUpRequest {
  readonly id: number;
  readonly type: 'warmUp';
}

/** Ask the worker to solve a validated URFDLB facelet string. */
export interface SolveRequest {
  readonly id: number;
  readonly type: 'solve';
  readonly facelets: string;
}

/** Anything the main thread sends into the worker. */
export type SolverRequest = WarmUpRequest | SolveRequest;

/** The worker finished building its tables (reply to {@link WarmUpRequest}). */
export interface ReadyResponse {
  readonly id: number;
  readonly type: 'ready';
}

/** A successful solve: the raw Singmaster algorithm string. */
export interface SolveResultResponse {
  readonly id: number;
  readonly type: 'result';
  readonly solution: string;
}

/** A failed request, with a human-readable reason. */
export interface ErrorResponse {
  readonly id: number;
  readonly type: 'error';
  readonly message: string;
}

/** Anything the worker sends back to the main thread. */
export type SolverResponse = ReadyResponse | SolveResultResponse | ErrorResponse;
