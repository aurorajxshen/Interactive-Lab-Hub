/**
 * objects — reusable illustrated kitchen objects.
 * All drawn in local coordinates around (0,0) and placed with a translate,
 * so scenes can animate them with simple transforms.
 */
import { useId, useMemo, type ReactNode } from 'react';
import { Crayon, Hatch, Ink, Sketch, palette, rng, wobblyEllipse, wobblyLine, wobblyShape } from './sketch';

type Place = { x?: number; y?: number; rotate?: number; scale?: number };
const place = ({ x = 0, y = 0, rotate = 0, scale = 1 }: Place) =>
  `translate(${x},${y})${rotate ? ` rotate(${rotate})` : ''}${scale !== 1 ? ` scale(${scale})` : ''}`;

/* ───────── bowl (with a little blue flower band) ───────── */

export function Bowl({ rx = 130, depth = 105, contents, ...p }: Place & { rx?: number; depth?: number; contents?: ReactNode }) {
  const clip = useId();
  const ry = rx * 0.26;
  const body = useMemo(
    () =>
      wobblyShape(
        [
          [-rx, 0],
          [-rx * 0.96, depth * 0.45],
          [-rx * 0.72, depth * 0.88],
          [-rx * 0.34, depth],
          [rx * 0.34, depth],
          [rx * 0.72, depth * 0.88],
          [rx * 0.96, depth * 0.45],
          [rx, 0],
          [0, ry * 0.95],
        ],
        11,
        1.4,
      ),
    [rx, depth, ry],
  );
  const rim = useMemo(() => wobblyEllipse(0, 0, rx, ry, 21, 0.02, 0.06), [rx, ry]);
  const inner = useMemo(() => wobblyEllipse(0, 2, rx * 0.93, ry * 0.8, 5, 0.02, 0), [rx, ry]);
  const flowers = useMemo(() => {
    const r = rng(8);
    return Array.from({ length: 7 }, (_, i) => {
      const t = (i + 0.5) / 7;
      const fx = -rx * 0.82 + t * rx * 1.64;
      const fy = depth * 0.42 + Math.sin(t * Math.PI) * ry * 0.55 + r() * 2;
      return { fx, fy };
    });
  }, [rx, depth, ry]);
  return (
    <g transform={place(p)}>
      <Crayon d={body} color={palette.cream} dx={3} dy={3} opacity={0.95} />
      <Hatch x={rx * 0.25} y={depth * 0.3} w={rx * 0.6} h={depth * 0.55} opacity={0.12} seed={4} />
      {flowers.map(({ fx, fy }, i) => (
        <g key={i} transform={`translate(${fx},${fy})`}>
          {[0, 1, 2, 3].map((k) => (
            <circle key={k} cx={Math.cos((k * Math.PI) / 2 + i) * 4} cy={Math.sin((k * Math.PI) / 2 + i) * 4} r={3} fill={palette.blue} opacity={0.85} filter="url(#rim-crayon)" />
          ))}
          <circle r={1.6} fill={palette.ink} opacity={0.7} />
        </g>
      ))}
      <Ink d={wobblyLine([[-rx * 0.9, depth * 0.27], [0, depth * 0.27 + ry * 0.85], [rx * 0.9, depth * 0.27]], 3, 0.8)} color={palette.blue} width={1.6} opacity={0.8} />
      <Ink d={body} />
      <clipPath id={clip}>
        <ellipse cx={0} cy={2} rx={rx * 0.92} ry={ry * 0.78} />
      </clipPath>
      <Crayon d={inner} color="#EFE6D2" opacity={0.7} />
      <g clipPath={`url(#${clip})`}>{contents}</g>
      <Ink d={rim} />
    </g>
  );
}

/** Batter surface inside a bowl, plus optional swirl rotation */
export function BatterPool({ rx, ry, color = palette.egg, level = 1, opacity = 0.85 }: { rx: number; ry: number; color?: string; level?: number; opacity?: number }) {
  const d = useMemo(() => wobblyEllipse(0, 4, rx * level, ry * level, 31, 0.03, 0), [rx, ry, level]);
  return <Crayon d={d} color={color} opacity={opacity} />;
}

/* ───────── pan & burner ───────── */

