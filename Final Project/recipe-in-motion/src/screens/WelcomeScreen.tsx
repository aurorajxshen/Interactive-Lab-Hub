import { motion } from 'framer-motion';
import { recipeConfig } from '../config/recipeConfig';
import { HeroPancake } from '../illustrations/HeroPancake';

export function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <main className="welcome">
      <motion.div className="welcome-text" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <p className="kicker">An illustrated cooking companion · V0.1</p>
        <h1>
          Recipe <em>in</em> Motion
        </h1>
        <p className="lede">A little cooking companion that moves with you.</p>
        <div className="welcome-recipe">
          <span className="hand">today:</span>
          <h2>{recipeConfig.name}</h2>
          <p>{recipeConfig.subtitle}</p>
          <p className="meta">
            {recipeConfig.serves} · {recipeConfig.approxMinutes} · {recipeConfig.steps.length} small steps
          </p>
        </div>
        <button className="confirm" onClick={onStart}>
          Let’s cook
        </button>
      </motion.div>
      <motion.div className="welcome-art" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.15 }}>
        <HeroPancake />
      </motion.div>
    </main>
  );
}
