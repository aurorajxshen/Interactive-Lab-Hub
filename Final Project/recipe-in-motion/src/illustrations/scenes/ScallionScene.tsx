import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BatterPool, Bowl, RestSpot, ScallionRing, Whisk } from '../objects';
import { CheckMark, Crayon, Ink, SceneFrame, palette, rng, useMotionPhase, wobblyEllipse } from '../sketch';
import { isDone, restLabelOf, type SceneProps } from './types';

/** Green rings drop in, circulate with the same whisk, then the whisk is set down on its rest. */
export function ScallionScene({ step, microIndex, microStates, live, stepDone, reduced }: SceneProps) {
  const { phase, energy } = useMotionPhase(live.active, live.intensity, { speed: 6, reduced });
  const added = isDone(microStates[0]);
  const rings = useMemo(() => {
    const r = rng(44);
    return Array.from({ length: 16 }, () => ({ a: r() * Math.PI * 2, rad: 0.25 + r() * 0.7, s: 0.8 + r() * 0.4 }));
  }, []);
  const spin = phase * 0.9;

  const contents = (
    <g>
      <BatterPool rx={150} ry={34} />
      {added &&
        rings.map((rg, i) => {
          const a = rg.a + spin * (1.2 - rg.rad * 0.6);
          return (
            <motion.g key={i} initial={reduced ? false : { y: -120, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.04, duration: 0.7, ease: [0.3, 0.7, 0.4, 1] }}>
              <ScallionRing x={Math.cos(a) * 130 * rg.rad} y={4 + Math.sin(a) * 28 * rg.rad} scale={rg.s} flat />
            </motion.g>
          );
        })}
    </g>
  );

  return (
    <SceneFrame label="Chopped scallion rings stirred into batter">
      <Bowl x={320} y={240} rx={170} depth={128} contents={contents} />
      {microIndex === 0 && !added && (
        <g className={reduced ? '' : 'bob'}>
          <g transform="translate(130,140)">
            <Crayon d={wobblyEllipse(0, 0, 70, 18, 3, 0.03, 0)} color={palette.cream} />
            <Ink d={wobblyEllipse(0, 0, 70, 18, 3, 0.03, 0.06)} />
            {rings.slice(0, 10).map((rg, i) => (
              <ScallionRing key={i} x={Math.cos(rg.a) * 40 * rg.rad} y={-6 + Math.sin(rg.a) * 8} scale={0.8} flat />
            ))}
          </g>
        </g>
      )}
      {(microIndex === 0 || microIndex === 1) && !stepDone && (
        // the same whisk keeps working — no tool change between whisking and folding
        <g transform={`translate(${(microIndex === 0 ? 470 : 320) + Math.cos(phase) * 60 * energy},${(microIndex === 0 ? 220 : 236) + Math.sin(phase) * 14 * energy}) rotate(${(microIndex === 0 ? 28 : 20) + Math.cos(phase) * 6 * energy}) scale(0.82)`}>
          <Whisk />
        </g>
      )}
      {microIndex === 2 && (
        <g>
          <RestSpot x={540} y={394} rx={86} ry={14} label={restLabelOf(step)} settled={isDone(microStates[2])} seed={11} />
          {isDone(microStates[2]) ? (
            <g transform="translate(462,392) rotate(86) scale(0.7)">
              <Whisk />
            </g>
          ) : (
            <g className={reduced ? '' : 'bob'}>
              <g transform="translate(560,300) rotate(32) scale(0.72)">
                <Whisk />
              </g>
            </g>
          )}
        </g>
      )}
      {stepDone && <CheckMark x={560} y={120} size={1.4} />}
    </SceneFrame>
  );
}