export function Burner({ on = false, ...p }: Place & { on?: boolean }) {
  return (
    <g transform={place(p)}>
      <Sketch d={wobblyShape([[-150, 0], [150, 0], [160, 26], [-160, 26]], 4, 1)} fill={palette.steel} offset={[2, 3]} opacity={0.5} />
      {on &&
        [-60, -20, 20, 60].map((fx, i) => (
          <path
            key={i}
            className="flame"
            style={{ animationDelay: `${i * 0.27}s` }}
            d={`M${fx},2 C${fx - 7},-6 ${fx - 3},-14 ${fx},-20 C${fx + 4},-13 ${fx + 7},-6 ${fx},2 Z`}
            fill={palette.blue}
            opacity={0.85}
            filter="url(#rim-crayon)"
          />
        ))}
      <Ink d={wobblyLine([[-100, 30], [-110, 56]], 2)} />
      <Ink d={wobblyLine([[100, 30], [110, 56]], 3)} />
    </g>
  );
}

export function Pan({ contents, handleLift = 0, ...p }: Place & { contents?: ReactNode; handleLift?: number }) {
  const rim = useMemo(() => wobblyEllipse(0, 0, 150, 40, 14, 0.02, 0.05), []);
  const inner = useMemo(() => wobblyEllipse(0, 3, 136, 33, 6, 0.02, 0), []);
  const body = useMemo(() => wobblyShape([[-150, 0], [-140, 28], [-110, 46], [110, 46], [140, 28], [150, 0], [0, 40]], 9, 1), []);
  return (
    <g transform={place(p)}>
      <g transform={`rotate(${-handleLift}, 150, 0)`}>
        <Sketch d={wobblyShape([[148, -6], [300, -22], [306, -12], [150, 10]], 5, 0.8)} fill={palette.ink} opacity={0.75} offset={[2, 2]} />
      </g>
      <Crayon d={body} color={palette.ink} opacity={0.55} dx={2} dy={3} />
      <Ink d={body} />
      <Crayon d={inner} color="#5C6A58" opacity={0.55} />
      <g>{contents}</g>
      <Ink d={rim} />
    </g>
  );
}

export function HeatLines({ x = 0, y = 0, active = true, count = 4, spread = 200 }: { x?: number; y?: number; active?: boolean; count?: number; spread?: number }) {
  if (!active) return null;
  return (
    <g transform={`translate(${x},${y})`}>
      {Array.from({ length: count }, (_, i) => {
        const lx = -spread / 2 + (spread / (count - 1)) * i;
        return (
          <path
            key={i}
            className="heat-line"
            style={{ animationDelay: `${i * 0.6}s` }}
            d={`M${lx},0 C${lx - 10},-14 ${lx + 10},-26 ${lx},-40 C${lx - 9},-52 ${lx + 8},-62 ${lx},-74`}
            fill="none"
            stroke={palette.terracotta}
            strokeWidth={2.2}
            strokeLinecap="round"
            filter="url(#rim-rough)"
          />
        );
      })}
    </g>
  );
}

/* ───────── pancake ───────── */

export function Pancake({ rx = 118, ry = 30, done = 0, side = 'top', spread = 1, ...p }: Place & { rx?: number; ry?: number; done?: number; side?: 'top' | 'bottom'; spread?: number }) {
  const d = useMemo(() => wobblyEllipse(0, 0, rx * spread, ry * spread, 41, 0.04, 0), [rx, ry, spread]);
  const edge = useMemo(() => wobblyEllipse(0, 0, rx * spread * 0.86, ry * spread * 0.8, 13, 0.05, 0.1), [rx, ry, spread]);
  const rings = useMemo(() => {
    const r = rng(77);
    return Array.from({ length: 14 }, () => ({ x: (r() * 2 - 1) * rx * 0.7 * spread, y: (r() * 2 - 1) * ry * 0.6 * spread, s: 0.7 + r() * 0.5 }));
  }, [rx, ry, spread]);
  // color shifts from raw batter yellow to toasted golden
  const color = side === 'bottom' || done > 0.6 ? palette.golden : palette.egg;
  return (
    <g transform={place(p)}>
      <Crayon d={d} color={color} opacity={0.9} dx={2} dy={2} />
      {(side === 'bottom' || done > 0.3) && <Crayon d={edge} color={palette.terracotta} opacity={0.25 + done * 0.25} />}
      {rings.map((rg, i) => (
        <ScallionRing key={i} x={rg.x} y={rg.y} scale={rg.s * 0.8} flat />
      ))}
      <Ink d={d} />
    </g>
  );
}

