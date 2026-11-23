/**
 * voiceLines — every sentence the app can speak, with a stable key.
 *
 * Used by the app (to find a pre-recorded clip for what it is about to say)
 * and by scripts/generate-voice.mjs (to record them). Text comes from
 * recipeConfig, so editing the recipe and re-running the script is all it
 * takes; a clip whose text no longer matches is ignored and the browser
 * voice is used instead.
 */
import { allMicroActions, recipeConfig, speechFor } from '../config/recipeConfig';

export interface VoiceLine {
  key: string;
  text: string;
}

export const voiceSample = 'This is how instructions will sound.';

export const clipKeys = {
  micro: (microId: string) => `micro-${microId}`,
  step: (stepId: string) => `step-${stepId}`,
  inspect: (microId: string) => `inspect-${microId}`,
  sample: 'sample',
};

/** What the step-level (look-ahead / finished step) read-out says */
export function stepSpeech(stepIndex: number) {
  const s = recipeConfig.steps[stepIndex];
  return `${s.title}. ${s.intro}`;
}

export function allVoiceLines(): VoiceLine[] {
  const lines: VoiceLine[] = [];
  recipeConfig.steps.forEach((s, i) => lines.push({ key: clipKeys.step(s.id), text: stepSpeech(i) }));
  allMicroActions.forEach((m) => {
    lines.push({ key: clipKeys.micro(m.id), text: speechFor(m) });
    if (m.kind === 'activeDuration' && m.inspection) lines.push({ key: clipKeys.inspect(m.id), text: m.inspection.question });
  });
  lines.push({ key: clipKeys.sample, text: voiceSample });
  return lines;
}

/** Shape of public/voice/manifest.json written by the generator */
export interface VoiceManifest {
  provider: string;
  voiceName: string;
  voiceId: string;
  modelId: string;
  generatedAt: string;
  /** Attribution line to show in the app (required on ElevenLabs' free plan) */
  credit: string;
  clips: Record<string, { file: string; text: string }>;
}
