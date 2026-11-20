import type { ReactNode } from 'react';
import { Egg, FlourMound, Grinder, MeasuringJug, OilBottle, Scallion, Spoon } from './objects';

/** Small ingredient vignettes for the preparation page */
const vignettes: Record<string, ReactNode> = {
  scallion: <Scallion x={58} y={70} scale={0.45} cut={0.5} />,
  egg: <Egg x={80} y={68} scale={1.3} rotate={-10} />,
  water: <MeasuringJug x={80} y={70} scale={0.85} fill={0.5} />,
  flour: (
    <g>
      <Spoon x={52} y={60} scale={0.85} />
      <FlourMound x={70} y={108} scale={0.7} seed={3} />
    </g>
  ),
  salt: <Grinder x={80} y={84} scale={0.72} kind="salt" />,
  pepper: <Grinder x={80} y={84} scale={0.72} kind="pepper" />,
  oil: <OilBottle x={80} y={86} scale={0.62} />,
};

export function IngredientSketch({ id, label }: { id: string; label: string }) {
  return (
    <svg className="ingredient-svg" viewBox="0 0 160 140" role="img" aria-label={label}>
      {vignettes[id]}
    </svg>
  );
}
