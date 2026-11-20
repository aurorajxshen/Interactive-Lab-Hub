/**
 * sketch — the shared hand-drawn illustration language.
 *
 *  • Ink: dark-olive outlines, round caps, a soft displacement filter so lines wobble.
 *  • Crayon: grainy colour fills, deliberately mis-registered from the outline
 *    (offset a few px) like the colored-pencil references.
 *  • Seeded jitter so shapes are imperfect but stable between renders.
 */
import { useEffect, useRef, useState, type ReactNode, type SVGProps } from 'react';

export const palette = {
  paper: '#F8F5ED',
  ink: '#3E4D3B',
  egg: '#E8B64B',
  green: '#91A875',
  terracotta: '#C97563',
  blue: '#8AA9B5',
  cream: '#F1E6CC',
  wood: '#D9B98C',
  steel: '#B9C3C2',
  golden: '#D99A3E',
};

export const INK_WIDTH = 2.2;

/* ── seeded randomness & smooth paths ── */

export function rng(seed: number) {
  let s = (Math.abs(Math.floor(seed)) % 2147483646) + 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

type Pt = [number, number];

/** Catmull-Rom spline through points → cubic Bézier path */
export function smoothPath(points: Pt[], closed = false): string {
  if (points.length < 2) return '';
  const p = closed ? [points[points.length - 1], ...points, points[0], points[1]] : [points[0], ...points, points[points.length - 1]];
  let d = `M${p[1][0].toFixed(1)},${p[1][1].toFixed(1)}`;
  for (let i = 1; i < p.length - 2; i++) {
    const [x0, y0] = p[i - 1];
    const [x1, y1] = p[i];
    const [x2, y2] = p[i + 1];
    const [x3, y3] = p[i + 2];
    const c1x = x1 + (x2 - x0) / 6;
    const c1y = y1 + (y2 - y0) / 6;
    const c2x = x2 - (x3 - x1) / 6;
    const c2y = y2 - (y3 - y1) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`;
  }
  return closed ? d + ' Z' : d;
}

/** Imperfect ellipse; `overshoot` > 0 leaves the hand-drawn overlapping tail */
export function wobblyEllipse(cx: number, cy: number, rx: number, ry: number, seed = 1, jitter = 0.035, overshoot = 0.08, n = 22): string {
  const r = rng(seed);
  const start = r() * Math.PI * 2;
  const pts: Pt[] = [];
  const total = Math.PI * 2 * (1 + overshoot);
  for (let i = 0; i <= n; i++) {
    const a = start + (total * i) / n;
    const k = 1 + (r() * 2 - 1) * jitter;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return overshoot > 0 ? smoothPath(pts) : smoothPath(pts.slice(0, -1), true);
}

/** Jitter a polyline and smooth it */
export function wobblyLine(points: Pt[], seed = 1, jitter = 1.2): string {
  const r = rng(seed);
  return smoothPath(points.map(([x, y]) => [x + (r() * 2 - 1) * jitter, y + (r() * 2 - 1) * jitter] as Pt));
}

/** Closed blob through points with jitter */
export function wobblyShape(points: Pt[], seed = 1, jitter = 1.2): string {
  const r = rng(seed);
  return smoothPath(points.map(([x, y]) => [x + (r() * 2 - 1) * jitter, y + (r() * 2 - 1) * jitter] as Pt), true);
}

/* ── filter definitions (render once per page) ── */

export function SketchDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
      <defs>
        <filter id="rim-rough" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="4" result="warp" />
          <feDisplacementMap in="SourceGraphic" in2="warp" scale="2.6" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="rim-crayon" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="9" result="noise" />
          <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  2.4 0 0 0 -0.55" result="grain" />
          <feComposite in="SourceGraphic" in2="grain" operator="in" result="textured" />
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="2" result="warp" />
          <feDisplacementMap in="textured" in2="warp" scale="5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="rim-pencil" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="1" seed="5" result="noise" />
          <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.8 0 0 0 -0.2" result="grain" />
          <feComposite in="SourceGraphic" in2="grain" operator="in" result="g" />
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="7" result="warp" />
          <feDisplacementMap in="g" in2="warp" scale="2.2" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}

/* ── drawing atoms ── */

type PathProps = Omit<SVGProps<SVGPathElement>, 'd'> & { d: string };

/** Outline in ink */
export function Ink({ d, width = INK_WIDTH, color = palette.ink, ...rest }: PathProps & { width?: number; color?: string }) {
  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      filter="url(#rim-rough)"
      {...rest}
    />
  );
}

/** Grainy crayon fill */
export function Crayon({ d, color, opacity = 0.85, dx = 0, dy = 0, ...rest }: PathProps & { color: string; opacity?: number; dx?: number; dy?: number }) {
  return <path d={d} fill={color} opacity={opacity} filter="url(#rim-crayon)" transform={dx || dy ? `translate(${dx},${dy})` : undefined} {...rest} />;
}

/** Pencil hatch strokes — used for shadows and texture */
export function Hatch({ x, y, w, h, angle = -35, gap = 6, color = palette.ink, opacity = 0.25, seed = 3 }: { x: number; y: number; w: number; h: number; angle?: number; gap?: number; color?: string; opacity?: number; seed?: number }) {
  const r = rng(seed);
  const lines: string[] = [];
  for (let i = 0; i < w / gap; i++) {
    const lx = x + i * gap + r() * 2;
    lines.push(`M${lx},${y + h} l${Math.tan((angle * Math.PI) / 180) * h},${-h * (0.7 + r() * 0.3)}`);
  }
  return <path d={lines.join(' ')} stroke={color} strokeWidth={1} opacity={opacity} strokeLinecap="round" fill="none" filter="url(#rim-pencil)" />;
}

/** A filled shape: crayon fill offset from its ink outline */
export function Sketch({ d, fill, offset = [3, 2], opacity = 0.85, inkWidth }: { d: string; fill?: string; offset?: [number, number]; opacity?: number; inkWidth?: number }) {
  return (
    <g>
      {fill && <Crayon d={d} color={fill} dx={offset[0]} dy={offset[1]} opacity={opacity} />}
      <Ink d={d} width={inkWidth} />
    </g>
  );
}

/* ── frame-driven motion: sensor-reactive and smoothly damped ── */

/**
 * Returns a continuously advancing phase and a damped "energy" (0..1) that
 * eases toward the live intensity when active, and settles to 0 when stopped.
 */
export function useMotionPhase(active: boolean, intensity: number, opts: { speed?: number; reduced?: boolean; attack?: number; release?: number } = {}) {
  const { speed = 6, reduced = false, attack = 4, release = 1.8 } = opts;
  const [frame, setFrame] = useState({ phase: 0, energy: 0 });
  const ref = useRef({ phase: 0, energy: 0, last: 0 });
  const target = active ? Math.max(0.15, intensity) : 0;
  const targetRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    let raf = 0;
    const tick = (t: number) => {
      const st = ref.current;
      const dt = st.last ? Math.min(0.05, (t - st.last) / 1000) : 0;
      st.last = t;
      const tg = targetRef.current;
      const rate = tg > st.energy ? attack : release;
      st.energy += (tg - st.energy) * Math.min(1, rate * dt);
      if (st.energy < 0.002 && tg === 0) st.energy = 0;
      const sp = reduced ? speed * 0.12 : speed;
      st.phase += dt * sp * (0.35 + st.energy);
      if (st.energy > 0 || tg > 0) setFrame({ phase: st.phase, energy: st.energy });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [speed, reduced, attack, release]);

  return frame;
}

/** Wrapper for every scene so composition is consistent */
export function SceneFrame({ children, label }: { children: ReactNode; label: string }) {
  return (
    <svg className="scene-svg" viewBox="0 0 640 420" role="img" aria-label={label}>
      {children}
    </svg>
  );
}

/** Quiet hand-drawn check mark */
export function CheckMark({ x, y, size = 1, color = palette.green }: { x: number; y: number; size?: number; color?: string }) {
  return (
    <g transform={`translate(${x},${y}) scale(${size})`}>
      <path className="draw-in" d="M-12,0 C-8,4 -5,8 -3,11 C2,2 8,-7 15,-13" fill="none" stroke={color} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" pathLength={1} filter="url(#rim-rough)" />
    </g>
  );
}

/** Small celebratory marks (dashes radiating) */
export function Flourish({ cx, cy, r = 80, seed = 2, color = palette.terracotta }: { cx: number; cy: number; r?: number; seed?: number; color?: string }) {
  const rand = rng(seed);
  const marks = Array.from({ length: 11 }, (_, i) => {
    const a = (i / 11) * Math.PI * 2 + rand() * 0.3;
    const r0 = r * (0.95 + rand() * 0.15);
    const r1 = r0 + 12 + rand() * 12;
    return `M${cx + Math.cos(a) * r0},${cy + Math.sin(a) * r0} L${cx + Math.cos(a) * r1},${cy + Math.sin(a) * r1}`;
  });
  return <path className="flourish" d={marks.join(' ')} stroke={color} strokeWidth={2.4} strokeLinecap="round" fill="none" filter="url(#rim-rough)" />;
}
