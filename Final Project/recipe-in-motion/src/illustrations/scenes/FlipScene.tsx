import { motion } from 'framer-motion';
import { Annotation, Burner, HeatLines, Pan, Pancake, Spatula } from '../objects';
import { CheckMark, SceneFrame, palette, useMotionPhase } from '../sketch';
import { isDone, type SceneProps } from './types';

/** First side cooks (edges set over time), then the spatula lifts and turns the pancake. */
export function FlipScene({ microIndex, microStates, live, elapsedSec, stepDone, reduced }: SceneProps) {
  const { energy } = useMotionPhase(live.active, live.intensity, { speed: 5, reduced, attack: 8, release: 2.5 });
  const [cook, flip] = microStates;
  const cooked = isDone(cook);
  const flipped = isDone(flip);
  const doneness = cooked ? 1 : microIndex === 0 ? Math.min(1, elapsedSec / 90) : 0;

  // live flip signal: lift and half-turn as feedback; it settles back until the cook confirms
  const liftY = -energy * 110;
  const turn = 1 - energy * 1.6;

  return (
    <SceneFrame label="A pancake cooking in a pan, lifted and flipped with a spatula">
      <Burner x={300} y={318} on />
      <Pan
        x={290}
        y={276}
        contents={
          flipped ? (
            <motion.g initial={reduced ? false : { y: -130, scaleY: -1 }} animate={{ y: 4, scaleY: 1 }} transition={{ duration: 0.9, ease: [0.3, 0.7, 0.4, 1] }}>
              <Pancake side="bottom" done={1} />
            </motion.g>
          ) : (
            <g transform={`translate(0,${4 + liftY}) scale(1,${Math.max(-1, turn)})`}>
              <Pancake done={doneness * 0.5} side={turn < 0 ? 'bottom' : 'top'} />
            </g>
          )
        }
      />
      <HeatLines x={290} y={232} count={3} spread={150} active={!reduced} />

      {microIndex === 0 && !cooked && (
        <g>
          {/* edge cue: dashed ring that firms up as time passes */}
          <ellipse cx={290} cy={280} rx={126} ry={32} fill="none" stroke={palette.terracotta} strokeWidth={2} strokeDasharray={`${4 + doneness * 14} 8`} opacity={0.5 + doneness * 0.5} filter="url(#rim-rough)" />
          <Annotation x={470} y={160} text="matte edges?" dir="left" sub="lifts cleanly?" />
          {!reduced &&
            [0, 1, 2, 3, 4].map((i) => (
              <circle key={i} className="bubble" style={{ animationDelay: `${i * 0.7}s` }} cx={230 + i * 30} cy={276 + (i % 2) * 6} r={2.2} fill="none" stroke={palette.ink} strokeWidth={1} />
            ))}
        </g>
      )}

      {microIndex === 1 && !flipped && (
        <g transform={`translate(${172 + energy * 60},${282 - energy * 60}) rotate(${-55 + energy * 25})`}>
          <Spatula />
        </g>
      )}
      {stepDone && <CheckMark x={560} y={110} size={1.4} />}
    </SceneFrame>
  );
}
