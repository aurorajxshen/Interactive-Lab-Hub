/**
 * recipeState — pure reducer for the cooking session.
 *
 * Deliberately separates:
 *  - progress pointer (`active`)  → which micro-action the cook is actually on
 *  - viewed step (`viewedStep`)   → navigation only; looking ahead never completes anything
 *  - per-micro progress           → counts, active-motion durations, timers, branch outcomes
 *  - pause / notices / undo history
 * Motion (the MOTION action — fed by the on-screen motion preview now, and by
 * sensor routes later) only updates motion records; only CONFIRM / INCREMENT /
 * CHOOSE_BRANCH / SKIP (deliberate user actions) move progress forward.
 */
import { recipeConfig, microAt, doneLabelFor, allMicroActions, type MicroAction, type ClassifierId } from '../config/recipeConfig';
import { interactionConfig } from '../config/interactionConfig';

export type Phase = 'welcome' | 'prep' | 'cooking' | 'memory';
export type MicroStatus = 'pending' | 'active' | 'done' | 'skipped';
/** 'gesture' is reserved for the head-sensor route */
export type ConfirmSource = 'click' | 'key' | 'gesture';

export interface MotionRecord {
  accumulatedMs: number;
  activeSince: number | null;
  segments: number;
  samples: number[];
}

export interface TimerRecord {
  accumulatedMs: number;
  runningSince: number | null;
  extraSec: number;
}

export interface MicroProgress {
  status: MicroStatus;
  count: number;
  motion: MotionRecord;
  timer: TimerRecord;
  inspectionOpen: boolean;
  extraTargetSec: number;
  outcomes: string[];
  startedAt: number | null;
  completedAt: number | null;
  earlyConfirmAt: number | null;
}

export type TimelineType =
  | 'start'
  | 'confirm'
  | 'tool-return'
  | 'count'
  | 'skip'
  | 'branch'
  | 'undo'
  | 'step-complete'
  | 'jump'
  | 'pause'
  | 'resume'
  | 'reset'
  | 'finish';

export interface TimelineEntry {
  t: number;
  type: TimelineType;
  stepId: string;
  microId?: string;
  label: string;
  source?: ConfirmSource;
}

export type NoticeTone = 'info' | 'warn' | 'success';
export interface Notice {
  id: number;
  text: string;
  tone: NoticeTone;
}

interface Snapshot {
  active: { step: number; micro: number };
  viewedStep: number;
  micro: Record<string, MicroProgress>;
  log: TimelineEntry[];
  finale: boolean;
  finishedAt: number | null;
}

/** Stamp of the most recent real transition to `done` (drives the task-complete mark) */
export interface Completion {
  microId: string;
  at: number;
  label: string;
}

export interface RecipeState {
  phase: Phase;
  startedAt: number | null;
  finishedAt: number | null;
  active: { step: number; micro: number };
  viewedStep: number;
  micro: Record<string, MicroProgress>;
  paused: boolean;
  pausedAt: number | null;
  pausedTotalMs: number;
  lastConfirmAt: number;
  log: TimelineEntry[];
  undo: Snapshot[];
  notice: Notice | null;
  /** Plating celebration is playing */
  finale: boolean;
  /** Set only when a micro-action becomes `done`; cleared by undo. Not part of undo snapshots. */
  lastCompleted: Completion | null;
}

export type RecipeAction =
  | { type: 'GO_PREP' }
  | { type: 'GO_WELCOME' }
  | { type: 'START_COOKING'; now: number }
  | { type: 'CONFIRM'; now: number; source: ConfirmSource }
  | { type: 'INCREMENT'; now: number; delta: 1 | -1; source: ConfirmSource }
  | { type: 'CHOOSE_BRANCH'; now: number; optionId: string; source: ConfirmSource }
  | { type: 'OPEN_INSPECTION'; now: number }
  | { type: 'CLOSE_INSPECTION' }
  | { type: 'SKIP_MICRO'; now: number }
  | { type: 'NAV'; dir: 1 | -1 }
  | { type: 'VIEW_STEP'; index: number }
  | { type: 'RETURN_TO_ACTIVE' }
  | { type: 'JUMP_TO_VIEWED'; now: number }
  | { type: 'UNDO'; now: number }
  | { type: 'TOGGLE_PAUSE'; now: number }
  | { type: 'RESET_MICRO'; now: number }
  | { type: 'EXTEND_TIMER'; now: number }
  | { type: 'MOTION'; now: number; classifier: ClassifierId; signal: 'active' | 'stopped' | 'sample'; intensity: number }
  | { type: 'NOTICE'; text: string; tone?: NoticeTone }
  | { type: 'DISMISS_NOTICE'; id: number }
  | { type: 'FINISH'; now: number }
  | { type: 'RESTART' };

