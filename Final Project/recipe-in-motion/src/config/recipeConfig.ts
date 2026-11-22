/**
 * recipeConfig — the single editable source for recipe content.
 *
 * Every quantity, reference time, micro-action and piece of on-screen /
 * spoken copy lives here as data. Values are PROVISIONAL (V0.1) and are
 * expected to change after testing.
 *
 * Nothing in this file implies that a timer, an animation or a motion sensor
 * verifies quantity, doneness, tool safety or food safety — the cook always
 * decides and confirms.
 */

export type ClassifierId = 'CHOPPING' | 'TWISTING' | 'WHISKING' | 'POURING' | 'FLIPPING';
export type SafetyContext = 'knife' | 'hotPan';
export type SceneId = 'chop' | 'batter' | 'season' | 'whisk' | 'scallions' | 'pan' | 'flip' | 'plate';
/** Step accent — drives the task-complete mark and small highlights */
export type AccentId = 'green' | 'egg' | 'blue' | 'terracotta';
/** Tools that get an explicit "returned safely" checkpoint */
export type ToolId = 'knife' | 'spoon' | 'grinders' | 'whisk' | 'workArea' | 'heatAndSpatula';

/** Large glanceable numbers drawn beside the illustration */
export interface Measure {
  /** e.g. "45 mL" */
  quantity?: string;
  /** e.g. "≈ 30 s active" */
  time?: string;
}

/** All copy for one micro-action. Rendered in one place (GuidancePanel). */
export interface GuidanceCopy {
  /** One concise instruction sentence */
  instruction: string;
  /** Optional technique tip */
  tip?: string;
  /** Short supporting note (e.g. "level, not heaped") */
  note?: string;
  /** Safety cue — shown with a safety style; spoken in preference to the tip */
  safety?: string;
  /** Concise spoken version. Defaults to instruction + (safety ?? tip). */
  speech?: string;
}

interface BaseMicro {
  id: string;
  /** Short label used in the micro-action trail */
  label: string;
  guidance: GuidanceCopy;
  measure?: Measure;
  /** Which movement this action involves (the UI shows motion feedback for it;
   *  sensor recognition will be routed here later) */
  classifier?: ClassifierId;
  /** Marks knife / hot-pan actions (safety styling now, gesture lock later) */
  safety?: SafetyContext;
  /** Optional actions can be skipped without a warning */
  optional?: boolean;
  /** Text of the main confirm button */
  confirmLabel: string;
  /** Past-tense completion text (task-complete mark, timeline). Defaults: see doneLabelFor. */
  doneLabel?: string;
  /** Stable helper line above the confirm button. Defaults by kind (see confirmHelpers). */
  helper?: string;
}

export interface CheckMicro extends BaseMicro {
  kind: 'check';
}

/**
 * The cook confirms a tool is back in a safe resting place.
 * This is ALWAYS a deliberate confirmation — never verified by a sensor.
 */
export interface ToolReturnMicro extends BaseMicro {
  kind: 'toolReturn';
  tool: ToolId;
  /** Where the tool should rest (hand-lettered next to the scene's rest spot) */
  restLabel: string;
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
  /**
   * Start the clock when this earlier micro-action is confirmed, even if other
   * actions (e.g. a tool check-in) come in between. Never starts before it.
   */
  clockFrom?: string;
}

export type MicroAction = CheckMicro | ToolReturnMicro | CounterMicro | MotionMicro | ActiveDurationMicro | TimerMicro;
export type MicroKind = MicroAction['kind'];

