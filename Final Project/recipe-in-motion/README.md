# Recipe in Motion — V0.2

An illustrated cooking companion for a scallion egg pancake: eight stages, hand-drawn animated scenes, reference timers, tool-return safety check-ins, a task-complete mark, free browser voice guidance, confirmation and undo, and a Recipe Memory page at the end.

**Sensors are connectable but optional.** With the Raspberry Pi bridge running (see [bridge/README.md](bridge/README.md)), a forward nod confirms, a right nod looks ahead and a left nod undoes; hand movement drives motion feedback only. Without it, every action is confirmed with on-screen buttons or the keyboard, and steps with movement have a **Preview motion** toggle in place of a sensor.

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
| V | Read the current action aloud / stop |
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
  components/             Header (+ sensor chip), GuidancePanel, MotionFeedback, MicroTrail, InspectionPrompt,
                          Controls (helper label + confirm), TaskCompleteMark, HelpOverlay (voice + sensor settings)
  screens/                Welcome, Prep, Cooking (stable grid regions), Memory
  voice/useVoiceGuidance.ts  Web Speech API: explicit play/stop, never autoplays on load, best English voice
  sensors/
    protocol.ts           typed reader/validator for kitchen-motion.v1 (the Pi's JSON lines)
    sensorAdapter.ts      maps messages to recipe intents (dedupe, stale-gesture gate, context filter)
    useSensorBridge.ts    opt-in Server-Sent Events connection to the bridge
bridge/
  sensor_bridge.py        runs motion_live.py on the Pi and streams its JSON to the page (stdlib only)
  fixtures/               real logs from the teammate repo, for replay without hardware
```

### Data-driven micro-actions

Every step is a list of micro-actions in `recipeConfig.ts`, and each one has a `kind`:

- `check`: confirm once (egg, water, all 3 flour scoops, salt, optional pepper, heat on, oil, plate). Scoops and grinder twists are not counted: nothing can count them reliably, and the backend's twist counts must not be used as quantities.
- `toolReturn`: the cook confirms a tool is resting safely (knife, spoon, grinders, whisk, work area, heat off · spatula). Always a deliberate confirmation, never sensor-verified.
- `counter`: count to a target (supported by the reducer; not used by the current recipe)
- `motion`: the movement shows feedback and the cook confirms (chop, pour, flip)
- `activeDuration`: only time spent moving is counted; an optional `inspection` opens a check-in at the reference time and **never auto-completes** (whisk 30 s with Smooth / Still lumpy / Too thick → +5 mL water; stir 5–10 s)
- `timer`: a reference timer with cues and a +N s button; confirming before the reference minimum needs a second confirmation (preheat, first side, second side)

To change quantities, times, labels or branch options, edit `recipeConfig.ts`. To change timings and keys, edit `interactionConfig.ts`.

### State rules

- **Progress and view are separate.** `active` is where the cook is; `viewedStep` is only what's on screen. Looking ahead shows a banner and blocks confirmation. "Skip ahead to here" or "Redo this step" changes progress explicitly.
- **Motion never completes anything.** `MOTION` actions only update motion records. Progress only moves on `CONFIRM`, `INCREMENT`, `CHOOSE_BRANCH`, `SKIP_MICRO` or `JUMP_TO_VIEWED`.
- The first-side timer starts when pouring is confirmed (`clockFrom: 'pour-batter'`), even though the "Work area clear" check-in comes in between; the second-side timer starts when the flip is confirmed. Pausing pauses both.
- Confirmations closer together than 900 ms are de-duplicated. Every progress action can be undone (40 levels).

## Sensors (kitchen-motion.v1)

`motion_live.py` (teammate repo) prints one JSON object per line. `bridge/sensor_bridge.py` streams them to the page; `src/sensors/` validates and maps them:

| Message | Effect in the app |
| --- | --- |
| `head_event` confirm | `CONFIRM` (source `gesture`) only — never confirm + next. While looking ahead it only returns to the current step. |
| `head_event` next / undo | look ahead (`NAV`) / `UNDO` |
| `state.hand_state` chop / stir / twist | `MOTION` feedback when it matches the active action (twist is treated as stirring while whisking) |
| `hand_event` flip / twist_* | short `MOTION` feedback pulse, only on the flip / twisting action; counts are cumulative and diffed against a per-action baseline, never added |
| `sensor_fault`, silence > 3 s, `stopped`, `fatal` | chip shows the problem; motion feedback stops; buttons and keys keep working |

Gestures from before the page connected, duplicates (`sessionId`, `seq`) and gestures older than 2 s are ignored, so reconnecting never replays old nods.

## Real vs. illustrative

| | |
| --- | --- |
| Real (recorded in this session) | step and micro-action timestamps, counts, timer elapsed, active-motion duration, branch choices, pauses, notes, photo |
| Sensed (when connected) | head gestures and hand states from the Pi — experimental candidates, feedback only |
| Simulated | motion from the Preview motion toggle (fixed intensity with jitter) |
| Illustrative | scallion rings appearing, flour flecks fading, batter spread, the whisking signature shape. These show progress and are not measurements. |

## Known limitations / next

- The bridge has been tested by replaying real logs, not yet on the Pi with live sensors.
- Pouring has no sensor signal; it still uses Preview motion.
- Illustration polish: the pan handle and plate overlap on the plating scene; the bowl's flower band reads small; the pepper grinder sits close to the bowl rim.
- The guidance label for whisking doesn't update when the "lumpy" or "too thick" branch extends the reference (the progress bar and check-in do).
- Photos are stored as data URLs in localStorage, so large photos may not persist.
- Layout checked at 1440×900, 1280×720, 768×1024 and 390×844; below 900 px it stacks into one column with sticky controls.
