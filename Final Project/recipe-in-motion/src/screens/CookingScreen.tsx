import { useEffect, useRef, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { accentColors, helperFor, recipeConfig, speechFor, stateHelpers, stepOfMicro } from '../config/recipeConfig';
import { interactionConfig } from '../config/interactionConfig';
import { sceneRegistry } from '../illustrations/scenes';
import { motionElapsedMs, timerElapsedMs, isViewingActive, isRecipeComplete } from '../state/recipeState';
import type { CookingSession } from '../state/useCookingSession';
import type { VoiceGuidance } from '../voice/useVoiceGuidance';
import type { SensorStatus } from '../sensors/useSensorBridge';
import { Header } from '../components/Header';
import { MotionFeedback } from '../components/MotionFeedback';
import { MicroTrail } from '../components/MicroTrail';
import { InspectionPrompt } from '../components/InspectionPrompt';
import { Controls } from '../components/Controls';
import { GuidancePanel } from '../components/GuidancePanel';
import { TaskCompleteMark, completionText } from '../components/TaskCompleteMark';

interface Props {
  session: CookingSession;
  now: number;
  reduced: boolean;
  onToggleReduced: () => void;
  onHelp: () => void;
  voice: VoiceGuidance;
  /** Lets the global V shortcut play/stop the current guidance */
  voiceToggleRef: { current: (() => void) | null };
  sensors: SensorStatus;
}

/**
 * Stable named regions (see .cooking / .stage in styles.css):
 *   header · status · heading · art · guide · feedback · controls
 * Every region has reserved space, so copy length or micro-action type never
 * moves the illustration, the guidance panel or the confirm button.
 */
export function CookingScreen({ session, now, reduced, onToggleReduced, onHelp, voice, voiceToggleRef, sensors }: Props) {
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
  const showActive = !previewing && !stepDone;

  const elapsedSec = previewing ? 0 : micro.kind === 'timer' ? timerElapsedMs(progress.timer, now) / 1000 : motionElapsedMs(progress.motion, now) / 1000;
  // movement comes from the preview button or from the sensor bridge (both land in the motion record)
  const sensing = !previewing && progress.motion.activeSince !== null;
  const live = { active: !previewing && (motionOn || sensing) && !state.paused, intensity: interactionConfig.previewIntensity };

  const Scene = sceneRegistry[step.scene];
  const inspection = micro.kind === 'activeDuration' ? micro.inspection : undefined;
  const showInspection = !previewing && !!inspection && progress.inspectionOpen;
  const ease = { duration: reduced ? 0 : 0.42, ease: [0.3, 0.7, 0.4, 1] as const };

  /* ── guidance copy (one source, one place) ── */
  const mode = previewing ? 'preview' : stepDone ? 'done' : 'active';
  const guidance = showActive ? micro.guidance : { instruction: step.intro };
  const kicker = previewing
    ? `Looking ahead · step ${viewing + 1}`
    : stepDone
      ? 'Step complete'
      : `Action ${microIndex + 1} of ${step.micro.length} · ${micro.label}${micro.optional ? ' (optional)' : ''}`;
  const speech = showActive ? speechFor(micro) : `${step.title}. ${step.intro}`;
  const speechKey = `${viewing}:${micro.id}:${mode}`;

  /* ── helper label above the confirm button ── */
  const memoryReady = finished && (!state.lastCompleted || now - state.lastCompleted.at >= interactionConfig.completeMarkMs);
  const helper = previewing
    ? stateHelpers.previewing
    : finished
      ? memoryReady
        ? stateHelpers.finished
        : stateHelpers.finishing
      : state.paused
        ? stateHelpers.paused
        : showInspection
          ? stateHelpers.inspection
          : helperFor(micro);

  /* ── voice: cancel on change / pause / unmount; optional auto-read never fires on first render ── */
  const firstKey = useRef(true);
  const { stop, speak, autoRead } = voice;
  useEffect(() => {
    stop();
    if (firstKey.current) {
      firstKey.current = false;
      return;
    }
    if (autoRead && mode === 'active' && !state.paused) speak(speech, speechKey);
    // speech text is derived from speechKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speechKey]);
  useEffect(() => {
    if (state.paused) stop();
  }, [state.paused, stop]);
  useEffect(() => () => stop(), [stop]);
  useEffect(() => {
    voiceToggleRef.current = () => voice.toggle(speech, speechKey);
    return () => {
      voiceToggleRef.current = null;
    };
  });

  const markStep = state.lastCompleted ? stepOfMicro(state.lastCompleted.microId) : undefined;
  const markColor = accentColors[(markStep ?? step).accent];
  const safetyClass = showActive && micro.safety ? `is-${micro.safety}` : '';

  return (
    <div className={`cooking ${safetyClass}`} style={{ '--accent': accentColors[step.accent] } as CSSProperties}>
      <Header state={state} onViewStep={(i) => act({ type: 'VIEW_STEP', index: i })} reduced={reduced} onToggleReduced={onToggleReduced} onHelp={onHelp} sensors={sensors} now={now} />

      {/* Reserved status row: look-ahead / pause banners and transient notices never overlap content */}
      <div className="status-row">
        {previewing ? (
          <div className="banner">
            <span>
              Looking at step {viewing + 1}. You’re still on step {state.active.step + 1}: {recipeConfig.steps[state.active.step].title.toLowerCase()}.
            </span>
            {!finished && (
              <button className="text-btn is-muted" onClick={() => act({ type: 'JUMP_TO_VIEWED', now: Date.now() })}>
                {viewing > state.active.step ? 'Skip ahead to here' : 'Redo this step'}
              </button>
            )}
          </div>
        ) : state.paused ? (
          <div className="banner is-paused">Paused. Timers are stopped. Press P or Resume to continue.</div>
        ) : null}
        <AnimatePresence>
          {state.notice && (
            <motion.div key={state.notice.id} className={`notice is-${state.notice.tone}`} role="status" initial={{ opacity: 0, y: reduced ? 0 : -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.25 }}>
              {state.notice.text}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <main className="stage">
        <section className="region-heading">
          <div className="step-number" aria-hidden>
            {String(viewing + 1).padStart(2, '0')}
          </div>
          <div className="heading-text">
            <h1 className="step-title">{step.title}</h1>
            <MicroTrail step={step} states={microStates} currentIndex={previewing ? -1 : microIndex} />
          </div>
        </section>

        <section className="region-art" aria-label="Illustration">
          <div className="measure" aria-hidden={!showActive}>
            {showActive && micro.measure?.quantity && <span className="measure-qty">{micro.measure.quantity}</span>}
            {showActive && micro.measure?.time && <span className="measure-time">{micro.measure.time}</span>}
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={step.id} className="illustration" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={ease}>
              <Scene step={step} microIndex={microIndex} microStates={microStates} live={live} elapsedSec={elapsedSec} stepDone={stepDone} finale={state.finale} reduced={reduced} preview={previewing} />
            </motion.div>
          </AnimatePresence>
          {showInspection && inspection && (
            <InspectionPrompt
              inspection={inspection}
              elapsedSec={elapsedSec}
              targetSec={(micro.kind === 'activeDuration' ? micro.targetSec : 0) + progress.extraTargetSec}
              reduced={reduced}
              onChoose={(id) => act({ type: 'CHOOSE_BRANCH', now: Date.now(), optionId: id, source: 'click' })}
              onClose={() => act({ type: 'CLOSE_INSPECTION' })}
            />
          )}
        </section>

        <div className="region-guide">
          <GuidancePanel
            kicker={kicker}
            guidance={guidance}
            cues={showActive && micro.kind === 'timer' ? micro.cues : undefined}
            toolReturn={showActive && micro.kind === 'toolReturn'}
            speech={speech}
            speechKey={speechKey}
            voice={voice}
            tone={showActive ? 'default' : 'muted'}
          />
        </div>

        <div className="region-feedback">
          {showActive ? (
            <MotionFeedback micro={micro} progress={progress} now={now} liveActive={live.active} liveIntensity={live.intensity} paused={state.paused} />
          ) : (
            <section className="feedback is-placeholder">
              <p className="feedback-caption">{finished ? 'All eight steps are done. Nothing here measured doneness — you did.' : previewing ? 'Motion and timer feedback appear when you reach this step.' : 'This step is done.'}</p>
            </section>
          )}
        </div>
      </main>

      <Controls
        micro={previewing ? undefined : micro}
        progress={previewing ? undefined : progress}
        helper={helper}
        mark={<TaskCompleteMark completion={state.lastCompleted} now={now} color={markColor} reduced={reduced} />}
        completionText={completionText(state.lastCompleted, now)}
        previewing={previewing}
        paused={state.paused}
        canUndo={state.undo.length > 0}
        atFirst={viewing === 0}
        atLast={viewing === recipeConfig.steps.length - 1}
        finished={finished}
        memoryReady={memoryReady}
        onConfirm={() => confirm('click')}
        onIncrement={(d) => act({ type: 'INCREMENT', now: Date.now(), delta: d, source: 'click' })}
        onPrev={() => act({ type: 'NAV', dir: -1 })}
        onNext={() => act({ type: 'NAV', dir: 1 })}
        onUndo={() => act({ type: 'UNDO', now: Date.now() })}
        onPause={() => act({ type: 'TOGGLE_PAUSE', now: Date.now() })}
        onSkip={() => act({ type: 'SKIP_MICRO', now: Date.now() })}
        onExtend={() => act({ type: 'EXTEND_TIMER', now: Date.now() })}
        onReset={() => act({ type: 'RESET_MICRO', now: Date.now() })}
        onReturn={() => act({ type: 'RETURN_TO_ACTIVE' })}
        onOpenMemory={session.finish}
        motionOn={motionOn}
        onToggleMotion={toggleMotion}
      />
    </div>
  );
}
