import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { createEmptyCubeState, type CubeState, type Face } from './cube';
import { createEmptyScanState, type FaceCapture, type ScanState } from './scan';

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
  reset: () => void;
}

const AppStateContext = createContext<AppState | null>(null);

/**
 * Lightweight global state for the scanned cube, shared across the Scan and
 * Solve views. Swap for a more capable store (Zustand/Redux) if the app grows.
 */
export function AppStateProvider({ children }: { children: ReactNode }) {
  const [cube, setCube] = useState<CubeState>(createEmptyCubeState);
  const [scan, setScan] = useState<ScanState>(createEmptyScanState);

  const setFaceCapture = useCallback((face: Face, capture: FaceCapture) => {
    setScan((prev) => ({ ...prev, [face]: capture }));
  }, []);

  const clearFaceCapture = useCallback((face: Face) => {
    setScan((prev) => ({ ...prev, [face]: null }));
  }, []);

  const resetScan = useCallback(() => setScan(createEmptyScanState()), []);

  const value = useMemo<AppState>(
    () => ({
      cube,
      setCube,
      scan,
      setFaceCapture,
      clearFaceCapture,
      resetScan,
      reset: () => {
        setCube(createEmptyCubeState());
        setScan(createEmptyScanState());
      },
    }),
    [cube, scan, setFaceCapture, clearFaceCapture, resetScan]
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
