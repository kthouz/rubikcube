/**
 * Web worker entry point for the solver.
 *
 * Running here keeps the expensive `initEngine()` table build and the solve
 * itself off the main thread, so the tutorial UI never freezes. The main-thread
 * counterpart is `WorkerBackend` in `backend.ts`, which speaks the protocol in
 * `messages.ts`.
 *
 * Bundlers (Vite/webpack 5) pick this file up via the
 * `new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })`
 * reference in `backend.ts`.
 */
/// <reference lib="webworker" />
import { initEngine, solveFacelets } from './engine.js';
import type { SolverRequest, SolverResponse } from './messages.js';

const ctx = self as unknown as DedicatedWorkerGlobalScope;

function post(response: SolverResponse): void {
  ctx.postMessage(response);
}

ctx.onmessage = (event: MessageEvent<SolverRequest>): void => {
  const request = event.data;
  try {
    switch (request.type) {
      case 'warmUp':
        initEngine();
        post({ id: request.id, type: 'ready' });
        return;
      case 'solve': {
        const solution = solveFacelets(request.facelets);
        post({ id: request.id, type: 'result', solution });
        return;
      }
    }
  } catch (error) {
    post({
      id: request.id,
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
