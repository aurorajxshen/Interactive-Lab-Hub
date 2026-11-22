import { useState, type CSSProperties } from 'react';
import { interactionConfig } from '../config/interactionConfig';
import type { Completion } from '../state/recipeState';

interface Props {
  /** Latest real transition to `done` (null after undo / at start) */
  completion: Completion | null;
  now: number;
  color: string;
  reduced: boolean;
}

/**
 * A restrained "task complete" mark: a pencil circle draws clockwise, a
 * hand-drawn tick follows, one gentle settle. Lives in a fixed, reserved slot
 * beside the confirm button, so it never moves surrounding content.
 *
 * Replays only on a real completion: the element is keyed by the completion
 * timestamp, so ordinary re-renders keep the same element (its CSS animation
 * runs once per mount). If it mounts late (e.g. after a remount), it skips
 * straight to the finished drawing. Undo clears `completion`, removing it.
 */
export function TaskCompleteMark({ completion, now, color, reduced }: Props) {
  const age = completion ? now - completion.at : Infinity;
  const visible = completion !== null && age < interactionConfig.completeMarkHoldMs;
  return (
    <span className="complete-slot" aria-hidden>
      {visible && completion && <Mark key={completion.at} at={completion.at} color={color} reduced={reduced} />}
    </span>
  );
}

function Mark({ at, color, reduced }: { at: number; color: string; reduced: boolean }) {
  // Decided once per mount: a late mount (e.g. after a remount) skips straight to the finished drawing.
  const [animate] = useState(() => !reduced && Date.now() - at < interactionConfig.completeMarkMs * 0.5);
  return (
    <span
      className={`complete-mark ${animate ? 'is-animated' : 'is-static'}`}
      style={{ '--mark-color': color, '--mark-ms': `${interactionConfig.completeMarkMs}ms`, '--hold-ms': `${interactionConfig.completeMarkHoldMs}ms` } as CSSProperties}
    >
      <svg viewBox="0 0 48 48" width="44" height="44" aria-hidden focusable="false">
        <path
          className="cm-circle"
          d="M24,4.5 C35.2,4.2 43.6,12.6 43.5,23.8 C43.4,35 35,43.6 23.8,43.5 C12.6,43.4 4.4,35.1 4.5,23.9 C4.6,13.6 12.2,5.4 22.6,4.6"
          pathLength={1}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.4}
          strokeLinecap="round"
        />
        <path
          className="cm-tick"
          d="M14.5,24.5 C17,26.4 19.2,28.8 21,31.6 C24.6,25 28.8,19.6 34,15"
          pathLength={1}
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

/** Screen-reader / text equivalent of the mark */
export function completionText(c: Completion | null, now: number) {
  if (!c || now - c.at > interactionConfig.completeMarkHoldMs) return '';
  return `Done: ${c.label}.`;
}