/* ───────────────────────── helpers ───────────────────────── */

const emptyMotion = (): MotionRecord => ({ accumulatedMs: 0, activeSince: null, segments: 0, samples: [] });
const emptyTimer = (): TimerRecord => ({ accumulatedMs: 0, runningSince: null, extraSec: 0 });
const emptyProgress = (): MicroProgress => ({
  status: 'pending',
  count: 0,
  motion: emptyMotion(),
  timer: emptyTimer(),
  inspectionOpen: false,
  extraTargetSec: 0,
  outcomes: [],
  startedAt: null,
  completedAt: null,
  earlyConfirmAt: null,
});

let noticeSeq = 1;

export function initialRecipeState(): RecipeState {
  const micro: Record<string, MicroProgress> = {};
  recipeConfig.steps.forEach((s) => s.micro.forEach((m) => (micro[m.id] = emptyProgress())));
  return {
    phase: 'welcome',
    startedAt: null,
    finishedAt: null,
    active: { step: 0, micro: 0 },
    viewedStep: 0,
    micro,
    paused: false,
    pausedAt: null,
    pausedTotalMs: 0,
    lastConfirmAt: 0,
    log: [],
    undo: [],
    notice: null,
    finale: false,
    lastCompleted: null,
  };
}

export function motionElapsedMs(m: MotionRecord, now: number) {
  return m.accumulatedMs + (m.activeSince ? now - m.activeSince : 0);
}
export function timerElapsedMs(t: TimerRecord, now: number) {
  return t.accumulatedMs + (t.runningSince ? now - t.runningSince : 0);
}

export function activeMicro(s: RecipeState): MicroAction | undefined {
  return microAt(s.active.step, s.active.micro);
}

export function isViewingActive(s: RecipeState) {
  return s.viewedStep === s.active.step;
}

export function isRecipeComplete(s: RecipeState) {
  return s.finishedAt !== null;
}

function withNotice(s: RecipeState, text: string, tone: NoticeTone = 'info'): RecipeState {
  return { ...s, notice: { id: noticeSeq++, text, tone } };
}

function snapshot(s: RecipeState): Snapshot {
  return {
    active: s.active,
    viewedStep: s.viewedStep,
    micro: s.micro,
    log: s.log,
    finale: s.finale,
    finishedAt: s.finishedAt,
  };
}

function pushUndo(s: RecipeState): RecipeState {
  const undo = [...s.undo, snapshot(s)].slice(-interactionConfig.undoDepth);
  return { ...s, undo };
}

function stepIdOf(stepIndex: number) {
  return recipeConfig.steps[stepIndex]?.id ?? 'unknown';
}

function addLog(s: RecipeState, e: Omit<TimelineEntry, 'stepId'> & { stepId?: string }): RecipeState {
  return { ...s, log: [...s.log, { stepId: stepIdOf(s.active.step), ...e }] };
}

function patchMicro(s: RecipeState, id: string, patch: Partial<MicroProgress>): RecipeState {
  return { ...s, micro: { ...s.micro, [id]: { ...s.micro[id], ...patch } } };
}

/** Stop the clocks of one micro-action (flush running time into accumulated) */
function flushMicro(p: MicroProgress, now: number): MicroProgress {
  return {
    ...p,
    motion: p.motion.activeSince
      ? { ...p.motion, accumulatedMs: p.motion.accumulatedMs + (now - p.motion.activeSince), activeSince: null }
      : p.motion,
    timer: p.timer.runningSince
      ? { ...p.timer, accumulatedMs: p.timer.accumulatedMs + (now - p.timer.runningSince), runningSince: null }
      : p.timer,
  };
}

/** A pending timer whose `clockFrom` action is already confirmed keeps running in the background */
function isPreStarted(s: RecipeState, def: MicroAction) {
  return def.kind === 'timer' && !!def.clockFrom && s.micro[def.clockFrom]?.status === 'done' && s.micro[def.id].status === 'pending';
}

