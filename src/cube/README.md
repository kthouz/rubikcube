# Cube State & Validation

The typed data model that sits between **color detection** and the **solver**.

```
color detection ──▶ StickerColors ──▶ CubeState ──▶ FaceletString ──▶ solver
                    (54 colors)      (validated)    (URFDLB, 54 chars)
```

## Input contract (from color detection)

`StickerColors` is a `readonly Color[]` of length **54**, in **URFDLB face
order**, each face row-major (top-left → bottom-right) in the standard scanning
orientation. Flat index = `faceIndex * 9 + stickerIndex`:

| Faces  | Indices |
|--------|---------|
| U (Up) | 0–8     |
| R (Right) | 9–17 |
| F (Front) | 18–26 |
| D (Down)  | 27–35 |
| L (Left)  | 36–44 |
| B (Back)  | 45–53 |

`Color` is just a token compared with `===`. Any stable label works — a name
(`'white'`), a hex string (`'#fff'`), or a numeric cluster id. Color detection
does **not** need to know which color is "up"; the six center stickers (indices
4, 13, 22, 31, 40, 49) define the color→face mapping.

## Usage

```ts
import { CubeState, CubeStateError } from './cube';

// Throwing form — use when a valid scan is expected:
try {
  const state = CubeState.fromStickerColors(stickers);
  solver.solve(state.faceletString);
} catch (e) {
  if (e instanceof CubeStateError) showToUser(e.errors[0].message);
}

// Non-throwing form — use to drive rescan UX:
const result = CubeState.tryFromStickerColors(stickers);
if (!result.ok) {
  for (const err of result.errors) showToUser(err.message); // e.g. "Two edges … Rescan."
} else {
  solver.solve(result.state.faceletString);
}

// Validation only (no state object):
validateStickerColors(stickers); // -> { ok: true } | { ok: false, errors }
```

A constructed `CubeState` is **guaranteed physically solvable** and immutable,
so downstream code can consume `.faceletString` without re-checking.

## What "valid" means

Validation runs two stages. Structural problems (reported together) come first;
if the sticker set is sound, the single most specific solvability error is
reported.

| Stage | Code | Meaning |
|-------|------|---------|
| Structural | `BAD_STICKER_COUNT` | Not exactly 54 stickers |
| Structural | `BAD_CENTERS` | The six centers aren't six distinct colors |
| Structural | `UNKNOWN_COLOR` | A sticker matches no face center |
| Structural | `BAD_COLOR_COUNT` | Some color ≠ 9 occurrences |
| Solvability | `EDGE_PERMUTATION` | An edge piece missing/duplicated |
| Solvability | `EDGE_FLIP` | Edge orientation parity odd (one edge flipped) |
| Solvability | `CORNER_PERMUTATION` | A corner piece missing/duplicated |
| Solvability | `CORNER_TWIST` | Corner orientation sum ≢ 0 (mod 3) |
| Solvability | `PARITY` | Corner/edge permutation parities disagree |

Every error carries a UI-safe `message` and optional structured `details`. The
solvability checks are the standard Kociemba cubie-level verification.

## Files

- `types.ts` — `Face`, `Color`, `StickerColors`, `FaceletString`, error types.
- `cubie-tables.ts` — static corner/edge ↔ facelet tables (Kociemba layout).
- `CubeState.ts` — mapping, validation, and the `CubeState` class.
- `index.ts` — public surface (import from here).
