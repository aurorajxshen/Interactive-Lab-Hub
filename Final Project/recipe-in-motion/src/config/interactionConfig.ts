/**
 * interactionConfig — editable UI timings and thresholds (V0.1, provisional).
 * Gesture mappings and sensor thresholds will be added here when the
 * sensor routes are connected.
 */
export const interactionConfig = {
  /** Two confirmations closer than this are treated as one (prevents double-clicks) */
  confirmDebounceMs: 900,
  /** Confirming a timer before its reference minimum needs a second confirm within this window */
  earlyConfirmWindowMs: 6000,
  /** Max stored intensity samples per micro-action (for Recipe Memory) */
  maxSamplesPerMicro: 1200,
  /** Motion preview: sample interval and default intensity */
  previewSampleMs: 250,
  previewIntensity: 0.65,
  /** Plating celebration before Recipe Memory */
  completionSequenceMs: 4200,
  noticeMs: 3600,
  undoDepth: 40,
  /** Task-complete mark: draw duration (circle + tick + settle) and how long it stays visible */
  completeMarkMs: 850,
  completeMarkHoldMs: 1900,
};

/**
 * Voice guidance (browser Web Speech API — free, local, no API key).
 * Voice never autoplays on load; the cook presses Play (or opts in to auto-read).
 */
export const voiceConfig = {
  rate: 0.97,
  pitch: 1.02,
  volume: 1,
  /** Ignore repeated Play presses closer than this */
  replayGuardMs: 600,
  /** Preferred voice names, best first (matched case-insensitively as substrings) */
  preferredNames: [
    'Ava (Premium)',
    'Ava (Enhanced)',
    'Samantha (Enhanced)',
    'Zoe (Premium)',
    'Zoe (Enhanced)',
    'Allison (Enhanced)',
    'Ava',
    'Samantha',
    'Microsoft Aria Online (Natural)',
    'Microsoft Jenny Online (Natural)',
    'Google US English',
    'Google UK English Female',
    'Microsoft Aria',
    'Microsoft Zira',
  ],
  /** Novelty / low-quality macOS voices that should never be auto-picked */
  avoidNames: ['Albert', 'Bad News', 'Bahh', 'Bells', 'Boing', 'Bubbles', 'Cellos', 'Good News', 'Jester', 'Organ', 'Superstar', 'Trinoids', 'Whisper', 'Wobble', 'Zarvox', 'Deranged', 'Hysterical', 'Pipe Organ', 'Junior', 'Ralph', 'Fred', 'Kathy', 'Princess', 'Grandma', 'Grandpa', 'Eddy', 'Flo', 'Reed', 'Rocko', 'Sandy', 'Shelley'],
  storageKey: 'recipe-in-motion.voice.v1',
};

/** Keyboard map. Change keys here; the help overlay reads from this list. */
export const keyboardMap = {
  confirm: ['Enter', ' '],
  next: ['ArrowRight'],
  prev: ['ArrowLeft'],
  undo: ['Backspace', 'z'],
  pause: ['p'],
  help: ['h', '?'],
  motion: ['m'],
  voice: ['v'],
};

export type KeyAction = keyof typeof keyboardMap;

/**
 * Sensor bridge (Raspberry Pi → bridge/sensor_bridge.py → Server-Sent Events → browser).
 * Off by default; buttons and keyboard always work, with or without sensors.
 */
export const sensorConfig = {
  /** e.g. http://raspberrypi.local:8765 — set in Help, or open the app with ?sensors=<url> */
  defaultUrl: 'http://raspberrypi.local:8765',
  storageKey: 'recipe-in-motion.sensors.v1',
  /** No message for this long → show "sensors unavailable" and stop motion feedback (backend publishes state every 1 s) */
  heartbeatTimeoutMs: 3000,
  /** A head gesture older than this when it reaches the page is ignored (stale, e.g. after a frozen tab) */
  maxGestureAgeMs: 2000,
  /** Consecutive non-matching hand states before motion feedback stops (state arrives ~1 Hz) */
  handMismatchToStop: 2,
  /** Motion feedback for one-off hand events (flip, twist stroke) lasts this long */
  handEventPulseMs: 1200,
  /** Intensity used for sensor-driven motion feedback (backend features are not an intensity scale) */
  sensorIntensity: 0.65,
};
