import { motion } from 'framer-motion';
import { keyboardMap } from '../config/interactionConfig';

const keyName = (k: string) => (k === ' ' ? 'Space' : k === 'ArrowLeft' ? '←' : k === 'ArrowRight' ? '→' : k.length === 1 ? k.toUpperCase() : k);

export function HelpOverlay({ onClose }: { onClose: () => void }) {
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
              Steps with movement (chopping, twisting, whisking, pouring, flipping) show motion feedback under the illustration. In this version that motion comes from the <strong>Preview motion</strong> button. Wearable sensors will
              be connected later.
            </p>
            <h4>Timers</h4>
            <p>Times are references. Check the food, not the clock.</p>
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
              <dt>{keyboardMap.help.map(keyName).join(' / ')}</dt>
              <dd>This help</dd>
            </dl>
          </div>
        </div>
        <button className="confirm is-secondary" onClick={onClose}>
          Close
        </button>
      </motion.div>
    </motion.div>
  );
}
