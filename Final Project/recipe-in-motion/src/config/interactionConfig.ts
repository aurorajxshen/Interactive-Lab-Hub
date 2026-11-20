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
};

export type KeyAction = keyof typeof keyboardMap;
