import { motion } from 'framer-motion';
import { recipeConfig } from '../config/recipeConfig';
import { IngredientSketch } from '../illustrations/IngredientSketch';

export function PrepScreen({ onStart, onBack }: { onStart: () => void; onBack: () => void }) {
  return (
    <main className="prep">
      <header className="prep-head">
        <button className="text-btn" onClick={onBack}>
          ← Recipe in Motion
        </button>
        <p className="kicker">Before you start</p>
        <h1>Gather everything</h1>
        <p className="lede">{recipeConfig.name}. Measure everything first so you can cook without hunting for things.</p>
      </header>

      <ul className="ingredients">
        {recipeConfig.ingredients.map((ing, i) => (
          <motion.li key={ing.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i, duration: 0.45 }}>
            <IngredientSketch id={ing.id} label={ing.name} />
            <span className="ing-amount">{ing.amount}</span>
            <span className="ing-name">
              {ing.name}
              {ing.optional && <em> · optional</em>}
            </span>
          </motion.li>
        ))}
      </ul>
      <p className="tools-line">
        <span className="hand">tools:</span> {recipeConfig.tools.join(' · ')}
      </p>

      <div className="prep-foot">
        <button className="confirm" onClick={onStart}>
          Start cooking
        </button>
      </div>
    </main>
  );
}
