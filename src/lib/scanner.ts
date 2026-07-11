/**
 * Camera scanning adapter (placeholder).
 *
 * The intended shape: process a video frame, locate the 3×3 sticker grid, and
 * sample the nine colors for one face. Faces are merged into a CubeState.
 *
 * Implementation tracked separately — do not call this yet.
 */

import type { FaceStickers } from '../state/cube';

export function detectFace(_frame: ImageData): FaceStickers {
  throw new Error('detectFace() is not implemented yet — see src/lib/scanner.ts');
}
