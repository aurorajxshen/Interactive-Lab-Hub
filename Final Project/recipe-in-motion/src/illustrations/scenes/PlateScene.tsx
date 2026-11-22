import { motion } from 'framer-motion';
import { Burner, HeatLines, Pan, Pancake, Plate, Steam, Annotation, RestSpot, Spatula } from '../objects';
import { CheckMark, Flourish, SceneFrame, palette } from '../sketch';
import { isDone, restLabelOf, type SceneProps } from './types';

/** Second side, heat off + spatula rested, then the pancake glides onto a plate with a small flourish. */
export function PlateScene({ step, microIndex, microStates, elapsedSec, finale, reduced }: SceneProps) {
  const [second, heatOff, plated] = microStates;
  const flameOn = !isDone(heatOff);
  const onPlate = isDone(plated) || finale;
  const doneness = isDone(second) ? 1 : microIndex === 0 ? 0.6 + Math.min(0.4, elapsedSec / 120) : 1;

  return (
    <SceneFrame label="A golden pancake moving from the pan onto a plate">
      <Burner x={220} y={318} on={flameOn} scale={0.85} />
      <Pan x={210} y={280} scale={0.85} contents={!onPlate ? <Pancake side="bottom" done={doneness} y={4} /> : null} />
      {flameOn && <HeatLines x={210} y={240} count={3} spread={140} active={!reduced} />}
      {!flameOn && !onPlate && <Annotation x={150} y={140} text="heat off" dir="right" />}
      {microIndex >= 1 && (
        <g>
          <RestSpot x={120} y={398} rx={84} ry={12} label={restLabelOf(step)} settled={!flameOn} seed={15} />
          {!flameOn ? (
            <g transform="translate(56,392) rotate(90) scale(0.62) scale(0.4,1)">
              <Spatula />
            </g>
          ) : (
            <g className={reduced ? '' : 'bob'}>
              <g transform="translate(96,330) rotate(-60) scale(0.62) scale(0.6,1)">
                <Spatula />
              </g>
            </g>
          )}
        </g>
      )}

      <Plate x={470} y={300} scale={0.8}>
        {onPlate && (
          <motion.g initial={reduced ? false : { x: -310, y: -20, rotate: -8 }} animate={{ x: 0, y: 0, rotate: 0 }} transition={{ duration: 1.1, ease: [0.3, 0.7, 0.4, 1] }}>
            <Pancake side="bottom" done={1} rx={112} ry={28} />
          </motion.g>
        )}
      </Plate>

      {onPlate && (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduced ? 0 : 1, duration: 0.6 }}>
          <Steam x={470} y={250} />
          <Flourish cx={470} cy={290} r={150} color={palette.terracotta} />
          <CheckMark x={590} y={120} size={1.5} />
          <text x={470} y={130} textAnchor="middle" className="svg-hand" fontSize={34} fill={palette.ink}>
            ta da!
          </text>
        </motion.g>
      )}
      {microIndex === 0 && !isDone(second) && <Annotation x={360} y={150} text="golden?" sub="springs back?" dir="right" />}
    </SceneFrame>
  );
}
