import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { createEmptyCubeState, type CubeState } from './cube';

interface AppState {
  cube: CubeState;
  setCube: (next: CubeState) => void;
  reset: () => void;
}

const AppStateContext = createContext<AppState | null>(null);

/**
 * Lightweight global state for the scanned cube, shared across the Scan and
 * Solve views. Swap for a more capable store (Zustand/Redux) if the app grows.
 */
export function AppStateProvider({ children }: { children: ReactNode }) {
  const [cube, setCube] = useState<CubeState>(createEmptyCubeState);

  const value = useMemo<AppState>(
    () => ({
      cube,
      setCube,
      reset: () => setCube(createEmptyCubeState()),
    }),
    [cube]
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
