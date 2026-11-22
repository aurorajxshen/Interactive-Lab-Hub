import { useEffect, useRef, useState } from 'react';
import type { MicroAction } from '../config/recipeConfig';
import type { ClassifierId } from '../config/recipeConfig';
import { motionElapsedMs, timerElapsedMs, type MicroProgress } from '../state/recipeState';
import { fmtClock } from './hooks';

export const classifierLabels: Record<ClassifierId, string> = {
  CHOPPING: 'Chopping',
  TWISTING: 'Twisting',
  WHISKING: 'Whisking',
  POURING: 'Pouring',
  FLIPPING: 'Flipping',
};

interface Props {
  micro: MicroAction;
  progress: MicroProgress;
  now: number;
  liveActive: boolean;
  liveIntensity: number;
  paused: boolean;
}

/** Little scrolling pencil line of recent intensity */
function Squiggle({ active, intensity }: { active: boolean; intensity: number }) {
  const [vals, setVals] = useState<number[]>(() => Array(36).fill(0));
  const ref = useRef({ active, intensity });
  ref.current = { active, intensity };
  useEffect(() => {
    const t = setInterval(() => {
      setVals((v) => [...v.slice(1), ref.current.active ? ref.current.intensity * (0.6 + Math.random() * 0.4) : 0]);
    }, 120);
    return () => clearInterval(t);
  }, []);
  const d = vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${i * 4},${16 - v * 13 * (i % 2 ? 1 : -1)}`).join(' ');
  return (
    <svg className="squiggle" viewBox="0 0 140 32" aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Motion feedback beneath the illustration. It reports movement (previewed
 * now, sensed later); it never states that the cooking task is complete.
 */
export function MotionFeedback({ micro, progress, now, liveActive, liveIntensity, paused }: Props) {
  const cls = micro.classifier;
  const listening = !!cls;
  const active = liveActive && !paused;

  let metric: React.ReactNode = null;
  let caption = '';

  switch (micro.kind) {
    case 'counter': {
      metric = (
        <div className="metric">
          <div className="count-dots" aria-label={`${progress.count} of ${micro.target} ${micro.unitPlural}`}>
            {Array.from({ length: micro.target }, (_, i) => (
              <span key={i} className={`count-dot ${i < progress.count ? 'is-filled' : ''}`} />
            ))}
          </div>
          <span className="metric-value">
            {progress.count}
            <span className="metric-unit">/{micro.target} {micro.unitPlural}</span>
          </span>
        </div>
      );
      caption = cls ? 'Twisting is shown as feedback only — each counted twist is yours.' : `You count each ${micro.unit}; the dots just keep track.`;
      break;
    }
    case 'activeDuration': {
      const sec = motionElapsedMs(progress.motion, now) / 1000;
      const target = micro.targetSec + progress.extraTargetSec;
      metric = (
        <div className="metric">
          <div className="bar" aria-hidden>
            <span style={{ width: `${Math.min(100, (sec / target) * 100)}%` }} />
          </div>
          <span className="metric-value">
            {Math.floor(sec)}
            <span className="metric-unit">
              {' '}
              s active · ref {micro.maxSec ? `${micro.targetSec}–${micro.maxSec}` : Math.round(target)} s
            </span>
          </span>
        </div>
      );
      caption = progress.motion.segments > 1 ? `Resumed ${progress.motion.segments - 1}× — only moving time is counted.` : 'Only time spent moving is counted.';
      break;
    }
    case 'timer': {
      const sec = timerElapsedMs(progress.timer, now) / 1000;
      const max = micro.maxSec + progress.timer.extraSec;
      const past = sec >= micro.minSec;
      metric = (
        <div className="metric">
          <div className="bar is-timer" aria-hidden>
            <span style={{ width: `${Math.min(100, (sec / max) * 100)}%` }} />
            <i style={{ left: `${(micro.minSec / max) * 100}%` }} />
          </div>
          <span className="metric-value">
            {fmtClock(sec)}
            <span className="metric-unit">
              {' '}
              · ref {micro.minSec}–{max} s
            </span>
          </span>
        </div>
      );
      caption = past ? 'Reference reached — check the cues. The timer does not decide doneness.' : progress.timer.runningSince ? 'Timer running. Watch the pan, not the clock.' : 'Timer paused.';
      break;
    }
    case 'motion': {
      const sec = motionElapsedMs(progress.motion, now) / 1000;
      metric = (
        <div className="metric">
          <span className="metric-value">
            {Math.floor(sec)}
            <span className="metric-unit"> s of {cls ? classifierLabels[cls].toLowerCase() : 'motion'} seen</span>
          </span>
        </div>
      );
      caption = cls === 'CHOPPING' ? 'Motion shows you are chopping — not how much is chopped. You decide when it is enough.' : cls === 'FLIPPING' ? 'A flip motion can be recognised, but you confirm it actually flipped.' : 'Motion is feedback. You confirm when it is done.';
      break;
    }
    case 'check': {
      if (cls) {
        // e.g. salt/pepper twisting: movement is shown, never counted or used as a quantity
        const sec = motionElapsedMs(progress.motion, now) / 1000;
        metric = (
          <div className="metric">
            <span className="metric-value">
              {Math.floor(sec)}
              <span className="metric-unit"> s of {classifierLabels[cls].toLowerCase()} seen</span>
            </span>
          </div>
        );
        caption = 'Movement is feedback only — it does not count twists or measure seasoning. You confirm when it is in.';
      } else caption = 'Nothing to track here — just your confirmation.';
      break;
    }
    case 'toolReturn':
      caption = 'Safety check-in. Sensors and the screen cannot see where a tool is resting — only you can.';
      break;
  }

  return (
    <section className={`feedback ${active ? 'is-active' : ''}`} aria-live="polite">
      <div className="feedback-sensor">
        {listening ? (
          <>
            <span className={`live-dot ${active ? 'is-on' : ''}`} aria-hidden />
            <div>
              <div className="feedback-label">
                {paused ? 'Paused' : active ? `${classifierLabels[cls!]} · movement seen` : `${classifierLabels[cls!]} — no motion yet`}
              </div>
              <Squiggle active={active} intensity={liveIntensity} />
            </div>
          </>
        ) : (
          <>
            <span className="live-dot is-idle" aria-hidden />
            <div className="feedback-label">{micro.kind === 'timer' ? 'Timer — watch the pan' : micro.kind === 'toolReturn' ? 'Tool check-in' : 'No movement needed'}</div>
          </>
        )}
      </div>
      <div className="feedback-metric">{metric}</div>
      <p className="feedback-caption">{caption}</p>
    </section>
  );
}
