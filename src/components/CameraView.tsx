import { forwardRef } from 'react';
import type { CameraStatus } from '../hooks/useCamera';
import { GRID_FRACTION } from '../lib/capture';

interface CameraViewProps {
  status: CameraStatus;
  /** Accent color for the alignment grid (the current face's color hint). */
  gridColor?: string;
}

/**
 * The live camera preview with a 3×3 alignment grid overlaid on the centered
 * square that gets sampled on capture. The <video> element is forwarded so the
 * parent can read frames; the grid geometry mirrors `gridSquare` in
 * lib/capture so what the user aligns is exactly what is sampled.
 */
const CameraView = forwardRef<HTMLVideoElement, CameraViewProps>(function CameraView(
  { status, gridColor = 'var(--accent)' },
  ref
) {
  return (
    <div className="camera">
      <video
        ref={ref}
        className="camera__video"
        playsInline
        muted
        // Mirror is intentionally OFF: sampled colors must match reality.
      />

      {status === 'ready' && (
        <div className="camera__overlay" aria-hidden>
          <div
            className="camera__grid"
            style={{ borderColor: gridColor, width: `${GRID_FRACTION * 100}%` }}
          >
            {Array.from({ length: 9 }).map((_, i) => (
              <span key={i} className="camera__cell" style={{ borderColor: gridColor }} />
            ))}
          </div>
        </div>
      )}

      {status !== 'ready' && (
        <div className="camera__placeholder">
          {status === 'requesting' ? 'Starting camera…' : 'Camera preview'}
        </div>
      )}
    </div>
  );
});

export default CameraView;
