import { describe, it, expect } from 'vitest';
import {
  parseMove,
  parseAlgorithm,
  algorithmToNotation,
  moveToNotation,
  isMoveToken,
} from './moves.js';
import { SolverError, type Move } from './types.js';

describe('parseMove', () => {
  it('parses a plain clockwise quarter turn', () => {
    expect(parseMove('R')).toEqual<Move>({
      face: 'R',
      direction: 'cw',
      double: false,
      notation: 'R',
      quarterTurns: 1,
    });
  });

  it('parses a prime (counter-clockwise) quarter turn', () => {
    expect(parseMove("U'")).toEqual<Move>({
      face: 'U',
      direction: 'ccw',
      double: false,
      notation: "U'",
      quarterTurns: -1,
    });
  });

  it('parses a double (half) turn and normalizes direction to cw', () => {
    expect(parseMove('F2')).toEqual<Move>({
      face: 'F',
      direction: 'cw',
      double: true,
      notation: 'F2',
      quarterTurns: 2,
    });
  });

  it('accepts every face letter', () => {
    for (const face of ['U', 'R', 'F', 'D', 'L', 'B'] as const) {
      expect(parseMove(face).face).toBe(face);
    }
  });

  it('rejects unknown or malformed tokens', () => {
    for (const bad of ['x', 'RR', 'R3', 'r', '', "2'", 'U2 ', 'M', 'Rw']) {
      expect(() => parseMove(bad)).toThrow(SolverError);
    }
  });
});

describe('parseAlgorithm', () => {
  it('parses a whitespace-separated algorithm', () => {
    const moves = parseAlgorithm("R U' F2");
    expect(moves.map((m) => m.notation)).toEqual(['R', "U'", 'F2']);
  });

  it('tolerates irregular whitespace and returns [] for empty input', () => {
    expect(parseAlgorithm('   R    U2  ').map((m) => m.notation)).toEqual(['R', 'U2']);
    expect(parseAlgorithm('')).toEqual([]);
    expect(parseAlgorithm('   ')).toEqual([]);
  });

  it('throws if any token is invalid', () => {
    expect(() => parseAlgorithm('R U bad F')).toThrow(SolverError);
  });
});

describe('serialization round-trips', () => {
  it('re-serializes to the original notation', () => {
    const algorithm = "R U2 F' D L2 B U' R2";
    expect(algorithmToNotation(parseAlgorithm(algorithm))).toBe(algorithm);
  });

  it('moveToNotation matches the move notation field', () => {
    const move = parseMove("L'");
    expect(moveToNotation(move)).toBe("L'");
  });
});

describe('isMoveToken', () => {
  it('recognizes valid tokens and rejects others', () => {
    expect(isMoveToken('R')).toBe(true);
    expect(isMoveToken("D'")).toBe(true);
    expect(isMoveToken('B2')).toBe(true);
    expect(isMoveToken('M')).toBe(false);
    expect(isMoveToken('R U')).toBe(false);
  });
});
