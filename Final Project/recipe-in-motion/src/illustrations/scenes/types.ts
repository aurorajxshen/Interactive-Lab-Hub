import type { RecipeStep } from '../../config/recipeConfig';
import type { MicroProgress } from '../../state/recipeState';

export interface SceneProps {
  step: RecipeStep;
  /** Micro-action currently relevant on the viewed step */
  microIndex: number;
  /** Progress of each micro-action in this step (same order as step.micro) */
  microStates: MicroProgress[];
  /** Motion signal for this step's movement (from the motion preview now, sensors later) */
  live: { active: boolean; intensity: number };
  /** Seconds of active motion or elapsed timer for the relevant micro-action */
  elapsedSec: number;
  stepDone: boolean;
  finale: boolean;
  reduced: boolean;
  preview: boolean;
}

export const isDone = (p?: MicroProgress) => p?.status === 'done' || p?.status === 'skipped';

/** Hand-lettered rest label for a step's tool-return checkpoint (from recipeConfig) */
export function restLabelOf(step: SceneProps['step']): string | undefined {
  const m = step.micro.find((x) => x.kind === 'toolReturn');
  return m && m.kind === 'toolReturn' ? m.restLabel : undefined;
}
