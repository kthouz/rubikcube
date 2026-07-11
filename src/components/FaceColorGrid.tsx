import { useState } from 'react';
import {
  CUBE_COLORS,
  CUBE_COLOR_META,
  LOW_CONFIDENCE,
  effectiveColor,
  faceConfidence,
  type CubeColor,
  type StickerDetection,
} from '../lib/colorDetect';

interface FaceColorGridProps {
  /** Human label for the face (e.g. "Front · Green"). */
  label: string;
  /** Nine detections, row-major, or null if the face isn't captured. */
  detections: StickerDetection[] | null;
  /** Nine manual overrides for this face, row-major. */
  overrides: (CubeColor | null)[];
  /** The captured thumbnail for visual reference. */
  thumbnailUrl?: string;
  /** Set (color) or clear (null) a sticker's manual color. */
  onSet: (index: number, color: CubeColor | null) => void;
}

/**
 * One face's detected colors as an editable 3×3 grid.
 *
 * Each cell shows the effective color (manual override if present, else the
 * auto-detection). Low-confidence auto-detections are ringed so the user knows
 * where to look; manually corrected cells are marked. Clicking a cell opens a
 * six-color palette to reassign it (or revert to the auto guess).
 */
export default function FaceColorGrid({
  label,
  detections,
  overrides,
  thumbnailUrl,
  onSet,
}: FaceColorGridProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!detections) {
    return (
      <div className="facegrid facegrid--empty">
        <div className="facegrid__head">
          <span className="facegrid__label">{label}</span>
          <span className="facegrid__badge facegrid__badge--pending">Not captured</span>
        </div>
        <p className="facegrid__hint">Capture this face to detect its colors.</p>
      </div>
    );
  }

  const conf = faceConfidence(detections);
  const confPct = Math.round(conf.mean * 100);
  const confLevel = conf.min < LOW_CONFIDENCE ? 'low' : conf.mean < 0.7 ? 'mid' : 'high';

  function pick(index: number, color: CubeColor | null) {
    onSet(index, color);
    setOpenIndex(null);
  }

  return (
    <div className="facegrid">
      <div className="facegrid__head">
        <span className="facegrid__label">{label}</span>
        <span
          className={`facegrid__badge facegrid__badge--${confLevel}`}
          title="Mean detection confidence for this face"
        >
          {confPct}% sure
        </span>
      </div>

      <div className="facegrid__body">
        {thumbnailUrl && (
          <img className="facegrid__thumb" src={thumbnailUrl} alt={`${label} capture`} />
        )}

        <div className="facegrid__grid" role="group" aria-label={`${label} stickers`}>
          {detections.map((det, i) => {
            const override = overrides[i] ?? null;
            const color = effectiveColor(det, override) as CubeColor;
            const meta = CUBE_COLOR_META[color];
            const isLow = !override && det.confidence < LOW_CONFIDENCE;
            const isEdited = override !== null;
            const isOpen = openIndex === i;
            return (
              <div key={i} className="facegrid__cellwrap">
                <button
                  type="button"
                  className={`facegrid__cell${isLow ? ' facegrid__cell--low' : ''}${
                    isEdited ? ' facegrid__cell--edited' : ''
                  }${isOpen ? ' facegrid__cell--open' : ''}`}
                  style={{ background: meta.swatch }}
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  aria-haspopup="true"
                  aria-expanded={isOpen}
                  aria-label={`${label} sticker ${i + 1}: ${meta.label}${
                    isEdited ? ' (corrected)' : ''
                  }${isLow ? ' (low confidence — check this)' : ''}. Click to change.`}
                  title={
                    isEdited
                      ? `${meta.label} — corrected`
                      : `${meta.label} — ${Math.round(det.confidence * 100)}% confidence`
                  }
                >
                  {isLow && (
                    <span className="facegrid__flag" aria-hidden>
                      ?
                    </span>
                  )}
                  {isEdited && (
                    <span className="facegrid__edited" aria-hidden>
                      ✎
                    </span>
                  )}
                </button>

                {isOpen && (
                  <div className="facegrid__popover" role="menu">
                    <div className="facegrid__swatches">
                      {CUBE_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          role="menuitemradio"
                          aria-checked={color === c}
                          className={`facegrid__swatch${
                            color === c ? ' facegrid__swatch--active' : ''
                          }`}
                          style={{ background: CUBE_COLOR_META[c].swatch }}
                          onClick={() => pick(i, c)}
                          title={CUBE_COLOR_META[c].label}
                          aria-label={CUBE_COLOR_META[c].label}
                        />
                      ))}
                    </div>
                    {isEdited && (
                      <button
                        type="button"
                        className="facegrid__revert"
                        onClick={() => pick(i, null)}
                      >
                        Revert to auto ({CUBE_COLOR_META[det.color].label})
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
