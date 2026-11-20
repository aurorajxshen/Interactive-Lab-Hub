/**
 * useCookingSession — the UI's single entry point to recipe state.
 *
 * Motion input currently comes from `motionPreview` (an on-screen toggle that
 * feeds MOTION actions). When sensors are connected, a sensor route will
 * dispatch the same MOTION / CONFIRM / NAV actions and this preview can go.
 */
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { interactionConfig } from '../config/interactionConfig';
import { activeMicro, initialRecipeState, recipeReducer, type ConfirmSource, type RecipeAction, type RecipeState } from './recipeState';
import { buildMemory, saveMemory, type MemoryRecord } from '../memory/recipeMemory';

export function useCookingSession() {
  const [state, dispatch] = useReducer(recipeReducer, undefined, initialRecipeState);
  const stateRef = useRef<RecipeState>(state);
  stateRef.current = state;
  const [memory, setMemory] = useState<MemoryRecord | null>(null);
  const [motionOn, setMotionOn] = useState(false);

  const micro = activeMicro(state);
  const classifier = state.phase === 'cooking' && !state.finale ? micro?.classifier ?? null : null;

  /* ── motion preview: stands in for sensor input ── */
  useEffect(() => {
    if (!motionOn || !classifier) return;
    const c = classifier;
    dispatch({ type: 'MOTION', now: Date.now(), classifier: c, signal: 'active', intensity: interactionConfig.previewIntensity });
    const t = setInterval(() => {
      const intensity = Math.max(0.1, Math.min(1, interactionConfig.previewIntensity + (Math.random() - 0.5) * 0.3));
      dispatch({ type: 'MOTION', now: Date.now(), classifier: c, signal: 'sample', intensity });
    }, interactionConfig.previewSampleMs);
    return () => {
      clearInterval(t);
      dispatch({ type: 'MOTION', now: Date.now(), classifier: c, signal: 'stopped', intensity: 0 });
    };
  }, [motionOn, classifier]);

  // the preview switches itself off when the action changes or a flip burst ends
  useEffect(() => setMotionOn(false), [micro?.id]);
  useEffect(() => {
    if (!motionOn || classifier !== 'FLIPPING') return;
    const t = setTimeout(() => setMotionOn(false), 900);
    return () => clearTimeout(t);
  }, [motionOn, classifier]);
  useEffect(() => {
    if (state.paused) setMotionOn(false);
  }, [state.paused]);

  /* ── notices auto-dismiss ── */
  useEffect(() => {
    if (!state.notice) return;
    const id = state.notice.id;
    const t = setTimeout(() => dispatch({ type: 'DISMISS_NOTICE', id }), interactionConfig.noticeMs);
    return () => clearTimeout(t);
  }, [state.notice]);

  const finish = useCallback(() => {
    const s = stateRef.current;
    if (s.finishedAt === null || s.phase !== 'cooking') return;
    const record = buildMemory(s);
    saveMemory(record);
    setMemory(record);
    dispatch({ type: 'FINISH', now: Date.now() });
  }, []);

  /* ── completion sequence → Recipe Memory ── */
  useEffect(() => {
    if (!state.finale) return;
    const t = setTimeout(finish, interactionConfig.completionSequenceMs);
    return () => clearTimeout(t);
  }, [state.finale, finish]);

  const act = useCallback((a: RecipeAction) => dispatch(a), []);
  const confirm = useCallback((source: ConfirmSource = 'click') => {
    const s = stateRef.current;
    if (s.phase === 'welcome') return dispatch({ type: 'GO_PREP' });
    if (s.phase === 'prep') return dispatch({ type: 'START_COOKING', now: Date.now() });
    dispatch({ type: 'CONFIRM', now: Date.now(), source });
  }, []);

  const updateMemory = useCallback((patch: Partial<MemoryRecord>) => {
    setMemory((m) => {
      if (!m) return m;
      const next = { ...m, ...patch };
      saveMemory(next);
      return next;
    });
  }, []);

  const restart = useCallback(() => {
    setMotionOn(false);
    setMemory(null);
    dispatch({ type: 'RESTART' });
  }, []);

  const toggleMotion = useCallback(() => setMotionOn((v) => !v), []);

  return { state, act, confirm, finish, restart, memory, updateMemory, micro, classifier, motionOn: motionOn && !!classifier, toggleMotion };
}

export type CookingSession = ReturnType<typeof useCookingSession>;