/** Start the clocks of timers that begin when `sourceId` is confirmed */
function startDependentTimers(s: RecipeState, sourceId: string, now: number): RecipeState {
  let next = s;
  allMicroActions.forEach((m) => {
    if (m.kind !== 'timer' || m.clockFrom !== sourceId) return;
    const p = next.micro[m.id];
    if (p.status !== 'pending' || p.timer.runningSince || p.timer.accumulatedMs) return;
    next = patchMicro(next, m.id, { timer: { ...p.timer, runningSince: s.paused ? null : now } });
  });
  return next;
}

function activate(s: RecipeState, stepIndex: number, microIndex: number, now: number): RecipeState {
  const def = microAt(stepIndex, microIndex);
  if (!def) return s;
  const prev = s.micro[def.id];
  const timer =
    def.kind === 'timer' && !s.paused && !prev.timer.runningSince ? { ...prev.timer, runningSince: now } : prev.timer;
  let next: RecipeState = {
    ...s,
    active: { step: stepIndex, micro: microIndex },
    micro: { ...s.micro, [def.id]: { ...prev, status: 'active', startedAt: prev.startedAt ?? now, timer } },
  };
  next = addLog(next, { t: now, type: 'start', microId: def.id, label: `Started ${def.label}`, stepId: stepIdOf(stepIndex) });
  return next;
}

/** Complete (or skip) the active micro-action and move the progress pointer on */
function advance(s: RecipeState, now: number, status: 'done' | 'skipped', source?: ConfirmSource): RecipeState {
  const def = activeMicro(s);
  if (!def) return s;
  const followView = s.viewedStep === s.active.step;
  let next = patchMicro(s, def.id, {
    ...flushMicro(s.micro[def.id], now),
    status,
    completedAt: now,
    inspectionOpen: false,
    earlyConfirmAt: null,
  });
  if (status === 'done') {
    next = { ...next, lastCompleted: { microId: def.id, at: now, label: doneLabelFor(def) } };
    next = startDependentTimers(next, def.id, now);
  }
  next = addLog(next, {
    t: now,
    type: status === 'done' ? (def.kind === 'toolReturn' ? 'tool-return' : 'confirm') : 'skip',
    microId: def.id,
    label: status === 'done' ? doneLabelFor(def) : `Skipped ${def.label}`,
    source,
  });
  const step = recipeConfig.steps[s.active.step];
  const isLastMicro = s.active.micro >= step.micro.length - 1;
  if (!isLastMicro) {
    next = activate(next, s.active.step, s.active.micro + 1, now);
  } else {
    next = addLog(next, { t: now, type: 'step-complete', label: `${step.title} — done` });
    const isLastStep = s.active.step >= recipeConfig.steps.length - 1;
    if (isLastStep) {
      next = addLog({ ...next, finishedAt: now, finale: true }, { t: now, type: 'finish', label: 'Pancake plated' });
      return next;
    }
    next = activate(next, s.active.step + 1, 0, now);
  }
  if (followView) next = { ...next, viewedStep: next.active.step };
  return next;
}

/** Guard used by every deliberate progress action */
function guardProgress(s: RecipeState, now: number): RecipeState | null {
  if (s.phase !== 'cooking') return s;
  if (isRecipeComplete(s)) return s;
  if (!isViewingActive(s)) {
    return withNotice(
      s,
      `You're looking at step ${s.viewedStep + 1}. Tap “Back to current step” to continue step ${s.active.step + 1}.`,
      'warn',
    );
  }
  if (s.paused) return withNotice(s, 'Paused — resume to continue.', 'warn');
  if (now - s.lastConfirmAt < interactionConfig.confirmDebounceMs) return s; // duplicate confirmation, swallow silently
  return null;
}

function targetSecOf(def: MicroAction, p: MicroProgress) {
  return def.kind === 'activeDuration' ? def.targetSec + p.extraTargetSec : 0;
}

/* ───────────────────────── reducer ───────────────────────── */