/* ───────── scallion & knife & board ───────── */

export function ScallionRing({ flat = false, ...p }: Place & { flat?: boolean }) {
  return (
    <g transform={place(p)}>
      <ellipse rx={6} ry={flat ? 3.6 : 5.4} fill={palette.green} opacity={0.75} filter="url(#rim-crayon)" />
      <ellipse rx={5.6} ry={flat ? 3.2 : 5} fill="none" stroke={palette.ink} strokeWidth={1.4} filter="url(#rim-rough)" />
      <ellipse rx={2.2} ry={flat ? 1.2 : 2} fill="none" stroke={palette.ink} strokeWidth={1} opacity={0.6} />
    </g>
  );
}

/** A scallion lying horizontally; `cut` (0..1) shortens the green end */
export function Scallion({ cut = 0, ...p }: Place & { cut?: number }) {
  const len = 260 * (1 - cut * 0.75);
  const stalk = wobblyShape([[0, -7], [len, -6], [len + 4, 0], [len, 6], [0, 7]], 3, 0.8);
  return (
    <g transform={place(p)}>
      {/* white bulb + roots */}
      <Sketch d={wobblyShape([[-40, -9], [0, -8], [0, 8], [-40, 10], [-48, 0]], 2, 0.8)} fill="#F4F1E4" offset={[2, 2]} />
      <Ink d="M-48,0 l-10,-6 M-48,1 l-12,2 M-47,3 l-8,8" width={1.3} />
      <Sketch d={stalk} fill={palette.green} offset={[3, 2]} />
      <Ink d={wobblyLine([[6, -1], [len * 0.95, -1]], 6, 0.6)} width={1} opacity={0.5} />
      {cut > 0 && <Ink d={`M${len + 2},-6 L${len + 2},6`} width={1.6} />}
    </g>
  );
}

export function Knife(p: Place) {
  return (
    <g transform={place(p)}>
      <Sketch d={wobblyShape([[0, 0], [150, -4], [168, 14], [150, 22], [0, 22]], 7, 0.6)} fill={palette.steel} offset={[2, 2]} opacity={0.9} />
      <Ink d="M10,15 L150,15" width={1} opacity={0.4} />
      <Sketch d={wobblyShape([[-90, 2], [0, 4], [0, 20], [-90, 20], [-96, 11]], 4, 0.6)} fill={palette.ink} offset={[2, 2]} opacity={0.75} />
      <circle cx={-60} cy={11} r={2} fill={palette.paper} />
      <circle cx={-30} cy={11} r={2} fill={palette.paper} />
    </g>
  );
}

export function CuttingBoard(p: Place) {
  const d = useMemo(() => wobblyShape([[-230, -60], [230, -64], [236, 60], [-232, 64]], 12, 1.6), []);
  return (
    <g transform={place(p)}>
      <Crayon d={d} color={palette.wood} dx={4} dy={4} opacity={0.75} />
      <Hatch x={-200} y={-40} w={400} h={90} angle={-70} gap={16} opacity={0.12} seed={9} />
      <Ink d={d} />
      <Ink d={wobblyLine([[-236, 64], [-232, 74], [232, 72], [236, 60]], 4, 0.8)} />
    </g>
  );
}

/* ───────── egg, jug, spoon, flour ───────── */

export function Egg(p: Place) {
  const d = useMemo(() => wobblyShape([[0, -30], [18, -16], [22, 6], [12, 24], [-12, 24], [-22, 6], [-18, -16]], 5, 0.6), []);
  return (
    <g transform={place(p)}>
      <Crayon d={d} color="#F3E2C3" dx={2} dy={2} />
      <Ink d={d} />
    </g>
  );
}

