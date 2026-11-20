# Recipe in Motion — V0.1 (UI only)

An illustrated cooking companion for a scallion egg pancake: eight stages, hand-drawn animated scenes, timers and counters, confirmation and undo, and a Recipe Memory page at the end.

**This version is UI only.** Wearable sensors and head gestures are not connected yet. Each action is confirmed with on-screen buttons or the keyboard. Steps that involve movement have a **Preview motion** toggle that drives the animations and motion timers in place of a sensor.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build
```

## Keyboard

| Key | Action |
| --- | --- |
| Enter / Space | Confirm the current action |
| ← / → | Look at previous / next step (never completes anything) |
| Backspace / Z | Undo |
| P | Pause / resume (timers stop) |
| M | Preview motion on / off |
| H / ? | Help |

## Structure

```
src/
  config/
    recipeConfig.ts       all recipe content: steps, micro-actions, quantities, reference times, branch options
    interactionConfig.ts  UI timings: debounce, early-confirm window, notice length, keyboard map
  state/
    recipeState.ts        pure reducer: progress pointer vs. viewed step, counts, timers, undo, branches
    useCookingSession.ts  hook the UI talks to; hosts the motion preview
  memory/recipeMemory.ts  builds and stores Recipe Memory entries (localStorage)
  illustrations/
    sketch.tsx            the drawing language: ink / crayon / pencil SVG filters, seeded wobble paths, useMotionPhase
    objects.tsx           reusable objects: bowl, pan, burner, knife, scallion, egg, jug, spoon, grinder, whisk, spatula, plate, pancake…
    scenes/               one scene per stage + registry (recipeConfig refers to scenes by id)
    HeroPancake, IngredientSketch, MotionSignature
  components/             Header, MotionFeedback, MicroTrail, InspectionPrompt, Controls, HelpOverlay
  screens/                Welcome, Prep, Cooking, Memory
```

### Data-driven micro-actions

Every step is a list of micro-actions in `recipeConfig.ts`, and each one has a `kind`:

- `check`: confirm once (egg, water, heat on, oil, heat off, plate)
- `counter`: count to a target, then confirm (flour 0/3, salt 0/2, optional pepper 0/2)
- `motion`: the movement shows feedback and the cook confirms (chop, pour, flip)
- `activeDuration`: only time spent moving is counted; an optional `inspection` opens a check-in at the reference time and **never auto-completes** (whisk 30 s with Smooth / Still lumpy / Too thick → +5 mL water; stir 5–10 s)
- `timer`: a reference timer with cues and a +N s button; confirming before the reference minimum needs a second confirmation (preheat, first side, second side)

To change quantities, times, labels or branch options, edit `recipeConfig.ts`. To change timings and keys, edit `interactionConfig.ts`.

### State rules

- **Progress and view are separate.** `active` is where the cook is; `viewedStep` is only what's on screen. Looking ahead shows a banner and blocks confirmation. "Skip ahead to here" or "Redo this step" changes progress explicitly.
- **Motion never completes anything.** `MOTION` actions only update motion records. Progress only moves on `CONFIRM`, `INCREMENT`, `CHOOSE_BRANCH`, `SKIP_MICRO` or `JUMP_TO_VIEWED`.
- The first-side timer starts only after pouring is confirmed, and the second-side timer only after the flip is confirmed (a timer starts when its micro-action becomes active).
- Confirmations closer together than 900 ms are de-duplicated. Every progress action can be undone (40 levels).

## Where sensors will plug in

The reducer already accepts the actions a sensor route would send:

- `{ type: 'MOTION', classifier, signal: 'active' | 'stopped' | 'sample', intensity }`: the movement of the active micro-action. Movements that don't match the active action are ignored.
- `{ type: 'CONFIRM', source: 'gesture' }`: a nod
- `{ type: 'NAV', dir: 1 | -1 }`: a head flick

Today `useCookingSession` sends `MOTION` from the preview toggle. A sensor route would send the same actions and replace the preview. Still to build: the event types, sensor adapter, context filtering, gesture cooldowns and confidence thresholds, safety locks for knife and hot pan, and device connect/disconnect UI.

## Real vs. illustrative

| | |
| --- | --- |
| Real (recorded in this session) | step and micro-action timestamps, counts, timer elapsed, active-motion duration, branch choices, pauses, notes, photo |
| Simulated | all motion input (Preview motion toggle, fixed intensity with jitter) |
| Illustrative | scallion rings appearing, flour flecks fading, batter spread, the whisking signature shape. These show progress and are not measurements. |

## Known limitations / next

- No sensor or gesture input yet (see above).
- Illustration polish: the pan handle and plate overlap on the plating scene; the bowl's flower band reads small; the pepper grinder sits close to the bowl rim.
- The guidance label for whisking doesn't update when the "lumpy" or "too thick" branch extends the reference (the progress bar and check-in do).
- Photos are stored as data URLs in localStorage, so large photos may not persist.
- Desktop 16:9 first. Narrow screens stack the layout but haven't been designed.
