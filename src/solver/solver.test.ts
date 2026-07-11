import { describe, it, expect } from 'vitest';
import { CubeState, SOLVED_FACELETS } from '../cube/index.js';
import Cube from 'cubejs';
import { Solver } from './solver.js';
import { InlineBackend, WorkerBackend, type WorkerFactory } from './backend.js';
import { initEngine, solveFacelets } from './engine.js';
import { algorithmToNotation } from './moves.js';
import { SolverError, type Move } from './types.js';
import type { SolverRequest, SolverResponse } from './messages.js';

/** The canonical Kociemba example scramble (matches the cube-model tests). */
const VALID_SCRAMBLE =
  'DRLUUBFBRBLURRLRUBLRDDFDLFUFUFFDBRDUBRUFLLFDDBFLUBLRBD';

/** Apply a list of Moves to a fresh cube built from `facelets`; return solved-ness. */
function movesSolve(facelets: string, moves: Move[]): boolean {
  const cube = Cube.fromString(facelets);
  cube.move(algorithmToNotation(moves));
  return cube.isSolved();
}

describe('Solver (InlineBackend, real engine)', () => {
  it('returns [] for an already-solved cube without invoking the engine', async () => {
    const solver = new Solver(new InlineBackend());
    const state = CubeState.fromFaceletString(SOLVED_FACELETS);
    expect(state.isSolved).toBe(true);
    await expect(solver.solve(state)).resolves.toEqual([]);
  });

  it('solves a scramble and the returned Move[] actually solves the cube', async () => {
    const solver = new Solver(new InlineBackend());
    const state = CubeState.fromFaceletString(VALID_SCRAMBLE);
    const moves = await solver.solve(state);

    expect(moves.length).toBeGreaterThan(0);
    // Every move is a well-formed, self-consistent typed structure.
    for (const move of moves) {
      expect(['U', 'R', 'F', 'D', 'L', 'B']).toContain(move.face);
      if (move.double) {
        expect(move.direction).toBe('cw');
        expect(move.quarterTurns).toBe(2);
      } else {
        expect(move.quarterTurns).toBe(move.direction === 'cw' ? 1 : -1);
      }
    }
    // And, decisively: applying them to the scramble yields a solved cube.
    expect(movesSolve(VALID_SCRAMBLE, moves)).toBe(true);
  });

  it('warmUp builds the tables and later solves still work', async () => {
    const solver = new Solver(new InlineBackend());
    await solver.warmUp();
    const state = CubeState.fromFaceletString(VALID_SCRAMBLE);
    expect(movesSolve(VALID_SCRAMBLE, await solver.solve(state))).toBe(true);
  });

  it('honors an already-aborted signal', async () => {
    const solver = new Solver(new InlineBackend());
    const state = CubeState.fromFaceletString(VALID_SCRAMBLE);
    const controller = new AbortController();
    controller.abort();
    await expect(solver.solve(state, { signal: controller.signal })).rejects.toThrow(SolverError);
  });
});

/**
 * A fake `Worker` that runs the real engine synchronously-in-a-microtask, so we
 * can exercise the WorkerBackend message protocol without a browser.
 */
class FakeWorker {
  onmessage: ((event: MessageEvent<SolverResponse>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  terminated = false;

  postMessage(request: SolverRequest): void {
    queueMicrotask(() => {
      if (this.terminated) return;
      try {
        const response: SolverResponse =
          request.type === 'warmUp'
            ? (initEngine(), { id: request.id, type: 'ready' })
            : { id: request.id, type: 'result', solution: solveFacelets(request.facelets) };
        this.onmessage?.({ data: response } as MessageEvent<SolverResponse>);
      } catch (error) {
        this.onmessage?.({
          data: { id: request.id, type: 'error', message: (error as Error).message },
        } as MessageEvent<SolverResponse>);
      }
    });
  }

  terminate(): void {
    this.terminated = true;
  }
}

const fakeFactory: WorkerFactory = () => new FakeWorker() as unknown as Worker;

describe('WorkerBackend (fake worker, protocol)', () => {
  it('solves through the worker protocol', async () => {
    const solver = new Solver(new WorkerBackend(fakeFactory));
    const state = CubeState.fromFaceletString(VALID_SCRAMBLE);
    const moves = await solver.solve(state);
    expect(movesSolve(VALID_SCRAMBLE, moves)).toBe(true);
    solver.dispose();
  });

  it('correlates concurrent solves by id', async () => {
    const backend = new WorkerBackend(fakeFactory);
    const [a, b] = await Promise.all([
      backend.solve(VALID_SCRAMBLE),
      backend.solve(SOLVED_FACELETS),
    ]);
    // The scramble needs a real algorithm; the solved cube cancels to nothing meaningful,
    // but both must be non-error strings routed to the correct caller.
    expect(typeof a).toBe('string');
    expect(a.length).toBeGreaterThan(0);
    expect(typeof b).toBe('string');
    backend.dispose();
  });

  it('warmUp resolves via the ready response', async () => {
    const backend = new WorkerBackend(fakeFactory);
    await expect(backend.warmUp()).resolves.toBeUndefined();
    backend.dispose();
  });

  it('rejects with SolverError when an aborted signal fires before the reply', async () => {
    const backend = new WorkerBackend(fakeFactory);
    const controller = new AbortController();
    const promise = backend.solve(VALID_SCRAMBLE, controller.signal);
    controller.abort(); // synchronous, before the queued microtask replies
    await expect(promise).rejects.toThrow(/aborted/i);
    backend.dispose();
  });

  it('rejects pending solves when disposed', async () => {
    const backend = new WorkerBackend(fakeFactory);
    const pending = backend.solve(VALID_SCRAMBLE);
    backend.dispose(); // before the microtask reply lands
    await expect(pending).rejects.toThrow(SolverError);
  });

  it('surfaces worker error responses as SolverError', async () => {
    // A worker that always reports failure — verifies the error branch precisely,
    // independent of engine behavior on malformed input.
    const backend = new WorkerBackend(() => new ErroringWorker() as unknown as Worker);
    await expect(backend.solve(VALID_SCRAMBLE)).rejects.toThrow(/engine boom/);
    backend.dispose();
  });
});

/** A fake worker that always answers with an error response. */
class ErroringWorker {
  onmessage: ((event: MessageEvent<SolverResponse>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;

  postMessage(request: SolverRequest): void {
    queueMicrotask(() =>
      this.onmessage?.({
        data: { id: request.id, type: 'error', message: 'engine boom' },
      } as MessageEvent<SolverResponse>),
    );
  }

  terminate(): void {}
}
