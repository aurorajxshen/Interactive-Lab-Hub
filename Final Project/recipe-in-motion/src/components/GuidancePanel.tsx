import type { GuidanceCopy } from '../config/recipeConfig';
import type { VoiceGuidance } from '../voice/useVoiceGuidance';

interface Props {
  /** Small kicker above the instruction, e.g. "Action 2 of 4 · Water" */
  kicker: string;
  guidance: GuidanceCopy;
  /** Visual doneness cues for timers (the timer is only a reference) */
  cues?: string[];
  /** Tool-return checkpoint: show the "your confirmation, not a sensor" line */
  toolReturn?: boolean;
  speech: string;
  speechKey: string;
  voice: VoiceGuidance;
  voiceDisabled?: boolean;
  tone?: 'default' | 'muted';
}

/**
 * The one place micro-action copy is rendered: instruction, tip, note,
 * safety cue, visual cues and the voice play/stop control.
 */
export function GuidancePanel({ kicker, guidance, cues, toolReturn, speech, speechKey, voice, voiceDisabled, tone = 'default' }: Props) {
  const playing = voice.speakingKey === speechKey;
  return (
    <section className={`guidance-panel is-${tone}`} aria-labelledby="guidance-instruction">
      <div className="gp-head">
        <p className="gp-kicker">{kicker}</p>
        {voice.supported && (
          <button
            type="button"
            className={`voice-btn ${playing ? 'is-on' : ''}`}
            onClick={() => voice.toggle(speech, speechKey)}
            disabled={voiceDisabled}
            aria-pressed={playing}
            aria-label={playing ? 'Stop reading aloud (V)' : 'Read this aloud (V)'}
            title={playing ? 'Stop (V)' : 'Read aloud (V)'}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden focusable="false">
              {playing ? (
                <path d="M7,6.5 C7.2,6.4 16.8,6.6 17,6.8 C17.2,9 17.1,15 17,17.2 C14.6,17.4 9.4,17.4 7,17.2 C6.8,14 6.8,9.6 7,6.5 Z" fill="currentColor" />
              ) : (
                <>
                  <path d="M4,9.4 L8,9.2 L12.6,5.2 C12.8,9.6 12.8,14.6 12.6,18.8 L8,14.8 L4,14.6 Z" fill="currentColor" />
                  <path d="M15.6,8.8 C17,10.6 17,13.4 15.6,15.2 M18.2,6.4 C21,9.6 21,14.4 18.2,17.6" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
                </>
              )}
            </svg>
            <span>{playing ? 'Stop' : 'Listen'}</span>
          </button>
        )}
      </div>

      <div className="gp-body">
        <p id="guidance-instruction" className="gp-instruction">
          {guidance.instruction}
        </p>
        {guidance.safety && (
          <p className="gp-line gp-safety">
            <span className="gp-tag">Safety</span>
            {guidance.safety}
          </p>
        )}
        {cues && cues.length > 0 && (
          <div className="gp-line gp-cues">
            <span className="gp-tag">Look for</span>
            <ul>
              {cues.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        )}
        {guidance.tip && (
          <p className="gp-line">
            <span className="gp-tag">Tip</span>
            {guidance.tip}
          </p>
        )}
        {guidance.note && (
          <p className="gp-line">
            <span className="gp-tag">Note</span>
            {guidance.note}
          </p>
        )}
        {toolReturn && <p className="gp-aside">This is your own check-in — nothing on screen can see where the tool is.</p>}
      </div>
    </section>
  );
}
