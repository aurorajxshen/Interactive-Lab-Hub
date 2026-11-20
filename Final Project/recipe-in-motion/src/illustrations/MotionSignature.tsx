import { useMemo } from 'react';
import { palette, smoothPath } from './sketch';

/**
 * Whisking motion signature: recorded intensity samples wrapped around a
 * circle, one revolution per ~6 s of samples. The *shape* is an artistic
 * mapping; the underlying samples are the recorded (simulated) values.
 */
export function MotionSignature({ samples, size = 220 }: { samples: number[]; size?: number }) {
  const d = useMemo(() => {
    if (samples.length < 3) return '';
    const c = size / 2;
    const perTurn = 30; // samples per revolution (200 ms each ≈ 6 s)
    const pts: [number, number][] = samples.map((v, i) => {
      const a = (i / perTurn) * Math.PI * 2;
      const grow = 0.35 + (i / samples.length) * 0.45;
      const r = c * (grow + v * 0.22);
      return [c + Math.cos(a) * r, c + Math.sin(a) * r];
    });
    return smoothPath(pts);
  }, [samples, size]);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="signature-svg" role="img" aria-label="Abstract whisking motion signature">
      {d ? (
        <path d={d} fill="none" stroke={palette.egg} strokeWidth={2} strokeLinecap="round" opacity={0.9} filter="url(#rim-rough)" className="draw-slow" pathLength={1} />
      ) : (
        <text x={size / 2} y={size / 2} textAnchor="middle" className="svg-hand" fontSize={18} fill={palette.ink} opacity={0.6}>
          no whisking recorded
        </text>
      )}
      <circle cx={size / 2} cy={size / 2} r={3} fill={palette.terracotta} />
    </svg>
  );
}
