import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import CameraView from '../components/CameraView';
import FaceThumbnails from '../components/FaceThumbnails';
import { useCamera } from '../hooks/useCamera';
import { captureFace } from '../lib/capture';
import { useAppState } from '../state/AppStateContext';
import { type Face } from '../state/cube';
import { SCAN_SEQUENCE, capturedCount, isScanComplete } from '../state/scan';

/** Standard-scheme color names → CSS colors for the alignment grid hint. */
const GRID_COLORS: Record<string, string> = {
  White: '#e6e8ec',
  Yellow: '#f5d13b',
  Green: '#3bd16f',
  Blue: '#4f8cff',
  Red: '#ff5a5a',
  Orange: '#ff9f43',
};

export default function Scan() {
  const { scan, setFaceCapture, clearFaceCapture, resetScan } = useAppState();
  const { videoRef, status, errorMessage, start, stop } = useCamera();
  const [stepIndex, setStepIndex] = useState(0);
  const [captureError, setCaptureError] = useState<string | null>(null);

  const step = SCAN_SEQUENCE[stepIndex];
  const done = capturedCount(scan);
  const complete = isScanComplete(scan);

  const faceToIndex = useMemo(() => {
    const map = new Map<Face, number>();
    SCAN_SEQUENCE.forEach((s, i) => map.set(s.face, i));
    return map;
  }, []);

  /** Advance to the next face that still needs a capture, if any. */
  function goToNextPending(justCaptured: Face) {
    const next = SCAN_SEQUENCE.findIndex(
      (s) => s.face !== justCaptured && scan[s.face] === null
    );
    if (next !== -1) setStepIndex(next);
  }

  function handleCapture() {
    const video = videoRef.current;
    if (!video) return;
    try {
      const capture = captureFace(video);
      setFaceCapture(step.face, capture);
      setCaptureError(null);
      goToNextPending(step.face);
    } catch (err) {
      setCaptureError(err instanceof Error ? err.message : 'Capture failed. Try again.');
    }
  }

  function handleRetake(face: Face) {
    clearFaceCapture(face);
    const idx = faceToIndex.get(face);
    if (idx !== undefined) setStepIndex(idx);
  }

  function handleReset() {
    resetScan();
    setStepIndex(0);
    setCaptureError(null);
  }

  function selectFace(face: Face) {
    const idx = faceToIndex.get(face);
    if (idx !== undefined) setStepIndex(idx);
  }

  const gridColor = GRID_COLORS[step.color] ?? 'var(--accent)';
  const blocked = status === 'denied' || status === 'unsupported' || status === 'error';

  return (
    <section className="view scan">
      <div className="view__header">
        <h1 className="view__title">Scan</h1>
        <span className="badge">{done}/6 faces</span>
      </div>
      <p className="view__description">
        Capture all six faces of your cube. Align each face inside the grid and press capture —
        we sample the nine sticker colors for the solver.
      </p>

      <div className="scan__layout">
        <div className="scan__camera">
          <CameraView ref={videoRef} status={status} gridColor={gridColor} />

          {/* Camera not yet started */}
          {status === 'idle' && (
            <div className="scan__gate">
              <p>We need your camera to scan the cube. Nothing leaves your device.</p>
              <button type="button" className="button button--primary" onClick={start}>
                Enable camera
              </button>
            </div>
          )}

          {/* Permission denied / unsupported / other error */}
          {blocked && (
            <div className="scan__gate scan__gate--error" role="alert">
              <p className="scan__error-title">
                {status === 'denied'
                  ? 'Camera access blocked'
                  : status === 'unsupported'
                    ? 'Camera unavailable'
                    : 'Camera error'}
              </p>
              <p>{errorMessage}</p>
              {status === 'denied' && (
                <p className="scan__hint">
                  Look for the camera icon in your browser&apos;s address bar to grant access,
                  then retry.
                </p>
              )}
              {status !== 'unsupported' && (
                <button type="button" className="button button--primary" onClick={start}>
                  Try again
                </button>
              )}
            </div>
          )}
        </div>

        <aside className="scan__panel">
          {complete ? (
            <div className="scan__complete">
              <h2 className="scan__step-title">All faces captured 🎉</h2>
              <p>Every face is ready for color detection.</p>
              <Link to="/solve" className="button button--primary">
                Continue to solve
              </Link>
              <button type="button" className="button button--ghost" onClick={handleReset}>
                Start over
              </button>
            </div>
          ) : (
            <div className="scan__step">
              <span className="scan__step-index">
                Step {stepIndex + 1} of {SCAN_SEQUENCE.length}
              </span>
              <h2 className="scan__step-title">{step.label}</h2>
              <p className="scan__instruction">{step.instruction}</p>

              <button
                type="button"
                className="button button--primary scan__capture"
                onClick={handleCapture}
                disabled={status !== 'ready'}
              >
                {scan[step.face] ? 'Recapture this face' : 'Capture'}
              </button>
              {status !== 'ready' && !blocked && (
                <p className="scan__hint">Enable the camera to capture.</p>
              )}
              {captureError && (
                <p className="scan__hint scan__hint--error" role="alert">
                  {captureError}
                </p>
              )}
            </div>
          )}
        </aside>
      </div>

      <FaceThumbnails
        scan={scan}
        activeFace={step.face}
        onSelect={selectFace}
        onRetake={handleRetake}
      />

      {done > 0 && (
        <div className="scan__footer-actions">
          <button type="button" className="button button--ghost" onClick={handleReset}>
            Reset all
          </button>
          {status === 'ready' && (
            <button type="button" className="button button--ghost" onClick={stop}>
              Turn off camera
            </button>
          )}
        </div>
      )}
    </section>
  );
}
