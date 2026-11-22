import { Bowl, BatterPool, Burner, HeatLines, OilBottle, Pan, Pancake, Annotation, RestSpot } from '../objects';
import { CheckMark, SceneFrame, palette, useMotionPhase, wobblyEllipse } from '../sketch';
import { isDone, restLabelOf, type SceneProps } from './types';

/** Heat on → preheat (rising heat lines) → oil → pour (bowl tilts, batter spreads) → bowl moved away from the heat. */
export function PanScene({ step, microIndex, microStates, live, elapsedSec, stepDone, reduced }: SceneProps) {
  const { energy } = useMotionPhase(live.active, live.intensity, { speed: 4, reduced });
  const [heatOn, preheat, oil, pour, clear] = microStates;
  const cleared = isDone(clear);
  const burnerOn = isDone(heatOn);
  const warm = isDone(preheat) ? 1 : microIndex === 1 ? Math.min(1, elapsedSec / 45) : 0;
  const oiled = isDone(oil);
  const pourMs = pour?.motion.accumulatedMs ?? 0;
  const pourActiveSec = microIndex === 3 ? Math.max(elapsedSec, pourMs / 1000) : 0;
  const poured = isDone(pour);
  const spread = poured ? 1 : Math.min(1, pourActiveSec / 5);

  const contents = (
    <g>
      {oiled && <path d={wobblyEllipse(-20, 4, 70, 16, 5, 0.05, 0)} fill="#D6D88A" opacity={0.45} filter="url(#rim-crayon)" />}
      {spread > 0.02 && <Pancake rx={118} ry={28} spread={0.2 + spread * 0.8} y={4} />}
    </g>
  );

  return (
    <SceneFrame label="A frying pan on a burner, with oil and batter being poured">
      <Burner x={300} y={318} on={burnerOn} />
      <Pan x={290} y={276} contents={contents} />
      {burnerOn && <HeatLines x={290} y={236} count={4} spread={200} active={!reduced && warm > 0.05 && spread < 0.6} />}

      {microIndex === 0 && !burnerOn && <Annotation x={430} y={380} text="medium-low" dir="right" />}

      {microIndex === 2 && !oiled && (
        <g>
          <g transform="translate(470,110) rotate(-118)">
            <OilBottle />
          </g>
          <circle className={reduced ? '' : 'drop'} cx={380} cy={160} r={5} fill="#C8CC6A" opacity={0.9} />
        </g>
      )}

      {microIndex === 3 && !poured && (
        <g>
          <g transform={`translate(470,140) rotate(${-14 - energy * 30})`}>
            <Bowl rx={70} depth={54} contents={<BatterPool rx={60} ry={14} level={1 - spread * 0.7} />} />
          </g>
          {energy > 0.08 && (
            <path d="M408,150 C392,180 372,214 344,262" fill="none" stroke={palette.egg} strokeWidth={4 + energy * 6} strokeLinecap="round" opacity={0.9} filter="url(#rim-crayon)" />
          )}
        </g>
      )}
      {microIndex === 4 && (
        <g>
          <RestSpot x={560} y={394} rx={70} ry={13} label={restLabelOf(step)} settled={cleared} seed={13} />
          <g className={cleared || reduced ? '' : 'bob'}>
            <g transform={cleared ? 'translate(560,350)' : 'translate(540,168) rotate(-6)'}>
              <Bowl rx={62} depth={46} contents={<BatterPool rx={40} ry={8} level={0.15} />} />
            </g>
          </g>
          {!cleared && <path d="M604,200 C618,236 616,276 602,312 M602,312 l-1,-11 M602,312 l8,-7" fill="none" stroke={palette.terracotta} strokeWidth={1.8} strokeLinecap="round" opacity={0.8} />}
        </g>
      )}
      {stepDone && <CheckMark x={560} y={110} size={1.4} />}
    </SceneFrame>
  );
}
