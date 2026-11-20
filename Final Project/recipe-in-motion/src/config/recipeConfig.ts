/**
 * recipeConfig — the single editable source for recipe content.
 *
 * Every quantity, reference time and micro-action lives here as data.
 * Values are PROVISIONAL (V0.1) and are expected to change after testing.
 * Nothing in this file implies that a timer or a motion sensor verifies
 * food safety or doneness — the cook always decides.
 */

export type ClassifierId = 'CHOPPING' | 'TWISTING' | 'WHISKING' | 'POURING' | 'FLIPPING';
export type SafetyContext = 'knife' | 'hotPan';
export type SceneId = 'chop' | 'batter' | 'season' | 'whisk' | 'scallions' | 'pan' | 'flip' | 'plate';

export interface Guidance {
  /** Large, glanceable quantity, e.g. "45 mL" */
  quantity?: string;
  /** Reference time, e.g. "≈ 30 s" */
  time?: string;
  /** Small handwritten-style annotation next to the illustration */
  note?: string;
}

interface BaseMicro {
  id: string;
  /** Short label used in the micro-action trail */
  label: string;
  /** One concise instruction sentence */
  instruction: string;
  guidance?: Guidance;
  /** Which movement this action involves (the UI shows motion feedback for it;
   *  sensor recognition will be routed here later) */
  classifier?: ClassifierId;
  /** Marks knife / hot-pan actions (safety styling now, gesture lock later) */
  safety?: SafetyContext;
  /** Optional actions can be skipped without a warning */
  optional?: boolean;
  /** What Confirm means right now */
  confirmLabel: string;
}

export interface CheckMicro extends BaseMicro {
  kind: 'check';
}

export interface CounterMicro extends BaseMicro {
  kind: 'counter';
  target: number;
  unit: string; // singular, e.g. "scoop"
  unitPlural: string;
}

export interface MotionMicro extends BaseMicro {
  kind: 'motion';
}

export type InspectionEffect =
  | { type: 'complete' }
  | { type: 'continue'; addSec: number }
  | { type: 'adjust'; addSec: number; note: string };

export interface InspectionOption {
  id: string;
  label: string;
  description: string;
  effect: InspectionEffect;
}

export interface Inspection {
  question: string;
  options: InspectionOption[];
}

export interface ActiveDurationMicro extends BaseMicro {
  kind: 'activeDuration';
  /** Reference active-motion time, seconds */
  targetSec: number;
  maxSec?: number;
  /** When present, reaching the target opens a check-in instead of completing */
  inspection?: Inspection;
}

export interface TimerMicro extends BaseMicro {
  kind: 'timer';
  minSec: number;
  maxSec: number;
  extendSec: number;
  /** Visual cues the cook should check — the timer is only a reference */
  cues: string[];
}

export type MicroAction = CheckMicro | CounterMicro | MotionMicro | ActiveDurationMicro | TimerMicro;

export interface RecipeStep {
  id: string;
  title: string;
  shortTitle: string;
  intro: string;
  scene: SceneId;
  safetyNote?: string;
  micro: MicroAction[];
}

export interface Ingredient {
  id: string;
  name: string;
  amount: string;
  optional?: boolean;
}

export interface RecipeConfig {
  id: string;
  name: string;
  subtitle: string;
  serves: string;
  approxMinutes: string;
  ingredients: Ingredient[];
  tools: string[];
  steps: RecipeStep[];
}

