/**
 * recipeMemory — builds and stores the end-of-session journal entry.
 * Everything here is derived from recorded session events (motion is previewed, not sensed, in V0.1);
 * the UI labels which parts are recorded and which are illustrative.
 */
import { recipeConfig } from '../config/recipeConfig';
import { motionElapsedMs, timerElapsedMs, type RecipeState, type TimelineEntry } from '../state/recipeState';

export interface StepMemory {
  id: string;
  title: string;
  startedAt: number | null;
  completedAt: number | null;
  durationMs: number;
  skipped: boolean;
  details: string[];
}

export interface MemoryRecord {
  id: string;
  number: number;
  createdAt: number;
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  pausedMs: number;
  steps: StepMemory[];
  whisk: { activeMs: number; segments: number; samples: number[]; checks: string[] };
  /** Tool-return checkpoints: confirmed by the cook (never sensor-verified) */
  toolChecks?: { confirmed: number; total: number; skipped: string[] };
  note: string;
  photo: string | null;
  log: TimelineEntry[];
}

const STORAGE_KEY = 'recipe-in-motion.memories.v1';

export function loadMemories(): MemoryRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MemoryRecord[]) : [];
  } catch {
    return [];
  }
}

function persist(list: MemoryRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // storage full (e.g. large photo) — keep the session in memory only
  }
}

export function saveMemory(record: MemoryRecord) {
  const list = loadMemories().filter((m) => m.id !== record.id);
  persist([...list, record]);
}

export function nextMemoryNumber() {
  const list = loadMemories();
  return list.length ? Math.max(...list.map((m) => m.number)) + 1 : 1;
}

export function buildMemory(s: RecipeState): MemoryRecord {
  const finishedAt = s.finishedAt ?? Date.now();
  const startedAt = s.startedAt ?? finishedAt;
  const steps: StepMemory[] = recipeConfig.steps.map((step) => {
    const ps = step.micro.map((m) => s.micro[m.id]);
    const starts = ps.map((p) => p.startedAt).filter((x): x is number => x !== null);
    const ends = ps.map((p) => p.completedAt).filter((x): x is number => x !== null);
    const st = starts.length ? Math.min(...starts) : null;
    const en = ends.length ? Math.max(...ends) : null;
    const details: string[] = [];
    step.micro.forEach((m, i) => {
      const p = ps[i];
      if (p.status === 'skipped') details.push(`${m.label}: skipped`);
      else if (m.kind === 'toolReturn') details.push(`${m.confirmLabel} ✓`);
      else if (m.kind === 'counter') details.push(`${m.label}: ${p.count}/${m.target} ${m.unitPlural}`);
      else if (m.kind === 'activeDuration') details.push(`${m.label}: ${Math.round(motionElapsedMs(p.motion, finishedAt) / 1000)} s active`);
      else if (m.kind === 'timer') details.push(`${m.label}: ${Math.round(timerElapsedMs(p.timer, finishedAt) / 1000)} s`);
      else if (m.kind === 'motion' && p.motion.accumulatedMs > 0)
        details.push(`${m.label}: ${Math.round(p.motion.accumulatedMs / 1000)} s of motion`);
    });
    return {
      id: step.id,
      title: step.title,
      startedAt: st,
      completedAt: en,
      durationMs: st && en ? en - st : 0,
      skipped: ps.every((p) => p.status === 'skipped'),
      details,
    };
  });
  const whiskP = s.micro['whisk-batter'];
  const toolMicros = recipeConfig.steps.flatMap((st) => st.micro).filter((m) => m.kind === 'toolReturn');
  const toolChecks = {
    confirmed: toolMicros.filter((m) => s.micro[m.id].status === 'done').length,
    total: toolMicros.length,
    skipped: toolMicros.filter((m) => s.micro[m.id].status === 'skipped').map((m) => m.label),
  };
  return {
    id: `${startedAt}`,
    number: nextMemoryNumber(),
    createdAt: Date.now(),
    startedAt,
    finishedAt,
    durationMs: finishedAt - startedAt,
    pausedMs: s.pausedTotalMs,
    steps,
    whisk: {
      activeMs: motionElapsedMs(whiskP.motion, finishedAt),
      segments: whiskP.motion.segments,
      samples: whiskP.motion.samples,
      checks: whiskP.outcomes,
    },
    toolChecks,
    note: '',
    photo: null,
    log: s.log,
  };
}

export function formatDuration(ms: number) {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return m ? `${m} min ${sec.toString().padStart(2, '0')} s` : `${sec} s`;
}