export interface RecipeStep {
  id: string;
  title: string;
  shortTitle: string;
  /** Step-level summary, shown when looking ahead or reviewing a finished step */
  intro: string;
  scene: SceneId;
  accent: AccentId;
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

/** Default helper line above the confirm button, by micro-action kind */
export const confirmHelpers: Record<MicroKind, string> = {
  check: 'Confirm when it is done',
  toolReturn: 'Confirm when the tool is safely returned',
  counter: 'Count each one as you do it',
  motion: 'Confirm when it is done — motion is only feedback',
  activeDuration: 'Check it, then confirm',
  timer: 'Confirm after checking the cues',
};

/** Helper copy for states that are not tied to one micro-action */
export const stateHelpers = {
  inspection: 'Choose what you see',
  paused: 'Paused — resume to confirm',
  previewing: 'Looking ahead — nothing here is completed',
  finished: 'Plated. Your Recipe Memory is ready',
  finishing: 'Plated — finishing up',
};

export const accentColors: Record<AccentId, string> = {
  green: '#91A875',
  egg: '#E8B64B',
  blue: '#8AA9B5',
  terracotta: '#C97563',
};

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
      accent: 'green',
      micro: [
        {
          id: 'chop-scallion',
          kind: 'motion',
          label: 'Chop',
          guidance: {
            instruction: 'Chop half a scallion into thin rings, 2–3 mm wide.',
            note: 'Use the white and light-green parts first.',
            safety: 'Keep your fingertips curled under, away from the blade.',
            speech: 'Chop half a scallion into thin rings, two to three millimetres wide. Keep your fingertips curled under.',
          },
          measure: { quantity: '½ scallion' },
          classifier: 'CHOPPING',
          safety: 'knife',
          confirmLabel: 'Scallion is chopped',
          helper: 'Confirm when you have stopped chopping',
        },
        {
          id: 'knife-down',
          kind: 'toolReturn',
          tool: 'knife',
          label: 'Knife down',
          restLabel: 'flat · blade away',
          guidance: {
            instruction: 'Put the knife down flat on the board, blade facing away from you.',
            safety: 'Never leave it near the board edge or under the scallion.',
            speech: 'Put the knife down flat on the board, with the blade facing away from you.',
          },
          safety: 'knife',
          confirmLabel: 'Knife is safe',
          helper: 'Confirm when the knife is safely down',
        },
      ],
    },
    {
      id: 'batter',
      title: 'Egg, water & flour',
      shortTitle: 'Batter',
      intro: 'Three things into one bowl, one at a time.',
      scene: 'batter',
      accent: 'egg',
      micro: [
        {
          id: 'add-egg',
          kind: 'check',
          label: 'Egg',
          guidance: {
            instruction: 'Crack one egg into the bowl.',
            tip: 'Crack it on the flat counter, not the bowl rim — fewer shell pieces.',
          },
          measure: { quantity: '1 egg' },
          confirmLabel: 'Egg is in',
          helper: 'Confirm when the egg is in the bowl',
        },
        {
          id: 'add-water',
          kind: 'check',
          label: 'Water',
          guidance: {
            instruction: 'Pour in 45 mL of water.',
            note: '45 mL is 3 tablespoons.',
            speech: 'Pour in forty-five millilitres of water. That is three tablespoons.',
          },
          measure: { quantity: '45 mL' },
          confirmLabel: 'Water is in',
          helper: 'Confirm when the water is in',
        },
        {
          // One confirmation for all three scoops: nothing can count scoops reliably, so the cook does.
          id: 'add-flour',
          kind: 'check',
          label: 'Flour',
          guidance: {
            instruction: 'Add three level scoops of flour with the 15 mL spoon.',
            note: 'Level, not heaped — sweep the top flat.',
            speech: 'Add three level scoops of flour with the fifteen millilitre spoon. Level, not heaped. Nod when all three are in.',
          },
          measure: { quantity: '3 × 15 mL' },
          confirmLabel: 'All 3 scoops are in',
          doneLabel: 'Flour · 3 scoops',
          helper: 'Nod or confirm once all 3 scoops are in',
        },
        {
          id: 'spoon-return',
          kind: 'toolReturn',
          tool: 'spoon',
          label: 'Spoon back',
          restLabel: 'spoon rest',
          guidance: {
            instruction: 'Put the measuring spoon back on its rest, out of the way of the bowl.',
            speech: 'Put the measuring spoon back on its rest.',
          },
          confirmLabel: 'Spoon returned',
        },
      ],
    },
    {
      id: 'season',
      title: 'Salt & pepper',
      shortTitle: 'Season',
      intro: 'A few twists of the grinder over the bowl.',
      scene: 'season',
      accent: 'blue',
      micro: [
        {
          // Twist motion is feedback only. The sensor's twist counts must not measure seasoning
          // (stirring produces false twist events), so the cook confirms once when done.
          id: 'add-salt',
          kind: 'check',
          label: 'Salt',
          guidance: {
            instruction: 'Twist the salt grinder twice over the bowl.',
            note: 'Two full turns of the top.',
            speech: 'Twist the salt grinder twice over the bowl. Nod when you are done.',
          },
          measure: { quantity: '2 twists' },
          classifier: 'TWISTING',
          confirmLabel: 'Salt is in',
          doneLabel: 'Salt · 2 twists',
          helper: 'Nod or confirm after both twists',
        },
        {
          id: 'add-pepper',
          kind: 'check',
          label: 'Pepper',
          guidance: {
            instruction: 'Optional: twist the pepper grinder twice over the bowl.',
            tip: 'Prefer it mild? Skip pepper — nothing else changes.',
            speech: 'Optional: twist the pepper grinder twice over the bowl, or skip it. Nod when you are done.',
          },
          measure: { quantity: '2 twists' },
          classifier: 'TWISTING',
          optional: true,
          confirmLabel: 'Pepper is in',
          doneLabel: 'Pepper · 2 twists',
          helper: 'Nod or confirm after both twists — or skip',
        },
        {
          id: 'grinders-return',
          kind: 'toolReturn',
          tool: 'grinders',
          label: 'Grinders back',
          restLabel: 'side by side',
          guidance: {
            instruction: 'Stand both grinders upright together, away from the bowl.',
            speech: 'Stand both grinders upright together, away from the bowl.',
          },
          confirmLabel: 'Grinders returned',
          helper: 'Confirm when both grinders are back',
        },
      ],
    },
    {
      id: 'whisk',
      title: 'Whisk until smooth',
      shortTitle: 'Whisk',
      intro: 'About thirty seconds of steady whisking.',
      scene: 'whisk',
      accent: 'egg',
      micro: [
        {
          id: 'whisk-batter',
          kind: 'activeDuration',
          label: 'Whisk',
          guidance: {
            instruction: 'Whisk steadily until there is no dry flour.',
            tip: 'Scrape the sides of the bowl once or twice so no flour hides there.',
            speech: 'Whisk steadily for about thirty seconds, until there is no dry flour.',
          },
          measure: { time: '≈ 30 s active' },
          classifier: 'WHISKING',
          targetSec: 30,
          confirmLabel: 'Check the batter',
          doneLabel: 'Batter is smooth',
          helper: 'Lift the whisk and look, then check',
          inspection: {
            question: 'Lift the whisk and look. How is the batter?',
            options: [
              { id: 'smooth', label: 'Smooth', description: 'No dry flour, no lumps.', effect: { type: 'complete' } },
              { id: 'lumpy', label: 'Still lumpy', description: 'Keep whisking another 10 s.', effect: { type: 'continue', addSec: 10 } },
              { id: 'thick', label: 'Too thick', description: 'Add 5 mL water, then mix again.', effect: { type: 'adjust', addSec: 10, note: '+5 mL water' } },
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
      accent: 'green',
      micro: [
        {
          id: 'add-scallions',
          kind: 'check',
          label: 'Add',
          guidance: {
            instruction: 'Tip all the chopped scallion into the batter.',
            tip: 'Keep using the same whisk — no need to put it down yet.',
          },
          measure: { quantity: 'all of it' },
          confirmLabel: 'Scallion is in',
          helper: 'Confirm when the scallion is in',
        },
        {
          id: 'stir-scallions',
          kind: 'activeDuration',
          label: 'Stir',
          guidance: {
            instruction: 'Stir gently for 5–10 seconds, just until the green is spread through.',
            speech: 'Stir gently for five to ten seconds, just until the green is spread through.',
          },
          measure: { time: '5–10 s' },
          classifier: 'WHISKING',
          targetSec: 5,
          maxSec: 10,
          confirmLabel: 'Evenly mixed',
          helper: 'Confirm when the green is spread through',
        },
        {
          id: 'whisk-return',
          kind: 'toolReturn',
          tool: 'whisk',
          label: 'Whisk down',
          restLabel: 'on the plate',
          guidance: {
            instruction: 'Set the whisk down on a plate or spoon rest, away from the counter edge.',
            speech: 'Set the whisk down on a plate or spoon rest.',
          },
          confirmLabel: 'Whisk set down',
        },
      ],
    },
    {
      id: 'pan',
      title: 'Heat, oil & pour',
      shortTitle: 'Pan',
      intro: 'A gentle heat and a thin film of oil.',
      scene: 'pan',
      accent: 'terracotta',
      micro: [
        {
          id: 'heat-on',
          kind: 'check',
          label: 'Heat on',
          guidance: {
            instruction: 'Set the pan on the burner and turn it to medium-low.',
            safety: 'Turn the pan handle inward, away from the counter edge.',
          },
          safety: 'hotPan',
          confirmLabel: 'Burner is on, medium-low',
          helper: 'Confirm when the burner is on',
        },
        {
          id: 'preheat',
          kind: 'timer',
          label: 'Preheat',
          guidance: {
            instruction: 'Let the pan warm for about 45–60 seconds.',
            safety: 'Hot pan — keep the handle turned inward.',
            speech: 'Let the pan warm for about forty-five to sixty seconds.',
          },
          measure: { time: '45–60 s' },
          safety: 'hotPan',
          minSec: 45,
          maxSec: 60,
          extendSec: 15,
          cues: ['Hold a hand above the pan — you should feel gentle warmth.'],
          confirmLabel: 'Pan is warm',
          helper: 'Confirm when you feel gentle warmth',
        },
        {
          id: 'add-oil',
          kind: 'check',
          label: 'Oil',
          guidance: {
            instruction: 'Add 2.5 mL of oil and tilt the pan to coat.',
            note: '2.5 mL is half a teaspoon.',
            safety: 'Hot pan — keep the handle turned inward.',
            speech: 'Add half a teaspoon of oil and tilt the pan to coat.',
          },
          measure: { quantity: '2.5 mL' },
          safety: 'hotPan',
          confirmLabel: 'Oil is in',
          helper: 'Confirm when the oil coats the pan',
        },
        {
          id: 'pour-batter',
          kind: 'motion',
          label: 'Pour',
          guidance: {
            instruction: 'Pour in all of the batter and let it spread into a round.',
            tip: 'Use the scraper to get the last of it out of the bowl.',
            safety: 'Hot pan — keep the handle turned inward.',
          },
          measure: { quantity: 'all the batter' },
          classifier: 'POURING',
          safety: 'hotPan',
          confirmLabel: 'All batter is poured',
          helper: 'Confirm when the bowl is empty',
        },
        {
          id: 'clear-area',
          kind: 'toolReturn',
          tool: 'workArea',
          label: 'Clear area',
          restLabel: 'away from heat',
          guidance: {
            instruction: 'Move the bowl and scraper away from the hot burner and clear the space beside the pan.',
            safety: 'Nothing plastic or paper next to the burner.',
            speech: 'Move the bowl and scraper away from the burner, and clear the space beside the pan.',
          },
          safety: 'hotPan',
          confirmLabel: 'Work area clear',
          helper: 'Confirm when the area by the burner is clear',
        },
      ],
    },
    {
      id: 'first-side',
      title: 'Cook, then flip',
      shortTitle: 'Flip',
      intro: 'Wait for set edges, then turn it over.',
      scene: 'flip',
      accent: 'terracotta',
      micro: [
        {
          id: 'cook-first',
          kind: 'timer',
          label: 'First side',
          guidance: {
            instruction: 'Cook undisturbed, then check the edges before flipping.',
            safety: 'Hot pan — keep the handle turned inward.',
            note: 'The clock started when you confirmed the pour.',
            speech: 'Cook undisturbed for about ninety seconds to two minutes, then check the edges.',
          },
          measure: { time: '90–120 s' },
          safety: 'hotPan',
          minSec: 90,
          maxSec: 120,
          extendSec: 20,
          clockFrom: 'pour-batter',
          cues: ['Edges look set and matte, not glossy.', 'A spatula slides under and lifts it without tearing.'],
          confirmLabel: 'Edges set — ready to flip',
          helper: 'Confirm when the edges look set',
        },
        {
          id: 'flip',
          kind: 'motion',
          label: 'Flip',
          guidance: {
            instruction: 'Slide the spatula under and turn the pancake over in one motion.',
            tip: 'Flip low and close to the pan — less splash.',
            safety: 'Hot pan — keep the handle turned inward.',
          },
          classifier: 'FLIPPING',
          safety: 'hotPan',
          confirmLabel: 'It is flipped',
          helper: 'Confirm after the flip',
        },
      ],
    },
    {
      id: 'second-side',
      title: 'Finish & plate',
      shortTitle: 'Plate',
      intro: 'A short second side, heat off, onto the plate.',
      scene: 'plate',
      accent: 'egg',
      micro: [
        {
          id: 'cook-second',
          kind: 'timer',
          label: 'Second side',
          guidance: {
            instruction: 'Cook the second side, then check it.',
            safety: 'Hot pan — keep the handle turned inward.',
            speech: 'Cook the second side for about forty-five to sixty seconds, then check it.',
          },
          measure: { time: '45–60 s' },
          safety: 'hotPan',
          minSec: 45,
          maxSec: 60,
          extendSec: 15,
          cues: ['Golden underneath.', 'The centre springs back when pressed — no wet batter.'],
          confirmLabel: 'Looks cooked through',
          helper: 'Confirm after checking the cues',
        },
        {
          id: 'heat-off-tools',
          kind: 'toolReturn',
          tool: 'heatAndSpatula',
          label: 'Heat off',
          restLabel: 'spatula resting',
          guidance: {
            instruction: 'Turn the burner off, then rest the spatula on a plate away from the hot pan.',
            safety: 'The pan stays hot after the burner is off — hold it by the handle only.',
            speech: 'Turn the burner off, then rest the spatula away from the hot pan.',
          },
          safety: 'hotPan',
          confirmLabel: 'Heat off · tools safe',
          helper: 'Confirm when the heat is off and the spatula is resting',
        },
        {
          id: 'plate',
          kind: 'check',
          label: 'Plate',
          guidance: {
            instruction: 'Tilt the pan and slide the pancake onto the plate.',
            safety: 'Hold the pan by its handle — it is still hot.',
          },
          confirmLabel: 'It is on the plate',
          helper: 'Confirm when it is on the plate',
        },
      ],
    },
  ],
};

/* ───────── helpers ───────── */

export function microAt(stepIndex: number, microIndex: number): MicroAction | undefined {
  return recipeConfig.steps[stepIndex]?.micro[microIndex];
}

export const allMicroActions: MicroAction[] = recipeConfig.steps.flatMap((s) => s.micro);

export function helperFor(m: MicroAction): string {
  return m.helper ?? confirmHelpers[m.kind];
}

/** Concise spoken text: instruction plus at most one essential safety note or tip */
export function speechFor(m: MicroAction): string {
  const g = m.guidance;
  if (g.speech) return g.speech;
  const extra = g.safety ?? g.tip;
  return extra ? `${g.instruction} ${extra}` : g.instruction;
}

/** What a finished micro-action is called, e.g. "Flour · 3 scoops", "Knife is safe" */
export function doneLabelFor(m: MicroAction): string {
  if (m.doneLabel) return m.doneLabel;
  if (m.kind === 'counter') return `${m.label} · ${m.target} ${m.unitPlural}`;
  return m.confirmLabel;
}

export function stepOfMicro(microId: string): RecipeStep | undefined {
  return recipeConfig.steps.find((s) => s.micro.some((m) => m.id === microId));
}
