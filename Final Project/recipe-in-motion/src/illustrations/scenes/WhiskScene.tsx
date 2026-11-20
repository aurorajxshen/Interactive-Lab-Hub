import { useMemo } from 'react';
import { BatterPool, Bowl, Whisk } from '../objects';
import { CheckMark, SceneFrame, palette, rng, smoothPath } from '../sketch';
import { useMotionPhase } from '../sketch';
import type { SceneProps } from './types';

/**
 * The hero animation. The whisk orbits inside the bowl; swirl lines in the
 * batter rotate with damped motion energy; dry-flour flecks fade as active
 * whisking accumulates (an illustration of progress, not a measurement).
 */
export function WhiskScene({ live, elapsedSec, microStates, stepDone, reduced }: SceneProps) {
  const { phase, energy } = useMotionPhase(live.active, live.intensity, { speed: 7, reduced, release: 1.2 });
  const p = microStates[0];
  const target = 30 + (p?.extraTargetSec ?? 0);
  const progress = stepDone ? 1 : Math.min(1, elapsedSec / target);
  const inspecting = !!p?.inspectionOpen;

  const swirls = useMemo(() => {
    // three spiral arms drawn in a unit circle, squashed into the bowl later
    return [0, 1, 2].map((k) => {
      const pts: [number, number][] = [];
      for (let i = 0; i <= 14; i++) {
        const t = i / 14;
        const a = k * ((Math.PI * 2) / 3) + t * Math.PI * 1.6;
        const r = 18 + t * 100;
        pts.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
      return smoothPath(pts);
    });
  }, []);
  const lumps = useMemo(() => {
    const r = rng(31);
    return Array.from({ length: 14 }, () => ({ x: (r() * 2 - 1) * 110, y: (r() * 2 - 1) * 20, s: 2 + r() * 3 }));
  }, []);

  const swirlRot = (phase * 38) % 360;
  const orbit = 70 * (0.35 + energy * 0.65);
  const wx = Math.cos(phase) * orbit;
  const wy = Math.sin(phase) * orbit * 0.26;
  const tilt = Math.cos(phase) * 10 * energy;
  const lift = inspecting ? -34 : stepDone ? -24 : 0;
  const visibleLumps = Math.round(lumps.length * (1 - progress));

  const contents = (
    <g>
      <BatterPool rx={150} ry={34} color={palette.egg} />
      <g transform={`translate(0,4) scale(1,0.26) rotate(${swirlRot})`} opacity={0.35 + energy * 0.5}>
        {swirls.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="#C99234" strokeWidth={4.5 - i} strokeLinecap="round" filter="url(#rim-rough)" />
        ))}
      </g>
      {lumps.slice(0, visibleLumps).map((l, i) => (
        <circle key={i} cx={l.x + Math.cos(phase + i) * 4 * energy} cy={l.y + 4} r={l.s} fill="#FFFBF0" stroke={palette.ink} strokeWidth={0.6} opacity={0.9} />
      ))}
    </g>
  );

  return (
    <SceneFrame label="A whisk turning batter in a bowl">
      <Bowl x={320} y={232} rx={170} depth={130} contents={contents} />
      <g transform={`translate(${320 + (stepDone || inspecting ? 40 : wx)},${232 + wy + lift}) rotate(${tilt + (inspecting ? 18 : 0)})`} style={{ transition: 'none' }}>
        <Whisk />
        {inspecting && <path className="drip" d="M4,6 C2,14 6,20 4,28" stroke={palette.egg} strokeWidth={4} strokeLinecap="round" fill="none" />}
      </g>
      {/* progress ring drawn in pencil — illustrative of active time vs. reference */}
      <g transform="translate(560,100)">
        <circle r={30} fill="none" stroke={palette.ink} strokeOpacity={0.15} strokeWidth={3} />
        <circle r={30} fill="none" stroke={palette.terracotta} strokeWidth={3.4} strokeLinecap="round" pathLength={1} strokeDasharray={`${progress} 1`} transform="rotate(-90)" filter="url(#rim-rough)" />
        <text y={6} textAnchor="middle" className="svg-hand" fontSize={19} fill={palette.ink}>
          {Math.floor(Math.min(elapsedSec, 999))}s
        </text>
      </g>
      {stepDone && <CheckMark x={560} y={170} size={1.3} />}
    </SceneFrame>
  );
}
