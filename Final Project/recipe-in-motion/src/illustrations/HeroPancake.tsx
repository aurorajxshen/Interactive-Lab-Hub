import { Pancake, Plate, ScallionRing, Steam } from './objects';
import { Flourish, palette } from './sketch';

/** Welcome / memory illustration: a plated pancake with steam and a few loose rings. */
export function HeroPancake({ label = 'A plated scallion egg pancake', flourish = false }: { label?: string; flourish?: boolean }) {
  return (
    <svg className="hero-svg" viewBox="0 0 520 340" role="img" aria-label={label}>
      <Plate x={260} y={210}>
        <Pancake side="bottom" done={1} rx={112} ry={28} y={-6} />
        <Pancake side="bottom" done={1} rx={104} ry={26} y={-22} />
      </Plate>
      <Steam x={262} y={150} />
      <ScallionRing x={70} y={290} rotate={20} />
      <ScallionRing x={92} y={302} rotate={-30} scale={0.8} />
      <ScallionRing x={450} y={286} rotate={60} scale={0.9} />
      {flourish && <Flourish cx={260} cy={200} r={190} color={palette.egg} seed={5} />}
    </svg>
  );
}
