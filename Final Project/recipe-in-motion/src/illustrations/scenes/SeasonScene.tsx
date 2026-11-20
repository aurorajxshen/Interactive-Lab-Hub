import { useMemo } from 'react';
import { BatterPool, Bowl, Grinder } from '../objects';
import { CheckMark, SceneFrame, palette, rng, useMotionPhase } from '../sketch';
import { isDone, type SceneProps } from './types';

/** Grinder rotates with twisting; particles fall while active. Counted twists are the cook's own. */
export function SeasonScene({ microIndex, microStates, live, stepDone, reduced }: SceneProps) {
  const { phase, energy } = useMotionPhase(live.active, live.intensity, { speed: 9, reduced });
  const [salt, pepper] = microStates;
  const activeKind = microIndex === 0 ? 'salt' : 'pepper';

  const specks = useMemo(() => {
    const r = rng(12);
    return Array.from({ length: 40 }, () => ({ x: (r() * 2 - 1) * 90, y: (r() * 2 - 1) * 16 }));
  }, []);
  const saltSpecks = (salt?.count ?? 0) * 8;
  const pepperSpecks = (pepper?.count ?? 0) * 8;

  const contents = (
    <g>
      <BatterPool rx={110} ry={24} />
      {specks.slice(0, saltSpecks).map((s, i) => (
        <circle key={`s${i}`} cx={s.x} cy={s.y + 4} r={1.6} fill="#FFFFFF" stroke={palette.ink} strokeWidth={0.4} />
      ))}
      {specks.slice(20, 20 + pepperSpecks).map((s, i) => (
        <circle key={`p${i}`} cx={-s.x} cy={s.y + 4} r={1.5} fill={palette.ink} opacity={0.85} />
      ))}
    </g>
  );

  const grinderPos = (kind: 'salt' | 'pepper') => {
    const isActive = !stepDone && kind === activeKind;
    if (isActive) return { x: 320, y: 112, rotate: 172, opacity: 1 };
    return kind === 'salt' ? { x: 120, y: 260, rotate: 0, opacity: isDone(salt) ? 0.55 : 0.9 } : { x: 530, y: 260, rotate: 0, opacity: isDone(pepper) ? 0.55 : 0.9 };
  };

  const particles = Array.from({ length: 12 }, (_, i) => {
    const fall = ((phase * 26 + i * 19) % 120) / 120;
    return { x: (Math.sin(i * 7.3) * 14), y: 166 + fall * 110, o: energy * (1 - fall) };
  });

  return (
    <SceneFrame label="Salt and pepper grinders above a bowl of batter">
      <Bowl x={320} y={300} rx={130} depth={92} contents={contents} />
      {(['salt', 'pepper'] as const).map((kind) => {
        const pos = grinderPos(kind);
        return (
          <g key={kind} style={{ transition: reduced ? 'none' : 'transform 600ms cubic-bezier(.3,.7,.4,1), opacity 400ms' }} transform={`translate(${pos.x},${pos.y}) rotate(${pos.rotate})`} opacity={pos.opacity}>
            <Grinder kind={kind} twist={kind === activeKind ? phase : 0} y={-46} />
          </g>
        );
      })}
      {!stepDone &&
        particles.map((p, i) => (
          <circle key={i} cx={320 + p.x} cy={p.y} r={activeKind === 'salt' ? 2 : 1.8} fill={activeKind === 'salt' ? '#FFFFFF' : palette.ink} stroke={activeKind === 'salt' ? palette.ink : 'none'} strokeWidth={0.5} opacity={p.o} />
        ))}
      {stepDone && <CheckMark x={540} y={120} size={1.4} />}
    </SceneFrame>
  );
}
