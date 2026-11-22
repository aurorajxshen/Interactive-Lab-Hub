import { recipeConfig } from '../config/recipeConfig';
import type { RecipeState } from '../state/recipeState';
import type { SensorStatus } from '../sensors/useSensorBridge';

interface Props {
  state: RecipeState;
  onViewStep: (i: number) => void;
  reduced: boolean;
  onToggleReduced: () => void;
  onHelp: () => void;
  sensors: SensorStatus;
  now: number;
}

export function Header({ state, onViewStep, reduced, onToggleReduced, onHelp, sensors, now }: Props) {
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
        <SensorChip sensors={sensors} now={now} onClick={onHelp} />
        <button className="text-btn" onClick={onToggleReduced} aria-pressed={reduced} title="Reduced motion">
          {reduced ? 'Motion: calm' : 'Motion: on'}
        </button>
        <button className="text-btn" onClick={onHelp} aria-label="Help and voice settings (H)">
          Help
        </button>
      </div>
    </header>
  );
}

const GESTURE_NAMES: Record<string, string> = { confirm: 'Nod', next: 'Nod right', undo: 'Nod left' };

/** Fixed-width status of the sensor link. Never blocks anything — buttons always work. */
function SensorChip({ sensors, now, onClick }: { sensors: SensorStatus; now: number; onClick: () => void }) {
  let tone = 'off';
  let text = 'Sensors off';
  if (sensors.enabled) {
    const faults = Object.keys(sensors.faults);
    if (sensors.link === 'live' && faults.length) {
      tone = 'warn';
      text = `Sensor ${faults.join(', ')} fault`;
    } else if (sensors.link === 'live') {
      tone = 'live';
      text = sensors.source === 'replay' ? 'Sensors · replay' : 'Sensors · live';
    } else if (sensors.link === 'connecting') {
      tone = 'wait';
      text = 'Sensors · connecting';
    } else {
      tone = 'warn';
      text = 'Sensors unavailable';
    }
    const g = sensors.lastGesture;
    if (g && now - g.at < 2500) text = `${GESTURE_NAMES[g.action] ?? g.action} → ${g.outcome}`;
  }
  return (
    <button className={`sensor-chip is-${tone}`} onClick={onClick} title="Sensor connection (opens Help)" aria-live="polite">
      <span className="sensor-dot" aria-hidden />
      <span className="sensor-text">{text}</span>
    </button>
  );
}
