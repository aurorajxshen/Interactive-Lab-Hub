import { motion } from 'framer-motion';
import { keyboardMap } from '../config/interactionConfig';
import { RECORDED_VOICE, type VoiceGuidance } from '../voice/useVoiceGuidance';
import { clipKeys, voiceSample } from '../voice/voiceLines';
import type { SensorBridge } from '../sensors/useSensorBridge';

const keyName = (k: string) => (k === ' ' ? 'Space' : k === 'ArrowLeft' ? '←' : k === 'ArrowRight' ? '→' : k.length === 1 ? k.toUpperCase() : k);

export function HelpOverlay({ onClose, voice, sensors }: { onClose: () => void; voice: VoiceGuidance; sensors: SensorBridge }) {
  const st = sensors.status;
  return (
    <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="help" role="dialog" aria-label="Help" onClick={(e) => e.stopPropagation()} initial={{ y: 16 }} animate={{ y: 0 }}>
        <h2>How this works</h2>
        <div className="help-grid">
          <div>
            <h4>Confirming</h4>
            <p>Each step is made of small actions. Nothing moves on until you confirm, so looking ahead never completes anything.</p>
            <h4>Motion</h4>
            <p>
              Steps with movement (chopping, twisting, whisking, pouring, flipping) show motion feedback under the illustration. It comes from the wearable sensors when they are connected, or from the <strong>Preview motion</strong> button. It is feedback only.
            </p>
            <h4>Timers</h4>
            <p>Times are references. Check the food, not the clock.</p>
            <h4>Wearable sensors</h4>
            <p>
              With the Raspberry Pi bridge running, a forward nod confirms, a nod to the right looks ahead and a nod to the left undoes. Hand movement only
              shows feedback — it never completes or measures a step.
            </p>
            <div className="voice-settings">
              <label>
                <span>Bridge address</span>
                <input type="url" value={st.url} onChange={(e) => sensors.setUrl(e.target.value)} spellCheck={false} />
              </label>
              <label className="check">
                <input type="checkbox" checked={st.enabled} onChange={(e) => sensors.setEnabled(e.target.checked)} />
                <span>Connect to sensors</span>
              </label>
              {st.enabled && (
                <p className="muted">
                  Link: {st.link}
                  {st.source ? ` (${st.source})` : ''} · head {st.sensors.HF === false ? 'unavailable' : st.sensors.HF ? 'ok' : '—'} · hands{' '}
                  {st.sensors.LH === false || st.sensors.RH === false ? 'unavailable' : st.sensors.LH && st.sensors.RH ? 'ok' : '—'}
                  {st.handState ? ` · hand state: ${st.handState}` : ''}
                </p>
              )}
            </div>
            <h4>Tool check-ins</h4>
            <p>A few actions ask you to put a tool somewhere safe. Only you can confirm that — nothing on screen or on your wrist checks it.</p>
          </div>
          <div>
            <h4>Keyboard</h4>
            <dl className="keys">
              <dt>{keyboardMap.confirm.map(keyName).join(' / ')}</dt>
              <dd>Confirm</dd>
              <dt>← / →</dt>
              <dd>Previous / next step</dd>
              <dt>{keyboardMap.undo.map(keyName).join(' / ')}</dt>
              <dd>Undo</dd>
              <dt>{keyName(keyboardMap.pause[0])}</dt>
              <dd>Pause / resume</dd>
              <dt>{keyName(keyboardMap.motion[0])}</dt>
              <dd>Preview motion on / off</dd>
              <dt>{keyName(keyboardMap.voice[0])}</dt>
              <dd>Read aloud / stop</dd>
              <dt>{keyboardMap.help.map(keyName).join(' / ')}</dt>
              <dd>This help</dd>
            </dl>
            <h4>Voice</h4>
            {voice.supported ? (
              <div className="voice-settings">
                <label>
                  <span>Voice</span>
                  <select
                    value={voice.recorded ? RECORDED_VOICE : (voice.voice?.voiceURI ?? '')}
                    onChange={(e) => voice.setVoiceURI(e.target.value || null)}
                    disabled={voice.voices.length === 0 && !voice.hasRecordings}
                  >
                    {voice.hasRecordings && <option value={RECORDED_VOICE}>Recorded voice (natural)</option>}
                    {voice.voices.length === 0 && !voice.hasRecordings && <option value="">Browser default</option>}
                    {voice.voices.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="check">
                  <input type="checkbox" checked={voice.autoRead} onChange={(e) => voice.setAutoRead(e.target.checked)} />
                  <span>Read each new action aloud</span>
                </label>
                <button className="text-btn" onClick={() => voice.speak(voiceSample, 'help-sample', { clip: clipKeys.sample })}>
                  Hear a sample
                </button>
                {voice.recorded && (
                  <p className="muted">
                    {voice.recorded.credit} ({voice.recorded.name}). Lines without a recording use the browser voice.
                  </p>
                )}
                <p className="muted">Browser voices are free and work offline. Each new action is read aloud once you start cooking; never on page load.</p>
              </div>
            ) : (
              <p className="muted">This browser has no speech voices. All guidance is on screen.</p>
            )}
          </div>
        </div>
        <button className="confirm is-secondary" onClick={onClose}>
          Close
        </button>
      </motion.div>
    </motion.div>
  );
}
