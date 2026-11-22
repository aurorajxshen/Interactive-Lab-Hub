import { AnimatePresence, motion } from 'framer-motion';
import { Bowl, Egg, EggYolk, FlourBag, FlourMound, MeasuringJug, RestSpot, Spoon } from '../objects';
import { CheckMark, SceneFrame, palette, wobblyEllipse } from '../sketch';
import { isDone, restLabelOf, type SceneProps } from './types';

/** Sequential micro-scenes in one bowl: egg → water → flour × 3 → spoon back on its rest */
export function BatterScene({ step, microIndex, microStates, stepDone, reduced }: SceneProps) {
  const [egg, water, flour, spoonBack] = microStates;
  const spoonHome = isDone(spoonBack);
  const eggIn = isDone(egg);
  const waterIn = isDone(water);
  // flour is confirmed once for all three scoops (no per-scoop counting)
  const scoops = isDone(flour) ? 3 : 0;
  const ease = { duration: reduced ? 0 : 0.8, ease: [0.3, 0.7, 0.4, 1] as const };

  const contents = (
    <g>
      {waterIn && (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={ease}>
          <path d={wobblyEllipse(0, 6, 120, 26, 8, 0.03, 0)} fill={palette.blue} opacity={0.35} filter="url(#rim-crayon)" />
          {!reduced && <ellipse className="ripple" cx={-20} cy={6} rx={30} ry={8} fill="none" stroke={palette.blue} strokeWidth={1.6} />}
        </motion.g>
      )}
      <AnimatePresence>
        {eggIn && (
          <motion.g key="yolk" initial={{ y: -90, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={ease}>
            <EggYolk x={-10} y={4} />
          </motion.g>
        )}
      </AnimatePresence>
      {Array.from({ length: scoops }, (_, i) => (
        <motion.g key={i} initial={{ y: -70, opacity: 0, scale: 0.6 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={ease}>
          <FlourMound x={-60 + i * 55} y={0 + (i % 2) * 4} seed={i + 2} />
        </motion.g>
      ))}
    </g>
  );

  return (
    <SceneFrame label="A mixing bowl receiving an egg, water and three spoonfuls of flour">
      <Bowl x={320} y={250} rx={150} depth={118} contents={contents} />

      {/* micro 0: the egg hovers, then drops */}
      {microIndex === 0 && !eggIn && (
        <g className={reduced ? '' : 'bob'}>
          <Egg x={320} y={150} scale={1.25} rotate={-12} />
        </g>
      )}

      {/* micro 1: jug tilting over the bowl */}
      {microIndex === 1 && !waterIn && (
        <g>
          <g transform="translate(470,140) rotate(-28)">
            <MeasuringJug fill={0.55} />
          </g>
          <path className={reduced ? '' : 'stream'} d="M418,128 C402,160 396,200 392,236" fill="none" stroke={palette.blue} strokeWidth={5} strokeLinecap="round" opacity={0.6} filter="url(#rim-crayon)" />
        </g>
      )}

      {/* micro 2: spoon + bag, with a counter drawn as three little circles */}
      {microIndex === 3 && (
        <g>
          <FlourBag x={110} y={250} />
          <RestSpot x={520} y={382} rx={92} ry={16} label={restLabelOf(step)} settled={spoonHome} seed={5} />
          {spoonHome ? (
            <Spoon x={480} y={378} rotate={-4} heaped={false} />
          ) : (
            <g className={reduced ? '' : 'bob'}>
              <Spoon x={470} y={330} rotate={-12} heaped={false} />
            </g>
          )}
        </g>
      )}

      {microIndex === 2 && !stepDone && (
        <g>
          <FlourBag x={110} y={250} />
          <g className={reduced ? '' : 'bob'}>
            <Spoon x={220} y={150} rotate={-14} />
          </g>
        </g>
      )}
      {stepDone && <CheckMark x={540} y={120} size={1.4} />}
    </SceneFrame>
  );
}
