import type { ComponentType } from 'react';
import type { SceneId } from '../../config/recipeConfig';
import type { SceneProps } from './types';
import { ChopScene } from './ChopScene';
import { BatterScene } from './BatterScene';
import { SeasonScene } from './SeasonScene';
import { WhiskScene } from './WhiskScene';
import { ScallionScene } from './ScallionScene';
import { PanScene } from './PanScene';
import { FlipScene } from './FlipScene';
import { PlateScene } from './PlateScene';

/** Scene registry: recipeConfig refers to scenes by id, so illustrations can be swapped freely. */
export const sceneRegistry: Record<SceneId, ComponentType<SceneProps>> = {
  chop: ChopScene,
  batter: BatterScene,
  season: SeasonScene,
  whisk: WhiskScene,
  scallions: ScallionScene,
  pan: PanScene,
  flip: FlipScene,
  plate: PlateScene,
};

export type { SceneProps };
