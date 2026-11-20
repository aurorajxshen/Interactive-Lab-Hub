import type { MicroAction } from '../config/recipeConfig';
import type { MicroProgress } from '../state/recipeState';

interface Props {
  micro: MicroAction | undefined;
  progress: MicroProgress | undefined;
  previewing: boolean;
  paused: boolean;
  canUndo: boolean;
  atFirst: boolean;
  atLast: boolean;
  finished: boolean;
  onConfirm: () => void;
  onIncrement: (d: 1 | -1) => void;
  onPrev: () => void;
  onNext: () => void;
  onUndo: () => void;
  onPause: () => void;
  onSkip: () => void;
  onHelp: () => void;
  onExtend: () => void;
  onReset: () => void;
  onReturn: () => void;
  motionOn: boolean;
  onToggleMotion: () => void;
}

export function Controls(p: Props) {
  const m = p.micro;
  const pr = p.progress;
  let confirmText = m?.confirmLabel ?? 'Confirm';
  if (m?.kind === 'counter' && pr) confirmText = pr.count < m.target ? `Count ${m.unit} ${pr.count + 1}` : `Confirm ${m.target} ${m.unitPlural}`;
  if (m?.kind === 'activeDuration' && m.inspection && pr?.inspectionOpen) confirmText = 'Smooth — continue';

  return (
    <footer className="controls">
      <div className="controls-side">
        <button className="ctl" onClick={p.onPrev} disabled={p.atFirst} aria-label="Previous step (Left arrow)">
          ← <span>Back</span>
        </button>
        <button className="ctl" onClick={p.onUndo} disabled={!p.canUndo} aria-label="Undo (Z)">
          Undo
        </button>
        <button className={`ctl ${p.paused ? 'is-on' : ''}`} onClick={p.onPause} disabled={p.finished} aria-label="Pause (P)">
          {p.paused ? 'Resume' : 'Pause'}
        </button>
      </div>

      <div className="controls-center">
        {p.previewing ? (
          <button className="confirm is-secondary" onClick={p.onReturn}>
            Back to current step
          </button>
        ) : p.finished ? (
          <span className="confirm-done">Plated ✓</span>
        ) : (
          <>
            {m?.kind === 'counter' && (
              <button className="ctl round" onClick={() => p.onIncrement(-1)} disabled={!pr?.count} aria-label="Remove one">
                −
              </button>
            )}
            <button className="confirm" onClick={p.onConfirm} disabled={p.paused}>
              {confirmText}
            </button>
            {m?.kind === 'counter' && (
              <button className="ctl round" onClick={() => p.onIncrement(1)} disabled={!!pr && pr.count >= m.target} aria-label="Add one">
                +
              </button>
            )}
          </>
        )}
      </div>

      <div className="controls-side is-right">
        {!p.previewing && !p.finished && m?.classifier && (
          <button className={`ctl ${p.motionOn ? 'is-on' : ''}`} onClick={p.onToggleMotion} aria-pressed={p.motionOn} title="Preview motion (M)">
            {p.motionOn ? 'Stop motion' : 'Preview motion'}
          </button>
        )}
        {!p.previewing && !p.finished && m?.kind === 'timer' && (
          <button className="ctl" onClick={p.onExtend}>
            +{m.extendSec} s
          </button>
        )}
        {!p.previewing && !p.finished && (m?.kind === 'timer' || m?.kind === 'activeDuration' || m?.kind === 'counter') && (
          <button className="ctl" onClick={p.onReset}>
            Restart
          </button>
        )}
        {!p.previewing && !p.finished && (
          <button className="ctl" onClick={p.onSkip}>
            Skip
          </button>
        )}
        <button className="ctl" onClick={p.onHelp} aria-label="Help (H)">
          Help
        </button>
        <button className="ctl" onClick={p.onNext} disabled={p.atLast} aria-label="Next step (Right arrow)">
          <span>Look ahead</span> →
        </button>
      </div>
    </footer>
  );
}