export function recipeReducer(s: RecipeState, a: RecipeAction): RecipeState {
  switch (a.type) {
    case 'GO_PREP':
      return { ...s, phase: 'prep' };
    case 'GO_WELCOME':
      return { ...s, phase: 'welcome' };

    case 'START_COOKING': {
      if (s.phase === 'cooking') return s;
      const fresh = { ...initialRecipeState(), phase: 'cooking' as Phase, startedAt: a.now };
      return activate(fresh, 0, 0, a.now);
    }

    case 'CONFIRM': {
      const blocked = guardProgress(s, a.now);
      if (blocked) return blocked;
      const def = activeMicro(s)!;
      const p = s.micro[def.id];
      const stamped = { ...s, lastConfirmAt: a.now };

      switch (def.kind) {
        case 'check':
        case 'toolReturn':
          // toolReturn = the cook's own confirmation that the tool is resting safely (never sensor-verified)
          return advance(pushUndo(stamped), a.now, 'done', a.source);

        case 'counter': {
          if (p.count < def.target) {
            const n = p.count + 1;
            let next = patchMicro(pushUndo(stamped), def.id, { count: n });
            next = addLog(next, { t: a.now, type: 'count', microId: def.id, label: `${def.label} ${def.unit} ${n}/${def.target}`, source: a.source });
            return withNotice(
              next,
              n < def.target ? `${def.label}: ${n} of ${def.target} ${def.unitPlural}` : `${def.label}: ${n} of ${def.target} — confirm once more to finish`,
              'success',
            );
          }
          return advance(pushUndo(stamped), a.now, 'done', a.source);
        }

        case 'motion':
          return advance(pushUndo(stamped), a.now, 'done', a.source);

        case 'activeDuration': {
          if (def.inspection) {
            // NOD while the check-in is open = the positive answer
            if (p.inspectionOpen) {
              const positive = def.inspection.options.find((o) => o.effect.type === 'complete');
              return recipeReducer(s, { type: 'CHOOSE_BRANCH', now: a.now, optionId: positive!.id, source: a.source });
            }
            const flushed = flushMicro(p, a.now);
            return withNotice(patchMicro(stamped, def.id, { ...flushed, inspectionOpen: true }), 'Take a look at the batter.', 'info');
          }
          return advance(pushUndo(stamped), a.now, 'done', a.source);
        }

        case 'timer': {
          const elapsed = timerElapsedMs(p.timer, a.now) / 1000;
          const early = elapsed < def.minSec;
          if (early && !(p.earlyConfirmAt && a.now - p.earlyConfirmAt < interactionConfig.earlyConfirmWindowMs)) {
            return withNotice(
              patchMicro(stamped, def.id, { earlyConfirmAt: a.now }),
              `Only ${Math.floor(elapsed)} s of the ${def.minSec}–${def.maxSec} s reference. Check the cues — confirm again if you're sure.`,
              'warn',
            );
          }
          return advance(pushUndo(stamped), a.now, 'done', a.source);
        }
      }
      return s;
    }

    case 'INCREMENT': {
      const blocked = guardProgress(s, a.now);
      if (blocked) return blocked;
      const def = activeMicro(s)!;
      if (def.kind !== 'counter') return s;
      const p = s.micro[def.id];
      const n = Math.max(0, Math.min(def.target, p.count + a.delta));
      if (n === p.count) return s;
      let next = patchMicro(pushUndo({ ...s, lastConfirmAt: a.delta > 0 ? a.now : s.lastConfirmAt }), def.id, { count: n });
      next = addLog(next, { t: a.now, type: 'count', microId: def.id, label: `${def.label} ${n}/${def.target}`, source: a.source });
      return next;
    }

    case 'OPEN_INSPECTION': {
      const def = activeMicro(s);
      if (!def || def.kind !== 'activeDuration' || !def.inspection || !isViewingActive(s)) return s;
      const p = s.micro[def.id];
      return patchMicro(s, def.id, { ...flushMicro(p, a.now), inspectionOpen: true });
    }

    case 'CLOSE_INSPECTION': {
      const def = activeMicro(s);
      if (!def) return s;
      return patchMicro(s, def.id, { inspectionOpen: false });
    }

    case 'CHOOSE_BRANCH': {
      const blocked = guardProgress(s, a.now);
      if (blocked) return blocked;
      const def = activeMicro(s);
      if (!def || def.kind !== 'activeDuration' || !def.inspection) return s;
      const opt = def.inspection.options.find((o) => o.id === a.optionId);
      if (!opt) return s;
      let next = pushUndo({ ...s, lastConfirmAt: a.now });
      const p = next.micro[def.id];
      next = patchMicro(next, def.id, { outcomes: [...p.outcomes, opt.id], inspectionOpen: false });
      next = addLog(next, { t: a.now, type: 'branch', microId: def.id, label: `Batter check: ${opt.label}`, source: a.source });
      if (opt.effect.type === 'complete') return advance(next, a.now, 'done', a.source);
      // continue / adjust: extend the reference so the next check-in comes after more whisking
      const elapsedSec = motionElapsedMs(p.motion, a.now) / 1000;
      const newTarget = Math.max(targetSecOf(def, p), elapsedSec) + opt.effect.addSec;
      next = patchMicro(next, def.id, { extraTargetSec: newTarget - def.targetSec });
      return withNotice(
        next,
        opt.effect.type === 'adjust' ? `Add ${opt.effect.note.replace('+', '')}, then whisk ~${opt.effect.addSec} s more.` : `Keep whisking — about ${opt.effect.addSec} s more.`,
        'info',
      );
    }

    case 'SKIP_MICRO': {
      if (s.phase !== 'cooking' || isRecipeComplete(s) || !isViewingActive(s)) return s;
      return advance(pushUndo({ ...s, lastConfirmAt: a.now }), a.now, 'skipped');
    }

    case 'NAV': {
      if (s.phase !== 'cooking') return s;
      const v = Math.max(0, Math.min(recipeConfig.steps.length - 1, s.viewedStep + a.dir));
      return { ...s, viewedStep: v };
    }

    case 'VIEW_STEP':
      if (s.phase !== 'cooking') return s;
      return { ...s, viewedStep: Math.max(0, Math.min(recipeConfig.steps.length - 1, a.index)) };

    case 'RETURN_TO_ACTIVE':
      return { ...s, viewedStep: s.active.step };

    case 'JUMP_TO_VIEWED': {
      // Explicit "skip ahead to this step": every remaining micro-action before it is marked skipped.
      if (s.phase !== 'cooking' || s.viewedStep === s.active.step || isRecipeComplete(s)) return s;
      let next = pushUndo({ ...s, lastConfirmAt: a.now });
      if (s.viewedStep > s.active.step) {
        const target = s.viewedStep;
        while (next.active.step < target && !isRecipeComplete(next)) {
          next = advance({ ...next, viewedStep: next.active.step }, a.now, 'skipped');
        }
      } else {
        // Going back to redo an earlier step: re-open it from its first micro-action
        const target = s.viewedStep;
        const cur = activeMicro(next)!;
        next = patchMicro(next, cur.id, { ...flushMicro(next.micro[cur.id], a.now), status: 'pending' });
        const redo = new Set(recipeConfig.steps[target].micro.map((m) => m.id));
        recipeConfig.steps[target].micro.forEach((m) => {
          next = patchMicro(next, m.id, { ...emptyProgress() });
        });
        // timers whose clock starts from a redone action start fresh too
        allMicroActions.forEach((m) => {
          if (m.kind === 'timer' && m.clockFrom && redo.has(m.clockFrom)) next = patchMicro(next, m.id, { ...emptyProgress() });
        });
        next = activate(next, target, 0, a.now);
      }
      next = addLog({ ...next, viewedStep: next.active.step }, { t: a.now, type: 'jump', label: `Moved to step ${next.active.step + 1}` });
      return next;
    }

    case 'UNDO': {
      if (s.phase !== 'cooking') return s;
      const last = s.undo[s.undo.length - 1];
      if (!last) return withNotice(s, 'Nothing to undo.', 'info');
      // Restore progress only. Running timers keep their original start.
      let restored: RecipeState = {
        ...s,
        ...last,
        undo: s.undo.slice(0, -1),
        lastConfirmAt: a.now,
        lastCompleted: null, // undo removes the completed state — the mark must not linger or replay
      };
      const def = activeMicro(restored);
      if (def) {
        const p = restored.micro[def.id];
        // the active micro-action must be live again (e.g. undoing a timer confirmation)
        const timer =
          def.kind === 'timer' && !s.paused && !p.timer.runningSince ? { ...p.timer, runningSince: a.now } : p.timer;
        restored = patchMicro(restored, def.id, { status: 'active', timer });
      }
      restored = { ...restored, log: [...restored.log, { t: a.now, type: 'undo', stepId: stepIdOf(restored.active.step), label: 'Undo' }] };
      return withNotice(restored, 'Undone.', 'info');
    }

    case 'TOGGLE_PAUSE': {
      if (s.phase !== 'cooking' || isRecipeComplete(s)) return s;
      const def = activeMicro(s);
      if (!s.paused) {
        let next: RecipeState = { ...s, paused: true, pausedAt: a.now };
        if (def) next = patchMicro(next, def.id, flushMicro(s.micro[def.id], a.now));
        // background clocks (e.g. first side started at the pour) pause too
        allMicroActions.forEach((m) => {
          if (isPreStarted(next, m)) next = patchMicro(next, m.id, flushMicro(next.micro[m.id], a.now));
        });
        return addLog(next, { t: a.now, type: 'pause', label: 'Paused' });
      }
      let next: RecipeState = {
        ...s,
        paused: false,
        pausedAt: null,
        pausedTotalMs: s.pausedTotalMs + (s.pausedAt ? a.now - s.pausedAt : 0),
      };
      if (def?.kind === 'timer') {
        const p = s.micro[def.id];
        next = patchMicro(next, def.id, { timer: { ...p.timer, runningSince: a.now } });
      }
      allMicroActions.forEach((m) => {
        if (isPreStarted(next, m)) next = patchMicro(next, m.id, { timer: { ...next.micro[m.id].timer, runningSince: a.now } });
      });
      return addLog(next, { t: a.now, type: 'resume', label: 'Resumed' });
    }

    case 'RESET_MICRO': {
      if (s.phase !== 'cooking' || !isViewingActive(s) || isRecipeComplete(s)) return s;
      const def = activeMicro(s)!;
      let next = pushUndo(s);
      const fresh = emptyProgress();
      next = patchMicro(next, def.id, {
        ...fresh,
        status: 'active',
        startedAt: s.micro[def.id].startedAt,
        timer: def.kind === 'timer' && !s.paused ? { ...fresh.timer, runningSince: a.now } : fresh.timer,
      });
      next = addLog(next, { t: a.now, type: 'reset', microId: def.id, label: `Restarted ${def.label}` });
      return withNotice(next, `${def.label} restarted.`, 'info');
    }

    case 'EXTEND_TIMER': {
      const def = activeMicro(s);
      if (!def || def.kind !== 'timer' || !isViewingActive(s)) return s;
      const p = s.micro[def.id];
      return withNotice(patchMicro(s, def.id, { timer: { ...p.timer, extraSec: p.timer.extraSec + def.extendSec } }), `+${def.extendSec} s added to the reference.`, 'info');
    }

    case 'MOTION': {
      // Entry point for motion input. Only the active micro-action's movement is accepted.
      if (s.phase !== 'cooking' || s.paused || isRecipeComplete(s)) return s;
      const def = activeMicro(s);
      if (!def || def.classifier !== a.classifier) return s;
      const p = s.micro[def.id];
      if (p.inspectionOpen) return s; // the cook is looking at the batter; don't count time
      let motion = p.motion;
      if (a.signal === 'stopped') {
        if (motion.activeSince) motion = { ...motion, accumulatedMs: motion.accumulatedMs + (a.now - motion.activeSince), activeSince: null };
      } else {
        if (!motion.activeSince) motion = { ...motion, activeSince: a.now, segments: motion.segments + 1 };
        if (a.signal === 'sample' && motion.samples.length < interactionConfig.maxSamplesPerMicro) {
          motion = { ...motion, samples: [...motion.samples, a.intensity] };
        }
      }
      let next = patchMicro(s, def.id, { motion });
      // Reaching the reference opens the check-in. It never completes the step.
      if (def.kind === 'activeDuration' && def.inspection && a.signal !== 'stopped') {
        const target = targetSecOf(def, p);
        if (motionElapsedMs(motion, a.now) / 1000 >= target) {
          const flushed = flushMicro({ ...next.micro[def.id] }, a.now);
          next = patchMicro(next, def.id, { ...flushed, inspectionOpen: true });
          next = withNotice(next, `${Math.round(target)} s reached — have a look at the batter.`, 'info');
        }
      }
      return next;
    }

    case 'NOTICE':
      return withNotice(s, a.text, a.tone);

    case 'DISMISS_NOTICE':
      return s.notice?.id === a.id ? { ...s, notice: null } : s;

    case 'FINISH':
      if (!isRecipeComplete(s)) return s;
      return { ...s, phase: 'memory', finale: false };

    case 'RESTART':
      return { ...initialRecipeState(), phase: 'prep' };
  }
}