export function EggYolk(p: Place) {
  return (
    <g transform={place(p)}>
      <Crayon d={wobblyEllipse(0, 0, 44, 13, 3, 0.06, 0)} color="#FAF3E4" opacity={0.9} />
      <Ink d={wobblyEllipse(0, 0, 44, 13, 3, 0.06, 0)} width={1.4} opacity={0.6} />
      <Crayon d={wobblyEllipse(4, -1, 15, 8, 6, 0.04, 0)} color={palette.egg} opacity={0.95} />
      <Ink d={wobblyEllipse(4, -1, 15, 8, 6, 0.04, 0.08)} width={1.6} />
    </g>
  );
}

export function MeasuringJug({ fill = 0.5, ...p }: Place & { fill?: number }) {
  const body = wobblyShape([[-34, -50], [30, -50], [34, 40], [-38, 40]], 3, 0.6);
  return (
    <g transform={place(p)}>
      <rect x={-32} y={40 - 86 * fill} width={64} height={86 * fill} fill={palette.blue} opacity={0.45} filter="url(#rim-crayon)" />
      <Ink d={body} />
      <Ink d="M30,-34 C52,-30 52,14 32,18" />
      <Ink d="M-34,-50 l-10,-8" />
      {[0, 1, 2].map((i) => (
        <Ink key={i} d={`M-30,${20 - i * 22} l12,0`} width={1.2} />
      ))}
      <text x={-12} y={-6} className="svg-hand" fontSize={13} fill={palette.ink}>
        45
      </text>
    </g>
  );
}

export function Spoon({ heaped = true, ...p }: Place & { heaped?: boolean }) {
  return (
    <g transform={place(p)}>
      <Sketch d={wobblyEllipse(0, 0, 26, 15, 4, 0.03, 0)} fill={palette.steel} opacity={0.7} />
      {heaped && <Crayon d={wobblyShape([[-20, -2], [-8, -10], [8, -10], [20, -2], [0, 4]], 3, 1)} color="#FBF8F0" opacity={1} />}
      {heaped && <Ink d={wobblyLine([[-21, -2], [21, -2]], 5, 0.4)} width={1.2} opacity={0.6} />}
      <Sketch d={wobblyShape([[24, -3], [120, -10], [124, -4], [24, 4]], 7, 0.4)} fill={palette.steel} opacity={0.7} />
      <text x={70} y={-12} className="svg-hand" fontSize={12} fill={palette.ink}>
        15 mL
      </text>
    </g>
  );
}

export function FlourMound({ seed = 1, ...p }: Place & { seed?: number }) {
  const d = wobblyShape([[-30, 6], [-18, -10], [-4, -16], [12, -12], [28, 4], [0, 10]], seed, 1.6);
  return (
    <g transform={place(p)}>
      <Crayon d={d} color="#FFFDF7" opacity={1} />
      <Ink d={d} width={1.5} opacity={0.75} />
      <circle cx={-8} cy={-4} r={1} fill={palette.ink} opacity={0.4} />
      <circle cx={6} cy={-8} r={1} fill={palette.ink} opacity={0.4} />
    </g>
  );
}

export function FlourBag(p: Place) {
  const d = wobblyShape([[-38, -54], [38, -54], [44, 56], [-44, 56]], 6, 1);
  return (
    <g transform={place(p)}>
      <Crayon d={d} color="#F2EBDD" dx={3} dy={3} />
      <Ink d={d} />
      <Ink d="M-38,-54 l10,-10 l10,8 l10,-8 l10,8 l10,-8 l10,8 l6,-6" width={1.5} />
      <rect x={-34} y={-6} width={68} height={20} fill={palette.blue} opacity={0.55} filter="url(#rim-crayon)" />
      <text x={-20} y={9} className="svg-hand" fontSize={14} fill={palette.ink}>
        flour
      </text>
      {Array.from({ length: 14 }, (_, i) => (
        <circle key={i} cx={-30 + ((i * 37) % 60)} cy={-40 + ((i * 23) % 26) + (i > 7 ? 60 : 0)} r={1} fill={palette.ink} opacity={0.5} />
      ))}
    </g>
  );
}

/* ───────── grinder ───────── */

