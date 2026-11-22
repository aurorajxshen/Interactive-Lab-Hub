import { useMemo } from 'react';
import { CuttingBoard, Knife, RestSpot, Scallion, ScallionRing } from '../objects';
import { CheckMark, SceneFrame, rng, useMotionPhase } from '../sketch';
import { isDone, restLabelOf, type SceneProps } from './types';

/**
 * Knife rises and falls with chopping motion; rings accumulate (illustrative, not a measurement).
 * Then the knife-down checkpoint: a pencilled rest spot on the board, and the knife lying
 * flat in it, blade facing away, once the cook confirms.
 */
export function ChopScene({ step, microIndex, microStates, live, elapsedSec, stepDone, reduced }: SceneProps) {
  const { phase, energy } = useMotionPhase(live.active && microIndex === 0, live.intensity, { speed: 14, reduced });
  const chopDone = isDone(microStates[0]);
  const knifeSafe = isDone(microStates[1]);
  const chopped = chopDone || stepDone ? 1 : microIndex === 0 ? Math.min(1, elapsedSec / 22) : 0;
  const ringCount = Math.round(chopped * 22);
  const rings = useMemo(() => {
    const r = rng(5);
    return Array.from({ length: 22 }, () => ({ x: 70 + r() * 150, y: -18 + r() * 52, rot: r() * 360, s: 0.85 + r() * 0.35 }));
  }, []);

  const stalkEnd = 120 + 260 * (1 - chopped * 0.75) + 4;
  const knifeUp = microIndex === 0 && !chopDone && energy > 0.02;
  const lift = Math.abs(Math.sin(phase) * 44 * energy);
  const returning = microIndex === 1 || knifeSafe;

  return (
    <SceneFrame label={knifeSafe ? 'Chopped scallion on the board, knife resting flat with the blade facing away' : 'A knife chopping a scallion into thin rings on a wooden board'}>
      <CuttingBoard x={320} y={290} />
      <Scallion x={120} y={282} cut={chopped} />
      <g transform={`translate(${stalkEnd},270)`}>
        {rings.slice(0, ringCount).map((rg, i) => (
          <ScallionRing key={i} x={rg.x} y={rg.y} rotate={rg.rot} scale={rg.s} />
        ))}
      </g>
      {returning && <RestSpot x={400} y={392} rx={150} ry={14} label={restLabelOf(step)} settled={knifeSafe} seed={7} />}
      {knifeUp ? (
        <g transform={`translate(${stalkEnd - 6},${206 - lift}) rotate(${-4 + energy * 6})`}>
          <Knife x={-150} y={0} />
        </g>
      ) : returning ? (
        knifeSafe ? (
          // flat on the board edge, blade (lower edge) flipped to face away from the cook
          <g transform="translate(372,392) scale(0.92,-0.92)">
            <Knife x={0} y={-11} />
          </g>
        ) : (
          <g className={reduced ? '' : 'bob'}>
            <g transform="translate(380,350) rotate(-10) scale(0.92)">
              <Knife x={0} y={0} />
            </g>
          </g>
        )
      ) : (
        <Knife x={330} y={358} rotate={-6} scale={0.92} />
      )}
      {stepDone && <CheckMark x={560} y={110} size={1.4} />}
    </SceneFrame>
  );
}
