import { AnimatePresence, motion } from 'framer-motion';
import { recipeConfig } from '../config/recipeConfig';
import { interactionConfig } from '../config/interactionConfig';
import { sceneRegistry } from '../illustrations/scenes';
import { motionElapsedMs, timerElapsedMs, isViewingActive, isRecipeComplete } from '../state/recipeState';
import type { CookingSession } from '../state/useCookingSession';
import { Header } from '../components/Header';
import { MotionFeedback } from '../components/MotionFeedback';
import { MicroTrail } from '../components/MicroTrail';
import { InspectionPrompt } from '../components/InspectionPrompt';
import { Controls } from '../components/Controls';

interface Props {
  session: CookingSession;
  now: number;
  reduced: boolean;
  onToggleReduced: () => void;
  onHelp: () => void;
}

export function CookingScreen({ session, now, reduced, onToggleReduced, onHelp }: Props) {
  const { state, act, confirm, motionOn, toggleMotion } = session;
  const viewing = state.viewedStep;
  const step = recipeConfig.steps[viewing];
  const previewing = !isViewingActive(state);
  const finished = isRecipeComplete(state);
  const microStates = step.micro.map((m) => state.micro[m.id]);
  const stepDone = microStates.every((p) => p.status === 'done' || p.status === 'skipped');

  // the micro-action that matters on the viewed step
  const microIndex = viewing === state.active.step ? state.active.micro : viewing < state.active.step ? step.micro.length - 1 : 0;
  const micro = step.micro[microIndex];
  const progress = microStates[microIndex];

  const elapsedSec = previewing ? 0 : micro.kind === 'timer' ? timerElapsedMs(progress.timer, now) / 1000 : motionElapsedMs(progress.motion, now) / 1000;
  const live = { active: !previewing && motionOn && !state.paused, intensity: interactionConfig.previewIntensity };

  const Scene = sceneRegistry[step.scene];
  const inspection = micro.kind === 'activeDuration' ? micro.inspection : undefined;
  const showInspection = !previewing && !!inspection && progress.inspectionOpen;
  const instruction = previewing || stepDone ? step.intro : micro.instruction;
  const ease = { duration: reduced ? 0 : 0.42, ease: [0.3, 0.7, 0.4, 1] as const };

  return (
    <div className={`cooking ${micro.safety && !previewing && !stepDone ? `is-${micro.safety}` : ''}`}>
      <Header state={state} onViewStep={(i) => act({ type: 'VIEW_STEP', index: i })} reduced={reduced} onToggleReduced={onToggleReduced} />

      {previewing && (
        <div className="banner">
          <span>
            Looking at step {viewing + 1}. You’re still on step {state.active.step + 1}: {recipeConfig.steps[state.active.step].title.toLowerCase()}.
          </span>
          <button className="text-btn" onClick={() => act({ type: 'RETURN_TO_ACTIVE' })}>
            Back to current step
          </button>
          {!finished && (
            <button className="text-btn is-muted" onClick={() => act({ type: 'JUMP_TO_VIEWED', now: Date.now() })}>
              {viewing > state.active.step ? 'Skip ahead to here' : 'Redo this step'}
            </button>
          )}
        </div>
      )}
      {state.paused && <div className="banner is-paused">Paused. Timers are stopped. Press P or Resume to continue.</div>}

      <main className="stage">
        <AnimatePresence mode="wait">
          <motion.section key={step.id} className="step-text" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={ease}>
            <div className="step-number" aria-hidden>
              {String(viewing + 1).padStart(2, '0')}
            </div>
            <div>
              <h1 className="step-title">{step.title}</h1>
              <AnimatePresence mode="wait">
                <motion.p key={`${micro.id}-${previewing}-${stepDone}`} className="step-instruction" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.3 }}>
                  {instruction}
                </motion.p>
              </AnimatePresence>
              <MicroTrail step={step} states={microStates} currentIndex={previewing ? -1 : microIndex} />
            </div>
          </motion.section>
        </AnimatePresence>

        <div className="illustration-wrap">
          {micro.guidance && !stepDone && (micro.guidance.quantity || micro.guidance.time) && (
            <aside className="guidance">
              {micro.guidance.quantity && <span className="guidance-qty">{micro.guidance.quantity}</span>}
              {micro.guidance.time && <span className="guidance-time">{micro.guidance.time}</span>}
              {micro.guidance.note && <span className="guidance-note">{micro.guidance.note}</span>}
            </aside>
          )}
          <AnimatePresence mode="wait">
            <motion.div key={step.id} className="illustration" initial={{ opacity: 0, scale: 0.985 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={ease}>
              <Scene step={step} microIndex={microIndex} microStates={microStates} live={live} elapsedSec={elapsedSec} stepDone={stepDone} finale={state.finale} reduced={reduced} preview={previewing} />
            </motion.div>
          </AnimatePresence>
          {showInspection && inspection && (
            <InspectionPrompt
              inspection={inspection}
              elapsedSec={elapsedSec}
              targetSec={(micro.kind === 'activeDuration' ? micro.targetSec : 0) + progress.extraTargetSec}
              onChoose={(id) => act({ type: 'CHOOSE_BRANCH', now: Date.now(), optionId: id, source: 'click' })}
              onClose={() => act({ type: 'CLOSE_INSPECTION' })}
            />
          )}
          {micro.kind === 'timer' && !previewing && !stepDone && micro.cues.length > 0 && (
            <ul className="cues" aria-label="What to check">
              {micro.cues.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          )}
        </div>

        {!previewing && !stepDone && (
          <MotionFeedback micro={micro} progress={progress} now={now} liveActive={live.active} liveIntensity={live.intensity} paused={state.paused} />
        )}
        {step.safetyNote && !previewing && !stepDone && micro.safety && <p className="safety-note">{step.safetyNote}</p>}
        {finished && (
          <div className="finale-cta">
            <button className="confirm" onClick={session.finish}>
              Open my Recipe Memory
            </button>
          </div>
        )}
      </main>

      <AnimatePresence>
        {state.notice && (
          <motion.div key={state.notice.id} className={`notice is-${state.notice.tone}`} role="status" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.3 }}>
            {state.notice.text}
          </motion.div>
        )}
      </AnimatePresence>

      <Controls
        micro={previewing ? undefined : micro}
        progress={previewing ? undefined : progress}
        previewing={previewing}
        paused={state.paused}
        canUndo={state.undo.length > 0}
        atFirst={viewing === 0}
        atLast={viewing === recipeConfig.steps.length - 1}
        finished={finished}
        onConfirm={() => confirm('click')}
        onIncrement={(d) => act({ type: 'INCREMENT', now: Date.now(), delta: d, source: 'click' })}
        onPrev={() => act({ type: 'NAV', dir: -1 })}
        onNext={() => act({ type: 'NAV', dir: 1 })}
        onUndo={() => act({ type: 'UNDO', now: Date.now() })}
        onPause={() => act({ type: 'TOGGLE_PAUSE', now: Date.now() })}
        onSkip={() => act({ type: 'SKIP_MICRO', now: Date.now() })}
        onHelp={onHelp}
        onExtend={() => act({ type: 'EXTEND_TIMER', now: Date.now() })}
        onReset={() => act({ type: 'RESET_MICRO', now: Date.now() })}
        onReturn={() => act({ type: 'RETURN_TO_ACTIVE' })}
        motionOn={motionOn}
        onToggleMotion={toggleMotion}
      />
    </div>
  );
}