export function Grinder({ kind = 'salt', twist = 0, ...p }: Place & { kind?: 'salt' | 'pepper'; twist?: number }) {
  const body = kind === 'salt' ? '#F4F1E8' : '#5E584F';
  // twist: radians — drawn as shifting ridges on the cap (a 2.5D cheat)
  const ridges = Array.from({ length: 6 }, (_, i) => {
    const a = twist + (i / 6) * Math.PI;
    return Math.cos(a) * 20;
  });
  return (
    <g transform={place(p)}>
      <Sketch d={wobblyShape([[-24, 0], [24, 0], [22, 92], [-22, 92]], kind === 'salt' ? 2 : 5, 0.8)} fill={body} offset={[3, 2]} opacity={0.9} />
      {kind === 'salt' && <Hatch x={-14} y={14} w={26} h={68} angle={-20} gap={6} opacity={0.1} seed={2} />}
      <Sketch d={wobblyShape([[-26, -40], [26, -40], [26, 0], [-26, 0]], 6, 0.8)} fill={kind === 'salt' ? palette.blue : palette.terracotta} offset={[2, 2]} />
      {ridges.map((rx, i) =>
        Math.abs(rx) < 24 ? <Ink key={i} d={`M${rx},-38 L${rx},-2`} width={1.1} opacity={0.55} /> : null,
      )}
      <Sketch d={wobblyEllipse(0, -46, 10, 6, 4, 0.05, 0)} fill={palette.ink} opacity={0.7} />
      <text x={-14} y={56} className="svg-hand" fontSize={13} fill={kind === 'salt' ? palette.ink : palette.paper}>
        {kind}
      </text>
    </g>
  );
}

/* ───────── whisk & spatula ───────── */

export function Whisk(p: Place) {
  return (
    <g transform={place(p)}>
      <Sketch d={wobblyShape([[-6, -170], [6, -170], [6, -88], [-6, -88]], 3, 0.5)} fill={palette.terracotta} offset={[2, 2]} />
      {[-22, -12, 0, 12, 22].map((w, i) => (
        <Ink key={i} d={`M0,-90 C${w * 1.2},-70 ${w * 1.4},-24 ${w * 0.3},0 C${-w * 0.1},4 ${-w * 0.3},-4 0,-90`} width={1.5} />
      ))}
    </g>
  );
}

export function Spatula(p: Place) {
  return (
    <g transform={place(p)}>
      <Sketch d={wobblyShape([[-46, -10], [46, -12], [50, 12], [-50, 12]], 4, 0.6)} fill={palette.steel} offset={[2, 2]} />
      {[-24, 0, 24].map((sx) => (
        <Ink key={sx} d={`M${sx},-6 l0,12`} width={1.2} opacity={0.6} />
      ))}
      <Ink d="M0,-11 L0,-60" width={3} />
      <Sketch d={wobblyShape([[-8, -60], [8, -60], [10, -150], [-10, -150]], 6, 0.6)} fill={palette.terracotta} offset={[2, 2]} />
    </g>
  );
}

/* ───────── oil, plate ───────── */

export function OilBottle(p: Place) {
  const d = wobblyShape([[-8, -96], [8, -96], [8, -70], [24, -46], [24, 56], [-24, 56], [-24, -46], [-8, -70]], 6, 0.8);
  return (
    <g transform={place(p)}>
      <Crayon d={d} color="#C8CC6A" dx={3} dy={2} opacity={0.85} />
      <Ink d={d} />
      <Sketch d="M-9,-110 L9,-110 L9,-96 L-9,-96 Z" fill={palette.ink} opacity={0.8} />
      <rect x={-16} y={-6} width={32} height={40} fill={palette.paper} opacity={0.9} />
      <Ink d={wobblyShape([[-16, -6], [16, -6], [16, 34], [-16, 34]], 4, 0.6)} width={1.3} />
      <Ink d="M0,4 C6,10 6,20 0,26 C-6,20 -6,10 0,4" width={1.2} />
    </g>
  );
}

