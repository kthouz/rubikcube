import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import FaceColorGrid from '../components/FaceColorGrid';
import { useAppState } from '../state/AppStateContext';
import { SCAN_SEQUENCE } from '../state/scan';
import {
  CUBE_COLORS,
  CUBE_COLOR_META,
  LOW_CONFIDENCE,
  colorCounts,
  validateCube,
} from '../lib/colorDetect';

/**
 * Color-review screen: shows the detected colors for every captured face as an
 * editable 3×3 grid, flags low-confidence stickers, validates the resulting
 * 54-sticker array, and lets the user correct any mistake before solving.
 */
export default function Review() {
  const { scan, detection, overrides, setStickerOverride, resetOverrides, stickerColors } =
    useAppState();

  const capturedFaces = SCAN_SEQUENCE.filter((step) => scan[step.face] !== null);
  const anyCaptured = capturedFaces.length > 0;

  const counts = useMemo(() => colorCounts(stickerColors), [stickerColors]);
  const validation = useMemo(() => validateCube(stickerColors), [stickerColors]);

  const lowCount = useMemo(() => {
    let n = 0;
    for (const step of SCAN_SEQUENCE) {
      const dets = detection.faces[step.face];
      const ov = overrides[step.face];
      if (!dets) continue;
      dets.forEach((d, i) => {
        if (!ov?.[i] && d.confidence < LOW_CONFIDENCE) n += 1;
      });
    }
    return n;
  }, [detection, overrides]);

  const editedCount = useMemo(
    () =>
      SCAN_SEQUENCE.reduce(
        (n, step) => n + overrides[step.face].filter((c) => c !== null).length,
        0
      ),
    [overrides]
  );

  if (!anyCaptured) {
    return (
      <section className="view review">
        <div className="view__header">
          <h1 className="view__title">Review colors</h1>
        </div>
        <p className="view__description">
          No faces captured yet. Scan your cube first, then come back to review the detected
          colors.
        </p>
        <Link to="/scan" className="button button--primary">
          Go to scan
        </Link>
      </section>
    );
  }

  return (
    <section className="view review">
      <div className="view__header">
        <h1 className="view__title">Review colors</h1>
        <span className={`badge ${validation.ok ? 'badge--ok' : 'badge--warn'}`}>
          {validation.ok ? 'Looks valid' : 'Needs a check'}
        </span>
      </div>
      <p className="view__description">
        We detected each sticker&apos;s color by matching it to your cube&apos;s own center
        colors, so uneven lighting and camera white-balance are handled automatically. Click
        any sticker to correct it.
      </p>

      {/* Summary: confidence + colour tally */}
      <div className="review__summary">
        <div className="review__stat">
          <span className="review__stat-value">{lowCount === 0 ? 'All clear' : lowCount}</span>
          <span className="review__stat-label">
            {lowCount === 0
              ? 'no low-confidence stickers'
              : `low-confidence sticker${lowCount === 1 ? '' : 's'} to check`}
          </span>
        </div>
        <div className="review__stat">
          <span className="review__stat-value">{editedCount}</span>
          <span className="review__stat-label">
            manual correction{editedCount === 1 ? '' : 's'}
          </span>
        </div>
        <ul className="review__counts" aria-label="Detected color counts">
          {CUBE_COLORS.map((c) => (
            <li
              key={c}
              className={`review__count${counts[c] === 9 ? ' review__count--ok' : ''}`}
              title={`${CUBE_COLOR_META[c].label}: ${counts[c]} of 9`}
            >
              <span
                className="review__count-swatch"
                style={{ background: CUBE_COLOR_META[c].swatch }}
              />
              <span className="review__count-num">{counts[c]}</span>
            </li>
          ))}
        </ul>
      </div>

      {!validation.ok && (
        <ul className="review__issues" role="status">
          {validation.issues.map((issue, i) => (
            <li key={i}>{issue}</li>
          ))}
        </ul>
      )}

      <div className="review__faces">
        {SCAN_SEQUENCE.map((step) => (
          <FaceColorGrid
            key={step.face}
            label={step.label}
            detections={detection.faces[step.face]}
            overrides={overrides[step.face]}
            thumbnailUrl={scan[step.face]?.imageDataUrl}
            onSet={(index, color) => setStickerOverride(step.face, index, color)}
          />
        ))}
      </div>

      <div className="review__actions">
        <Link
          to="/solve"
          className={`button button--primary${validation.ok ? '' : ' button--disabled'}`}
          aria-disabled={!validation.ok}
          onClick={(e) => {
            if (!validation.ok) e.preventDefault();
          }}
        >
          Continue to solve
        </Link>
        <Link to="/scan" className="button button--ghost">
          Back to scan
        </Link>
        {editedCount > 0 && (
          <button type="button" className="button button--ghost" onClick={resetOverrides}>
            Undo corrections
          </button>
        )}
      </div>
    </section>
  );
}
