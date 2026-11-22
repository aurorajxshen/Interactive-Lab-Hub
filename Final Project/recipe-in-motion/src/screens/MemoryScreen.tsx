import { motion } from 'framer-motion';
import { HeroPancake } from '../illustrations/HeroPancake';
import { MotionSignature } from '../illustrations/MotionSignature';
import { formatDuration, type MemoryRecord } from '../memory/recipeMemory';
import { recipeConfig } from '../config/recipeConfig';

export function MemoryScreen({ memory, onUpdate, onRestart }: { memory: MemoryRecord; onUpdate: (p: Partial<MemoryRecord>) => void; onRestart: () => void }) {
  const total = Math.max(1, memory.steps.reduce((a, s) => a + s.durationMs, 0));
  const date = new Date(memory.finishedAt).toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' });

  const onPhoto = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onUpdate({ photo: String(reader.result) });
    reader.readAsDataURL(file);
  };

  return (
    <main className="memory">
      <motion.section className="memory-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <p className="kicker">Recipe Memory · {date}</p>
        <h1>
          My Pancake <em>#{String(memory.number).padStart(2, '0')}</em>
        </h1>
        <div className="memory-art">{memory.photo ? <img src={memory.photo} alt="Your pancake" /> : <HeroPancake flourish label="Your finished pancake" />}</div>
        <dl className="memory-facts">
          <div>
            <dt>Cooking time</dt>
            <dd>{formatDuration(memory.durationMs)}</dd>
          </div>
          <div>
            <dt>Paused</dt>
            <dd>{formatDuration(memory.pausedMs)}</dd>
          </div>
          <div>
            <dt>Whisking</dt>
            <dd>{formatDuration(memory.whisk.activeMs)} active</dd>
          </div>
          {memory.toolChecks && (
            <div>
              <dt>Tools returned</dt>
              <dd>
                {memory.toolChecks.confirmed} of {memory.toolChecks.total}
              </dd>
            </div>
          )}
        </dl>
        <p className="legend">
          <span className="legend-recorded">recorded</span> times come from this session’s confirmations and timers. Tool check-ins are your own confirmations{memory.toolChecks?.skipped.length ? ` (skipped: ${memory.toolChecks.skipped.join(', ')})` : ''}. Motion came from the preview button or the wearable sensors and was feedback only — it never measured quantity or doneness.
        </p>
      </motion.section>

      <section className="memory-timeline">
        <h2>How it went</h2>
        <div className="timeline-bar" aria-hidden>
          {memory.steps.map((s, i) => (
            <span key={s.id} className={`seg seg-${i % 4} ${s.skipped ? 'is-skipped' : ''}`} style={{ flexGrow: Math.max(0.04, s.durationMs / total) }} title={`${s.title}: ${formatDuration(s.durationMs)}`} />
          ))}
        </div>
        <ol className="timeline-list">
          {memory.steps.map((s, i) => (
            <li key={s.id} className={s.skipped ? 'is-skipped' : ''}>
              <span className="tl-num">{String(i + 1).padStart(2, '0')}</span>
              <span className="tl-title">{recipeConfig.steps[i]?.title ?? s.title}</span>
              <span className="tl-time">{s.skipped ? 'skipped' : formatDuration(s.durationMs)}</span>
              {s.details.length > 0 && <span className="tl-details">{s.details.join(' · ')}</span>}
            </li>
          ))}
        </ol>
      </section>

      <section className="memory-signature">
        <h2>Whisking signature</h2>
        <MotionSignature samples={memory.whisk.samples} />
        <p className="legend">
          <span className="legend-illustrative">illustrative</span> drawn from {memory.whisk.samples.length} recorded motion-preview samples across {memory.whisk.segments} whisking stretch{memory.whisk.segments === 1 ? '' : 'es'}
          {memory.whisk.checks.length ? `; batter checks: ${memory.whisk.checks.join(', ')}` : ''}.
        </p>
      </section>

      <section className="memory-notes">
        <h2>Notes for next time</h2>
        <textarea value={memory.note} placeholder="A little more salt? Thinner rings?" onChange={(e) => onUpdate({ note: e.target.value })} rows={4} />
        <div className="memory-actions">
          <label className="ctl file">
            {memory.photo ? 'Change photo' : 'Add a photo'}
            <input type="file" accept="image/*" onChange={(e) => onPhoto(e.target.files?.[0])} />
          </label>
          {memory.photo && (
            <button className="ctl" onClick={() => onUpdate({ photo: null })}>
              Remove photo
            </button>
          )}
          <button className="confirm" onClick={onRestart}>
            Cook it again
          </button>
        </div>
        <p className="muted">Notes and photos are kept in this browser only.</p>
      </section>
    </main>
  );
}
