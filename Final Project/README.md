# Final Project: Recipe in Motion

An interactive cooking companion that guides you through a recipe with hand-drawn animated illustrations. The plan is for wearable motion sensors (head and hands) to recognise cooking movements, and for head gestures to confirm steps hands-free.

**Status: preliminary website (V0.1, UI only). Work in progress — this will keep changing.**

## Preliminary website

➡️ **[Website code: `recipe-in-motion/`](recipe-in-motion/)**. See its [README](recipe-in-motion/README.md) for how to run it and how it's structured.

- Recipe: scallion egg pancake, in eight stages (chop → batter → season → whisk → scallion → pan → flip → plate)
- Each stage is a hand-drawn SVG scene that animates with motion
- Steps are confirmed manually, with timers, counters, undo, pause and a batter-check branch
- A Recipe Memory page at the end shows a timeline, a whisking signature and notes

Sensors and head gestures are **not connected yet**. Motion is simulated with a "Preview motion" button, and steps are confirmed with buttons or the keyboard.

### Run it locally

```bash
cd "Final Project/recipe-in-motion"
npm install
npm run dev
```

Then open http://localhost:5173.
