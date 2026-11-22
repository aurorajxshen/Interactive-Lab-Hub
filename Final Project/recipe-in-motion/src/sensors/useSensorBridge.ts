/**
 * useSensorBridge — connects the page to bridge/sensor_bridge.py (Server-Sent Events).
 *
 * Opt-in: off unless the page is opened with ?sensors=<url> or the cook
 * turns it on in Help. Every intent goes through the same reducer actions as
 * buttons/keys (source 'gesture'), so pause, look-ahead guards, debounce and
 * undo behave identically. If the link drops, the UI simply keeps working.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { sensorConfig } from '../config/interactionConfig';
import { activeMicro, isViewingActive, type RecipeAction, type RecipeState } from '../state/recipeState';
import { parseEnvelope, parseHello, type BridgeStatus } from './protocol';
import { SensorAdapter, type AdapterContext, type SensorIntent, type SensorSnapshot } from './sensorAdapter';

interface Prefs {
  url: string;
  enabled: boolean;
}

function loadPrefs(): Prefs {
  const fromQuery = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('sensors') : null;
  if (fromQuery) return { url: fromQuery, enabled: true };
  try {
    const raw = localStorage.getItem(sensorConfig.storageKey);
    if (raw) return { url: sensorConfig.defaultUrl, enabled: false, ...(JSON.parse(raw) as Partial<Prefs>) };
  } catch {
    /* ignore */
  }
  return { url: sensorConfig.defaultUrl, enabled: false };
}

export type SensorStatus = (SensorSnapshot & { enabled: true; url: string }) | { enabled: false; url: string };

export function useSensorBridge(state: RecipeState, act: (a: RecipeAction) => void, confirm: (source: 'gesture') => void) {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [snapshot, setSnapshot] = useState<SensorSnapshot | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const handlers = useRef({ act, confirm });
  handlers.current = { act, confirm };

  const context = (): AdapterContext => {
    const s = stateRef.current;
    const micro = s.phase === 'cooking' && !s.finale ? activeMicro(s) : undefined;
    return {
      phase: s.phase,
      previewing: s.phase === 'cooking' && !isViewingActive(s),
      classifier: micro?.classifier ?? null,
      microId: micro?.id ?? null,
    };
  };

  const apply = (intents: SensorIntent[]) => {
    const now = Date.now();
    const { act: a, confirm: c } = handlers.current;
    for (const i of intents) {
      if (i.kind === 'confirm') c('gesture');
      else if (i.kind === 'returnToActive') a({ type: 'RETURN_TO_ACTIVE' });
      else if (i.kind === 'next') a({ type: 'NAV', dir: 1 });
      else if (i.kind === 'undo') a({ type: 'UNDO', now });
      else a({ type: 'MOTION', now, classifier: i.classifier, signal: i.signal, intensity: sensorConfig.sensorIntensity });
    }
  };

  useEffect(() => {
    if (!prefs.enabled || typeof EventSource === 'undefined') {
      setSnapshot(null);
      return;
    }
    const adapter = new SensorAdapter();
    const publish = () => setSnapshot({ ...adapter.snapshot });
    let es: EventSource;
    try {
      es = new EventSource(`${prefs.url.replace(/\/$/, '')}/events`);
    } catch {
      adapter.snapshot.link = 'offline';
      publish();
      return;
    }
    const json = (e: MessageEvent): unknown => {
      try {
        return JSON.parse(e.data as string);
      } catch {
        return null;
      }
    };
    es.addEventListener('hello', (e) => {
      const h = parseHello(json(e as MessageEvent));
      if (h.ok) apply(adapter.hello(h.value, Date.now()));
      else adapter.noteInvalid();
      publish();
    });
    es.addEventListener('motion', (e) => {
      const env = parseEnvelope(json(e as MessageEvent));
      if (env.ok) apply(adapter.receive(env.value, context(), Date.now()));
      else adapter.noteInvalid();
      publish();
    });
    es.addEventListener('bridge', (e) => {
      const b = json(e as MessageEvent) as BridgeStatus | null;
      if (b && typeof b.status === 'string') apply(adapter.bridgeStatus(b, Date.now()));
      publish();
    });
    es.onerror = () => {
      apply(adapter.disconnected()); // EventSource retries on its own; a fresh hello resets the gesture gate
      publish();
    };
    const t = setInterval(() => {
      const before = adapter.snapshot.link;
      const out = adapter.tick(Date.now());
      apply(out);
      if (out.length || before !== adapter.snapshot.link) publish();
    }, 400);
    publish();
    return () => {
      clearInterval(t);
      es.close();
      apply(adapter.disconnected());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.enabled, prefs.url]);

  const save = useCallback((next: Prefs) => {
    setPrefs(next);
    try {
      localStorage.setItem(sensorConfig.storageKey, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const status: SensorStatus = prefs.enabled && snapshot ? { ...snapshot, enabled: true, url: prefs.url } : { enabled: false, url: prefs.url };
  return {
    status,
    setEnabled: (enabled: boolean) => save({ ...prefs, enabled }),
    setUrl: (url: string) => save({ ...prefs, url }),
  };
}

export type SensorBridge = ReturnType<typeof useSensorBridge>;