export function Plate({ children, ...p }: Place & { children?: ReactNode }) {
  const outer = useMemo(() => wobblyEllipse(0, 0, 170, 46, 17, 0.02, 0.06), []);
  const inner = useMemo(() => wobblyEllipse(0, 2, 120, 30, 23, 0.03, 0.05), []);
  const dots = useMemo(() => Array.from({ length: 22 }, (_, i) => (i / 22) * Math.PI * 2), []);
  return (
    <g transform={place(p)}>
      <Crayon d={outer} color="#FFFDF8" dx={3} dy={4} opacity={1} />
      {dots.map((a, i) => (
        <circle key={i} cx={Math.cos(a) * 146} cy={Math.sin(a) * 38} r={2.2} fill={palette.green} opacity={0.8} />
      ))}
      <Ink d={outer} />
      <Ink d={inner} width={1.4} opacity={0.6} />
      <ellipse cx={0} cy={6} rx={110} ry={26} fill={palette.terracotta} opacity={0.12} filter="url(#rim-crayon)" />
      {children}
    </g>
  );
}

/* ───────── tool rest spot (tool-return checkpoints) ───────── */

/**
 * A pencilled "home" for a tool: a dashed outline while waiting, a soft
 * crayon fill once the cook confirms the tool is resting there. Purely
 * illustrative — it shows the cook's confirmation, it does not detect anything.
 */
export function RestSpot({ x = 0, y = 0, rx = 90, ry = 18, label, settled = false, seed = 3 }: { x?: number; y?: number; rx?: number; ry?: number; label?: string; settled?: boolean; seed?: number }) {
  const d = useMemo(() => wobblyEllipse(0, 0, rx, ry, seed, 0.03, settled ? 0.06 : 0), [rx, ry, seed, settled]);
  return (
    <g transform={`translate(${x},${y})`} className="rest-spot">
      {settled && <Crayon d={d} color={palette.green} opacity={0.22} dx={2} dy={2} />}
      <path d={d} fill="none" stroke={settled ? palette.green : palette.ink} strokeWidth={1.6} strokeDasharray={settled ? undefined : '6 7'} strokeLinecap="round" opacity={settled ? 0.85 : 0.45} filter="url(#rim-rough)" />
      {label && (
        <text y={ry + 22} textAnchor="middle" className="svg-hand" fontSize={18} fill={settled ? palette.ink : palette.terracotta}>
          {label}
        </text>
      )}
    </g>
  );
}

/* ───────── small helpers ───────── */

export function Steam({ x = 0, y = 0, n = 3 }: { x?: number; y?: number; n?: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      {Array.from({ length: n }, (_, i) => (
        <path
          key={i}
          className="steam-line"
          style={{ animationDelay: `${i * 0.9}s` }}
          d={`M${i * 22 - 22},0 c-8,-10 8,-18 0,-28 c-8,-10 8,-18 0,-28`}
          fill="none"
          stroke={palette.ink}
          strokeWidth={1.8}
          strokeLinecap="round"
          opacity={0.5}
          filter="url(#rim-rough)"
        />
      ))}
    </g>
  );
}

/** Little arrow + handwritten note used for guidance annotations */
export function Annotation({ x, y, text, dir = 'left', sub }: { x: number; y: number; text: string; dir?: 'left' | 'right' | 'down'; sub?: string }) {
  const arrow =
    dir === 'left'
      ? 'M-8,4 C-26,6 -40,14 -52,26 M-52,26 l2,-10 M-52,26 l10,-2'
      : dir === 'right'
        ? 'M8,4 C26,6 40,14 52,26 M52,26 l-2,-10 M52,26 l-10,-2'
        : 'M0,10 C-4,22 2,32 0,42 M0,42 l-6,-8 M0,42 l6,-8';
  return (
    <g transform={`translate(${x},${y})`} className="annotation">
      <text className="svg-hand" fontSize={24} fill={palette.ink} textAnchor={dir === 'right' ? 'end' : 'start'}>
        {text}
      </text>
      {sub && (
        <text className="svg-hand" fontSize={17} y={22} fill={palette.terracotta} textAnchor={dir === 'right' ? 'end' : 'start'}>
          {sub}
        </text>
      )}
      <g transform={`translate(${dir === 'right' ? -10 : 0},${sub ? 30 : 10})`}>
        <path d={arrow} fill="none" stroke={palette.ink} strokeWidth={1.5} strokeLinecap="round" opacity={0.7} />
      </g>
    </g>
  );
}

export { Ink, Crayon, Sketch, palette };
