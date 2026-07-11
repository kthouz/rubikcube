import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { createEmptyCubeState, type CubeState, type Face } from './cube';
import { createEmptyScanState, type FaceCapture, type ScanState } from './scan';
import {
  classifyCube,
  createEmptyOverrides,
  stickerColorArray,
  type ColorOverrides,
  type CubeColor,
  type CubeDetection,
} from '../lib/colorDetect';

interface AppState {
  cube: CubeState;
  setCube: (next: CubeState) => void;
  /** Raw per-face camera captures produced by the scanning flow. */
  scan: ScanState;
  /** Store (or overwrite, for retakes) the capture for a single face. */
  setFaceCapture: (face: Face, capture: FaceCapture) => void;
  /** Discard a single face's capture (retake). */
  clearFaceCapture: (face: Face) => void;
  /** Clear every captured face. */
  resetScan: () => void;

  /** Auto-detected sticker colors + confidence, derived from `scan`. */
  detection: CubeDetection;
  /** Manual per-sticker color corrections applied over the detection. */
  overrides: ColorOverrides;
  /** Manually set (or clear, with `null`) one sticker's color. */
  setStickerOverride: (face: Face, index: number, color: CubeColor | null) => void;
  /** Drop all manual corrections, reverting to pure auto-detection. */
  resetOverrides: () => void;
  /**
   * The 54-sticker color array (URFDLB face order, row-major within a face),
   * detection with manual overrides applied. `null` entries are uncaptured.
   */
  stickerColors: (CubeColor | null)[];

  reset: () => void;
}

const AppStateContext = createContext<AppState | null>(null);

/**
 * Lightweight global state for the scanned cube, shared across the Scan,
 * Review, and Solve views. Swap for a more capable store (Zustand/Redux) if the
 * app grows.
 */
export function AppStateProvider({ children }: { children: ReactNode }) {
  const [cube, setCube] = useState<CubeState>(createEmptyCubeState);
  const [scan, setScan] = useState<ScanState>(createEmptyScanState);
  const [overrides, setOverrides] = useState<ColorOverrides>(createEmptyOverrides);

  const setFaceCapture = useCallback((face: Face, capture: FaceCapture) => {
    setScan((prev) => ({ ...prev, [face]: capture }));
    // A fresh capture invalidates any manual corrections on that face.
    setOverrides((prev) => ({ ...prev, [face]: createEmptyOverrides()[face] }));
  }, []);

  const clearFaceCapture = useCallback((face: Face) => {
    setScan((prev) => ({ ...prev, [face]: null }));
    setOverrides((prev) => ({ ...prev, [face]: createEmptyOverrides()[face] }));
  }, []);

  const resetScan = useCallback(() => {
    setScan(createEmptyScanState());
    setOverrides(createEmptyOverrides());
  }, []);

  const setStickerOverride = useCallback(
    (face: Face, index: number, color: CubeColor | null) => {
      setOverrides((prev) => {
        const next = prev[face].slice();
        next[index] = color;
        return { ...prev, [face]: next };
      });
    },
    []
  );

  const resetOverrides = useCallback(() => setOverrides(createEmptyOverrides()), []);

  // Detection is a pure function of the raw samples; recompute only when a
  // capture changes.
  const detection = useMemo<CubeDetection>(() => {
    const samples = {
      U: scan.U?.samples ?? null,
      R: scan.R?.samples ?? null,
      F: scan.F?.samples ?? null,
      D: scan.D?.samples ?? null,
      L: scan.L?.samples ?? null,
      B: scan.B?.samples ?? null,
    };
    return classifyCube(samples);
  }, [scan]);

  const stickerColors = useMemo(
    () => stickerColorArray(detection, overrides),
    [detection, overrides]
  );

  const value = useMemo<AppState>(
    () => ({
      cube,
      setCube,
      scan,
      setFaceCapture,
      clearFaceCapture,
      resetScan,
      detection,
      overrides,
      setStickerOverride,
      resetOverrides,
      stickerColors,
      reset: () => {
        setCube(createEmptyCubeState());
        setScan(createEmptyScanState());
        setOverrides(createEmptyOverrides());
      },
    }),
    [
      cube,
      scan,
      setFaceCapture,
      clearFaceCapture,
      resetScan,
      detection,
      overrides,
      setStickerOverride,
      resetOverrides,
      stickerColors,
    ]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return ctx;
}
