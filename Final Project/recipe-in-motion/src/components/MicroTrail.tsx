import type { RecipeStep } from '../config/recipeConfig';
import type { MicroProgress } from '../state/recipeState';

/** The nested micro-actions of a step, as a quiet hand-drawn trail */
export function MicroTrail({ step, states, currentIndex }: { step: RecipeStep; states: MicroProgress[]; currentIndex: number }) {
  if (step.micro.length < 2) return null;
  return (
    <ol className="micro-trail" aria-label="Actions in this step">
      {step.micro.map((m, i) => {
        const st = states[i].status;
        const cls = st === 'done' ? 'is-done' : st === 'skipped' ? 'is-skipped' : i === currentIndex ? 'is-current' : '';
        return (
          <li key={m.id} className={cls}>
            <span className="trail-mark" aria-hidden>
              {st === 'done' ? '✓' : st === 'skipped' ? '–' : i + 1}
            </span>
            {m.label}
            {m.optional && <em> (optional)</em>}
          </li>
        );
      })}
    </ol>
  );
}
