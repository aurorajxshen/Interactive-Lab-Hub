import type { ReactNode } from 'react';
import type { MicroAction } from '../config/recipeConfig';
import type { MicroProgress } from '../state/recipeState';

interface Props {
  micro: MicroAction | undefined;
  progress: MicroProgress | undefined;
  /** Stable helper line above the confirm button (sourced from config) */
  helper: string;
  /** Reserved slot left of the confirm button for the task-complete mark */
  mark: ReactNode;
  /** Text equivalent of the mark, announced politely */
  completionText: string;
  previewing: boolean;
  paused: boolean;
  canUndo: boolean;
  atFirst: boolean;
  atLast: boolean;
  finished: boolean;
  /** The final completion mark has finished drawing; the Recipe Memory CTA may appear */
  memoryReady: boolean;
  onConfirm: () => void;
  onIncrement: (d: 1 | -1) => void;
  onPrev: () => void;
  onNext: () => void;
  onUndo: () => void;
  onPause: () => void;
  onSkip: () => void;
  onExtend: () => void;
  onReset: () => void;
  onReturn: () => void;
  onOpenMemory: () => void;
  motionOn: boolean;
  onToggleMotion: () => void;
}

export function Controls(p: Props) {
  const m = p.micro;
  const pr = p.progress;
  let confirmText = m?.confirmLabel ?? 'Confirm';
  if (m?.kind === 'counter' && pr) confirmText = pr.count < m.target ? `Count ${m.unit} ${pr.count + 1}` : `Confirm ${m.target} ${m.unitPlural}`;
  if (m?.kind === 'activeDuration' && m.inspection && pr?.inspectionOpen) confirmText = 'Smooth — continue';
  const isCounter = !p.previewing && !p.finished && m?.kind === 'counter';
  const live = !p.previewing && !p.finished;

  let center: ReactNode;
  if (p.previewing) {
    center = (
      <button className="confirm is-secondary" onClick={p.onReturn}>
        Back to current step
      </button>
    );
  } else if (p.finished) {
    center = p.memoryReady ? (
      <button className="confirm" onClick={p.onOpenMemory}>
        Open my Recipe Memory
      </button>
    ) : (
      <span className="confirm is-ghost" aria-hidden>
        Plated
      </span>
    );
  } else {
    center = (
      <button className="confirm" onClick={p.onConfirm} disabled={p.paused} aria-describedby="confirm-helper">
        {confirmText}
      </button>
    );
  }

  return (
    <footer className="controls" aria-label="Cooking controls">
      <div className="controls-side">
        <button className="ctl" onClick={p.onPrev} disabled={p.atFirst} aria-label="Previous step (Left arrow)">
          ← <span>Back</span>
        </button>
        <button className="ctl" onClick={p.onNext} disabled={p.atLast} aria-label="Look ahead to next step (Right arrow)">
          <span>Look ahead</span> →
        </button>
        <button className="ctl" onClick={p.onUndo} disabled={!p.canUndo} aria-label="Undo (Z)">
          Undo
        </button>
        <button className={`ctl ${p.paused ? 'is-on' : ''}`} onClick={p.onPause} disabled={p.finished} aria-label={p.paused ? 'Resume (P)' : 'Pause (P)'}>
          {p.paused ? 'Resume' : 'Pause'}
        </button>
      </div>

      <div className="controls-center">
        <p id="confirm-helper" className="confirm-helper">
          {p.helper}
        </p>
        <div className="confirm-row">
          {p.mark}
          <span className="round-slot">
            {isCounter && (
              <button className="ctl round" onClick={() => p.onIncrement(-1)} disabled={!pr?.count || p.paused} aria-label="Remove one">
                −
              </button>
            )}
          </span>
          <span className="confirm-slot">{center}</span>
          <span className="round-slot">
            {isCounter && m?.kind === 'counter' && (
              <button className="ctl round" onClick={() => p.onIncrement(1)} disabled={(!!pr && pr.count >= m.target) || p.paused} aria-label="Add one">
                +
              </button>
            )}
          </span>
          <span className="complete-slot" aria-hidden />
        </div>
        <span className="sr-only" role="status" aria-live="polite">
          {p.completionText}
        </span>
      </div>

      <div className="controls-side is-right">
        {live && m?.classifier && (
          <button className={`ctl ${p.motionOn ? 'is-on' : ''}`} onClick={p.onToggleMotion} aria-pressed={p.motionOn} title="Preview motion (M)">
            {p.motionOn ? 'Stop motion' : 'Preview motion'}
          </button>
        )}
        {live && m?.kind === 'timer' && (
          <button className="ctl" onClick={p.onExtend}>
            +{m.extendSec} s
          </button>
        )}
        {live && (m?.kind === 'timer' || m?.kind === 'activeDuration' || m?.kind === 'counter') && (
          <button className="ctl" onClick={p.onReset}>
            Restart
          </button>
        )}
        {live && (
          <button className="ctl" onClick={p.onSkip} disabled={p.paused}>
            Skip
          </button>
        )}
      </div>
    </footer>
  );
}
