import { motion } from 'framer-motion';
import type { Inspection } from '../config/recipeConfig';

export function InspectionPrompt({ inspection, elapsedSec, targetSec, onChoose, onClose }: { inspection: Inspection; elapsedSec: number; targetSec: number; onChoose: (id: string) => void; onClose: () => void }) {
  return (
    <motion.div className="inspection" role="dialog" aria-label="Batter check" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <p className="inspection-kicker">
        {Math.floor(elapsedSec)} s active of ≈ {Math.round(targetSec)} s reference
      </p>
      <h3>{inspection.question}</h3>
      <div className="inspection-options">
        {inspection.options.map((o, i) => (
          <button key={o.id} className={`option ${i === 0 ? 'is-primary' : ''}`} onClick={() => onChoose(o.id)}>
            <span className="option-label">{o.label}</span>
            <span className="option-desc">{o.description}</span>
          </button>
        ))}
      </div>
      <button className="text-btn" onClick={onClose}>
        Not yet — keep whisking
      </button>
    </motion.div>
  );
}
