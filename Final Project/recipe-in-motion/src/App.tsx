import { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { keyboardMap, type KeyAction } from './config/interactionConfig';
import { SketchDefs } from './illustrations/sketch';
import { useCookingSession } from './state/useCookingSession';
import { useNow, usePrefersReducedMotion } from './components/hooks';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { PrepScreen } from './screens/PrepScreen';
import { CookingScreen } from './screens/CookingScreen';
import { MemoryScreen } from './screens/MemoryScreen';
import { HelpOverlay } from './components/HelpOverlay';
import { useVoiceGuidance } from './voice/useVoiceGuidance';
import { useSensorBridge } from './sensors/useSensorBridge';

function keyAction(key: string): KeyAction | null {
  const k = key.length === 1 ? key.toLowerCase() : key;
  for (const [action, keys] of Object.entries(keyboardMap)) if ((keys as string[]).includes(k)) return action as KeyAction;
  return null;
}

export default function App() {
  const session = useCookingSession();
  const { state, act, confirm } = session;
  const now = useNow(200);
  const systemReduced = usePrefersReducedMotion();
  const [reducedOverride, setReducedOverride] = useState<boolean | null>(null);
  const reduced = reducedOverride ?? systemReduced;
  const [help, setHelp] = useState(false);
  const voice = useVoiceGuidance();
  const sensors = useSensorBridge(state, act, confirm);
  const voiceToggleRef = useRef<(() => void) | null>(null);

  // leaving the cooking screen silences any guidance
  useEffect(() => {
    if (state.phase !== 'cooking') voice.stop();
  }, [state.phase, voice.stop]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('input, textarea, select, [contenteditable]')) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const action = keyAction(e.key);
      if (!action) return;
      // Let focused buttons handle Enter / Space themselves (avoids double confirmation)
      if (action === 'confirm' && el.closest('button, a, label')) return;
      e.preventDefault();
      const t = Date.now();
      if (action === 'help') return setHelp((h) => !h);
      if (help && action !== 'confirm') return;
      switch (action) {
        case 'confirm':
          if (help) return setHelp(false);
          return confirm('key');
        case 'next':
          return act({ type: 'NAV', dir: 1 });
        case 'prev':
          return act({ type: 'NAV', dir: -1 });
        case 'undo':
          return act({ type: 'UNDO', now: t });
        case 'pause':
          return act({ type: 'TOGGLE_PAUSE', now: t });
        case 'motion':
          return session.toggleMotion();
        case 'voice':
          return voiceToggleRef.current?.();
      }
    };
    // After a mouse click, drop focus so a later Enter means "confirm", not "press that button again"
    const onClick = (e: MouseEvent) => {
      if (e.detail > 0) (e.target as HTMLElement).closest('button')?.blur();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('click', onClick);
    };
  }, [act, confirm, help, session]);

  return (
    <div className={`app ${reduced ? 'is-reduced' : ''}`}>
      <SketchDefs />
      {state.phase === 'welcome' && <WelcomeScreen onStart={() => act({ type: 'GO_PREP' })} />}
      {state.phase === 'prep' && <PrepScreen onBack={() => act({ type: 'GO_WELCOME' })} onStart={() => act({ type: 'START_COOKING', now: Date.now() })} />}
      {state.phase === 'cooking' && <CookingScreen session={session} now={now} reduced={reduced} onToggleReduced={() => setReducedOverride(!reduced)} onHelp={() => setHelp(true)} voice={voice} voiceToggleRef={voiceToggleRef} sensors={sensors.status} />}
      {state.phase === 'memory' && session.memory && <MemoryScreen memory={session.memory} onUpdate={session.updateMemory} onRestart={session.restart} />}
      <AnimatePresence>{help && <HelpOverlay onClose={() => setHelp(false)} voice={voice} sensors={sensors} />}</AnimatePresence>
    </div>
  );
}
