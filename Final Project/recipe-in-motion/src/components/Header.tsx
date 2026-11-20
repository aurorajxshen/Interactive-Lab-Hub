import { recipeConfig } from '../config/recipeConfig';
import type { RecipeState } from '../state/recipeState';

interface Props {
  state: RecipeState;
  onViewStep: (i: number) => void;
  reduced: boolean;
  onToggleReduced: () => void;
}

export function Header({ state, onViewStep, reduced, onToggleReduced }: Props) {
  const steps = recipeConfig.steps;
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">Recipe in Motion</span>
        <span className="brand-sep">/</span>
        <span className="brand-recipe">{recipeConfig.name}</span>
      </div>

      <nav className="progress" aria-label="Recipe steps">
        {steps.map((s, i) => {
          const states = s.micro.map((m) => state.micro[m.id].status);
          const done = states.every((x) => x === 'done' || x === 'skipped');
          const isActive = i === state.active.step && !done;
          const viewed = i === state.viewedStep;
          return (
            <button
              key={s.id}
              className={`progress-tick ${done ? 'is-done' : ''} ${isActive ? 'is-active' : ''} ${viewed ? 'is-viewed' : ''}`}
              onClick={() => onViewStep(i)}
              aria-label={`View step ${i + 1}: ${s.title}${done ? ' (done)' : isActive ? ' (current)' : ''}`}
              aria-current={viewed ? 'step' : undefined}
            >
              <span className="tick-mark" />
              <span className="tick-label">{s.shortTitle}</span>
            </button>
          );
        })}
      </nav>

      <div className="topbar-right">
        <span className="step-count">
          Step <strong>{String(state.viewedStep + 1).padStart(2, '0')}</strong> of {String(steps.length).padStart(2, '0')}
        </span>
        <button className="text-btn" onClick={onToggleReduced} aria-pressed={reduced} title="Reduced motion">
          {reduced ? 'Motion: calm' : 'Motion: on'}
        </button>
      </div>
    </header>
  );
}
