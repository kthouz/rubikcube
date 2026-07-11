import type { ScanState } from '../state/scan';
import { SCAN_SEQUENCE } from '../state/scan';
import type { Face } from '../state/cube';

interface FaceThumbnailsProps {
  scan: ScanState;
  /** The face currently being captured, highlighted in the strip. */
  activeFace: Face;
  /** Jump the sequence to a given step (e.g. to retake). */
  onSelect: (face: Face) => void;
  /** Retake a captured face. */
  onRetake: (face: Face) => void;
}

/**
 * A strip of six slots, one per face in capture order. Captured faces show
 * their thumbnail with a retake affordance; pending faces show a placeholder.
 */
export default function FaceThumbnails({
  scan,
  activeFace,
  onSelect,
  onRetake,
}: FaceThumbnailsProps) {
  return (
    <ol className="thumbs" aria-label="Captured faces">
      {SCAN_SEQUENCE.map((step) => {
        const capture = scan[step.face];
        const isActive = step.face === activeFace;
        return (
          <li
            key={step.face}
            className={`thumb${isActive ? ' thumb--active' : ''}${
              capture ? ' thumb--done' : ''
            }`}
          >
            <button
              type="button"
              className="thumb__button"
              onClick={() => onSelect(step.face)}
              aria-label={`${step.label}${capture ? ' (captured)' : ' (pending)'}`}
            >
              {capture ? (
                <img className="thumb__img" src={capture.imageDataUrl} alt={step.label} />
              ) : (
                <span className="thumb__placeholder" aria-hidden>
                  {step.face}
                </span>
              )}
              <span className="thumb__label">{step.label}</span>
            </button>
            {capture && (
              <button
                type="button"
                className="thumb__retake"
                onClick={() => onRetake(step.face)}
              >
                Retake
              </button>
            )}
          </li>
        );
      })}
    </ol>
  );
}
