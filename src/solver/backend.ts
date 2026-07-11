/**
 * Solver backends: the transport that turns a facelet string into a raw
 * solution string. Two implementations share one interface so the rest of the
 * module never cares where the work happens.
 *
 * - {@link WorkerBackend} — the default in a browser. Runs the engine in a web
 *   worker so the expensive table build and solve never block the UI thread.
 * - {@link InlineBackend} — a fallback for environments without `Worker`
 *   (Node/tests/SSR). Runs on the calling thread; the table build **blocks**.
 */
import { initEngine, solveFacelets } from './engine.js';
import { SolverError } from './types.js';
import type { SolverRequest, SolverResponse } from './messages.js';

/** Where a {@link Solver} sends facelets to be solved. */
export interface SolverBackend {
  /**
   * Build the solver tables ahead of a solve, so the first {@link solve} is
   * fast. Optional to call — {@link solve} works without it.
   */
  warmUp(): Promise<void>;
  /**
   * Solve a validated URFDLB facelet string, resolving to a raw Singmaster
   * algorithm string. Rejects with {@link SolverError} on failure or abort.
   */
  solve(facelets: string, signal?: AbortSignal): Promise<string>;
  /** Release any held resources (e.g. terminate the worker). */
  dispose(): void;
}

function abortError(): SolverError {
  return new SolverError('Solve was aborted.');
}

/**
 * Runs the Kociemba engine on the current thread. Correct everywhere, but the
 * table build in {@link initEngine} blocks — so this is a fallback, not the
 * browser default.
 */
export class InlineBackend implements SolverBackend {
  async warmUp(): Promise<void> {
    initEngine();
  }

  async solve(facelets: string, signal?: AbortSignal): Promise<string> {
    if (signal?.aborted) throw abortError();
    return solveFacelets(facelets);
  }

  dispose(): void {
    /* nothing to release */
  }
}

/** Creates the {@link Worker} a {@link WorkerBackend} drives. */
export type WorkerFactory = () => Worker;

/**
 * The standard bundler-recognized way to spawn the solver worker as an ES
 * module. Vite/webpack 5 statically detect this exact form and emit a separate
 * worker chunk.
 */
export const defaultWorkerFactory: WorkerFactory = () =>
  new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });

interface Pending {
  readonly resolve: (solution: string) => void;
  readonly reject: (error: unknown) => void;
  readonly onAbort?: () => void;
}

/**
 * Drives the solver web worker from the main thread. The worker is created
 * lazily on first use and reused across solves; concurrent requests are
 * correlated by an incrementing id.
 */
export class WorkerBackend implements SolverBackend {
  #worker: Worker | null = null;
  #nextId = 1;
  readonly #pending = new Map<number, Pending>();
  readonly #factory: WorkerFactory;

  constructor(factory: WorkerFactory = defaultWorkerFactory) {
    this.#factory = factory;
  }

  #ensureWorker(): Worker {
    if (this.#worker) return this.#worker;
    const worker = this.#factory();
    worker.onmessage = (event: MessageEvent<SolverResponse>) => this.#onMessage(event.data);
    worker.onerror = (event: ErrorEvent) =>
      this.#failAll(new SolverError(event.message || 'Solver worker crashed.'));
    this.#worker = worker;
    return worker;
  }

  #onMessage(response: SolverResponse): void {
    const pending = this.#pending.get(response.id);
    if (!pending) return; // already settled (e.g. aborted) — ignore
    this.#pending.delete(response.id);
    switch (response.type) {
      case 'ready':
      case 'result':
        pending.resolve(response.type === 'result' ? response.solution : '');
        return;
      case 'error':
        pending.reject(new SolverError(response.message));
        return;
    }
  }

  #failAll(error: SolverError): void {
    for (const pending of this.#pending.values()) pending.reject(error);
    this.#pending.clear();
  }

  #request(request: SolverRequest, signal?: AbortSignal): Promise<string> {
    if (signal?.aborted) return Promise.reject(abortError());
    const worker = this.#ensureWorker();
    return new Promise<string>((resolve, reject) => {
      const onAbort = signal
        ? () => {
            // Drop the pending entry; the worker's eventual reply is ignored.
            this.#pending.delete(request.id);
            reject(abortError());
          }
        : undefined;
      if (signal && onAbort) signal.addEventListener('abort', onAbort, { once: true });
      this.#pending.set(request.id, {
        resolve: (solution) => {
          if (signal && onAbort) signal.removeEventListener('abort', onAbort);
          resolve(solution);
        },
        reject: (err) => {
          if (signal && onAbort) signal.removeEventListener('abort', onAbort);
          reject(err);
        },
      });
      worker.postMessage(request);
    });
  }

  warmUp(): Promise<void> {
    return this.#request({ id: this.#nextId++, type: 'warmUp' }).then(() => undefined);
  }

  solve(facelets: string, signal?: AbortSignal): Promise<string> {
    return this.#request({ id: this.#nextId++, type: 'solve', facelets }, signal);
  }

  dispose(): void {
    this.#failAll(new SolverError('Solver was disposed.'));
    this.#worker?.terminate();
    this.#worker = null;
  }
}

/**
 * Pick the best backend for the current environment: a {@link WorkerBackend}
 * when web workers are available (browsers), else an {@link InlineBackend}.
 */
export function createDefaultBackend(): SolverBackend {
  return typeof Worker !== 'undefined' ? new WorkerBackend() : new InlineBackend();
}
