import { useMemo } from 'react';
import { CuttingBoard, Knife, Scallion, ScallionRing } from '../objects';
import { CheckMark, SceneFrame, rng, useMotionPhase } from '../sketch';
import type { SceneProps } from './types';

/** Knife rises and falls with chopping motion; rings accumulate (illustrative, not a measurement). */
export function ChopScene({ live, elapsedSec, stepDone, reduced }: SceneProps) {
  const { phase, energy } = useMotionPhase(live.active, live.intensity, { speed: 14, reduced });
  const chopped = stepDone ? 1 : Math.min(1, elapsedSec / 22);
  const ringCount = Math.round(chopped * 22);
  const rings = useMemo(() => {
    const r = rng(5);
    return Array.from({ length: 22 }, () => ({ x: 70 + r() * 150, y: -18 + r() * 52, rot: r() * 360, s: 0.85 + r() * 0.35 }));
  }, []);

  const stalkEnd = 120 + 260 * (1 - chopped * 0.75) + 4;
  const knifeUp = energy > 0.02;
  const lift = Math.abs(Math.sin(phase)) * 44 * energy;

  return (
    <SceneFrame label="A knife chopping a scallion into thin rings on a wooden board">
      <CuttingBoard x={320} y={290} />
      <Scallion x={120} y={282} cut={chopped} />
      <g transform={`translate(${stalkEnd},270)`}>
        {rings.slice(0, ringCount).map((rg, i) => (
          <ScallionRing key={i} x={rg.x} y={rg.y} rotate={rg.rot} scale={rg.s} />
        ))}
      </g>
      {knifeUp ? (
        <g transform={`translate(${stalkEnd - 6},${206 - lift}) rotate(${-4 + energy * 6})`}>
          <Knife x={-150} y={0} />
        </g>
      ) : (
        <Knife x={330} y={358} rotate={-6} scale={0.92} />
      )}
      {stepDone && <CheckMark x={560} y={110} size={1.4} />}
    </SceneFrame>
  );
}