export const recipeConfig: RecipeConfig = {
  id: 'scallion-egg-pancake',
  name: 'Scallion Egg Pancake',
  subtitle: 'A soft, savoury pancake for one, made in one bowl and one pan.',
  serves: 'Serves 1',
  approxMinutes: '≈ 12 minutes',
  ingredients: [
    { id: 'scallion', name: 'Scallion', amount: '½ stalk' },
    { id: 'egg', name: 'Egg', amount: '1' },
    { id: 'water', name: 'Water', amount: '45 mL' },
    { id: 'flour', name: 'Plain flour', amount: '3 level tbsp (15 mL spoon)' },
    { id: 'salt', name: 'Salt', amount: '2 grinder twists' },
    { id: 'pepper', name: 'Black pepper', amount: '2 grinder twists', optional: true },
    { id: 'oil', name: 'Neutral oil', amount: '2.5 mL (½ tsp)' },
  ],
  tools: ['Knife & board', 'Bowl', 'Whisk', '15 mL spoon', 'Small frying pan', 'Spatula', 'Plate'],
  steps: [
    {
      id: 'chop',
      title: 'Chop the scallion',
      shortTitle: 'Chop',
      intro: 'Thin green rings, about 2–3 mm wide.',
      scene: 'chop',
      safetyNote: 'Sharp knife — keep fingertips curled and put the knife down before confirming.',
      micro: [
        {
          id: 'chop-scallion',
          kind: 'motion',
          label: 'Chop',
          instruction: 'Chop half a scallion into 2–3 mm rings. Place the knife down when you are finished.',
          guidance: { quantity: '½ scallion', note: '2–3 mm rings' },
          classifier: 'CHOPPING',
          safety: 'knife',
          confirmLabel: 'Knife is down — scallion chopped',
        },
      ],
    },
    {
      id: 'batter',
      title: 'Egg, water & flour',
      shortTitle: 'Batter',
      intro: 'Three things into one bowl, one at a time.',
      scene: 'batter',
      micro: [
        {
          id: 'add-egg',
          kind: 'check',
          label: 'Egg',
          instruction: 'Crack one egg into the bowl.',
          guidance: { quantity: '1 egg' },
          confirmLabel: 'Egg is in',
        },
        {
          id: 'add-water',
          kind: 'check',
          label: 'Water',
          instruction: 'Pour in 45 mL of water.',
          guidance: { quantity: '45 mL', note: '3 tbsp' },
          confirmLabel: 'Water is in',
        },
        {
          id: 'add-flour',
          kind: 'counter',
          label: 'Flour',
          instruction: 'Add three level tablespoons of flour, using a 15 mL spoon. Confirm after each scoop.',
          guidance: { quantity: '3 × 15 mL', note: 'level, not heaped' },
          target: 3,
          unit: 'scoop',
          unitPlural: 'scoops',
          confirmLabel: 'Count one scoop',
        },
      ],
    },
    {
      id: 'season',
      title: 'Salt & pepper',
      shortTitle: 'Season',
      intro: 'A few twists of the grinder over the bowl.',
      scene: 'season',
      micro: [
        {
          id: 'add-salt',
          kind: 'counter',
          label: 'Salt',
          instruction: 'Twist the salt grinder twice — two full turns. Confirm after each twist.',
          guidance: { quantity: '2 twists', note: 'full turns' },
          classifier: 'TWISTING',
          target: 2,
          unit: 'twist',
          unitPlural: 'twists',
          confirmLabel: 'Count one twist',
        },
        {
          id: 'add-pepper',
          kind: 'counter',
          label: 'Pepper',
          instruction: 'Optional: twist the pepper grinder twice. Skip if you prefer.',
          guidance: { quantity: '2 twists', note: 'optional' },
          classifier: 'TWISTING',
          optional: true,
          target: 2,
          unit: 'twist',
          unitPlural: 'twists',
          confirmLabel: 'Count one twist',
        },
      ],
    },
    {
      id: 'whisk',
      title: 'Whisk until smooth',
      shortTitle: 'Whisk',
      intro: 'About thirty seconds of steady whisking.',
      scene: 'whisk',
      micro: [
        {
          id: 'whisk-batter',
          kind: 'activeDuration',
          label: 'Whisk',
          instruction: 'Whisk steadily. Only time spent moving counts — pause whenever you need to.',
          guidance: { time: '≈ 30 s active', note: 'no dry flour' },
          classifier: 'WHISKING',
          targetSec: 30,
          confirmLabel: 'Check the batter',
          inspection: {
            question: 'Lift the whisk and look. How is the batter?',
            options: [
              {
                id: 'smooth',
                label: 'Smooth',
                description: 'No dry flour, no lumps.',
                effect: { type: 'complete' },
              },
              {
                id: 'lumpy',
                label: 'Still lumpy',
                description: 'Keep whisking another 10 s.',
                effect: { type: 'continue', addSec: 10 },
              },
              {
                id: 'thick',
                label: 'Too thick',
                description: 'Add 5 mL water, then mix again.',
                effect: { type: 'adjust', addSec: 10, note: '+5 mL water' },
              },
            ],
          },
        },
      ],
    },
    {
      id: 'scallions',
      title: 'Fold in the scallion',
      shortTitle: 'Scallion',
      intro: 'Green rings into the batter, a quick stir.',
      scene: 'scallions',
      micro: [
        {
          id: 'add-scallions',
          kind: 'check',
          label: 'Add',
          instruction: 'Tip all the chopped scallion into the batter.',
          guidance: { quantity: 'all of it' },
          confirmLabel: 'Scallion is in',
        },
        {
          id: 'stir-scallions',
          kind: 'activeDuration',
          label: 'Stir',
          instruction: 'Stir gently for 5–10 seconds, just until the green is spread through.',
          guidance: { time: '5–10 s' },
          classifier: 'WHISKING',
          targetSec: 5,
          maxSec: 10,
          confirmLabel: 'Evenly mixed',
        },
      ],
    },
    {
      id: 'pan',
      title: 'Heat, oil & pour',
      shortTitle: 'Pan',
      intro: 'A gentle heat and a thin film of oil.',
      scene: 'pan',
      safetyNote: 'Hot pan — keep the handle turned inward.',
      micro: [
        {
          id: 'heat-on',
          kind: 'check',
          label: 'Heat on',
          instruction: 'Set the pan on the burner and turn it to medium-low.',
          guidance: { note: 'medium-low' },
          safety: 'hotPan',
          confirmLabel: 'Burner is on, medium-low',
        },
        {
          id: 'preheat',
          kind: 'timer',
          label: 'Preheat',
          instruction: 'Let the pan warm for about 45–60 seconds.',
          guidance: { time: '45–60 s' },
          safety: 'hotPan',
          minSec: 45,
          maxSec: 60,
          extendSec: 15,
          cues: ['Hold a hand above the pan — you should feel gentle warmth.'],
          confirmLabel: 'Pan is warm',
        },
        {
          id: 'add-oil',
          kind: 'check',
          label: 'Oil',
          instruction: 'Add 2.5 mL of oil and tilt the pan to coat.',
          guidance: { quantity: '2.5 mL', note: '½ tsp' },
          safety: 'hotPan',
          confirmLabel: 'Oil is in',
        },
        {
          id: 'pour-batter',
          kind: 'motion',
          label: 'Pour',
          instruction: 'Pour in all of the batter and let it spread into a round.',
          guidance: { quantity: 'all the batter' },
          classifier: 'POURING',
          safety: 'hotPan',
          confirmLabel: 'All batter is poured',
        },
      ],
    },
    {
      id: 'first-side',
      title: 'Cook, then flip',
      shortTitle: 'Flip',
      intro: 'Wait for set edges, then turn it over.',
      scene: 'flip',
      safetyNote: 'Hot pan — keep the handle turned inward.',
      micro: [
        {
          id: 'cook-first',
          kind: 'timer',
          label: 'First side',
          instruction: 'Cook undisturbed. Check the edges before flipping.',
          guidance: { time: '90–120 s' },
          safety: 'hotPan',
          minSec: 90,
          maxSec: 120,
          extendSec: 20,
          cues: ['Edges look set and matte, not glossy.', 'A spatula slides under and lifts it without tearing.'],
          confirmLabel: 'Edges set — ready to flip',
        },
        {
          id: 'flip',
          kind: 'motion',
          label: 'Flip',
          instruction: 'Slide the spatula under and turn the pancake over in one motion.',
          classifier: 'FLIPPING',
          safety: 'hotPan',
          confirmLabel: 'It is flipped',
        },
      ],
    },
    {
      id: 'second-side',
      title: 'Finish & plate',
      shortTitle: 'Plate',
      intro: 'A short second side, heat off, onto the plate.',
      scene: 'plate',
      safetyNote: 'Hot pan — turn the heat off before plating.',
      micro: [
        {
          id: 'cook-second',
          kind: 'timer',
          label: 'Second side',
          instruction: 'Cook the second side, then check it.',
          guidance: { time: '45–60 s' },
          safety: 'hotPan',
          minSec: 45,
          maxSec: 60,
          extendSec: 15,
          cues: ['Golden underneath.', 'The centre springs back when pressed — no wet batter.'],
          confirmLabel: 'Looks cooked through',
        },
        {
          id: 'heat-off',
          kind: 'check',
          label: 'Heat off',
          instruction: 'Turn the burner off.',
          safety: 'hotPan',
          confirmLabel: 'Heat is off',
        },
        {
          id: 'plate',
          kind: 'check',
          label: 'Plate',
          instruction: 'Slide the pancake onto a plate.',
          confirmLabel: 'It is on the plate',
        },
      ],
    },
  ],
};

/** Flat list helpers */
export function microAt(stepIndex: number, microIndex: number): MicroAction | undefined {
  return recipeConfig.steps[stepIndex]?.micro[microIndex];
}

export const allMicroActions: MicroAction[] = recipeConfig.steps.flatMap((s) => s.micro);
