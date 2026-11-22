/**
 * useVoiceGuidance — free, local voice instructions via the browser Web Speech API.
 *
 *  • Never speaks on initial load. Play is always an explicit press; the optional
 *    "read each new action aloud" preference only reacts to later changes.
 *  • One utterance at a time: every play cancels the previous one.
 *  • The caller cancels on micro-action change, pause, navigation and unmount.
 *  • If speechSynthesis is missing, `supported` is false and the UI hides the controls.
 *  • Voice is an enhancement: every spoken line is also on screen.
 *
 * Later option (not integrated): a consistent downloadable voice such as the
 * Apache-2.0 Kokoro-82M model would need hosting, caching and loading UX.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { voiceConfig } from '../config/interactionConfig';

interface VoicePrefs {
  voiceURI: string | null;
  autoRead: boolean;
}

function loadPrefs(): VoicePrefs {
  try {
    const raw = localStorage.getItem(voiceConfig.storageKey);
    if (raw) return { voiceURI: null, autoRead: false, ...(JSON.parse(raw) as Partial<VoicePrefs>) };
  } catch {
    /* ignore */
  }
  return { voiceURI: null, autoRead: false };
}

function savePrefs(p: VoicePrefs) {
  try {
    localStorage.setItem(voiceConfig.storageKey, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

const synth = (): SpeechSynthesis | null => (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null);

/** Higher is better. English only; novelty voices are excluded. */
export function scoreVoice(v: SpeechSynthesisVoice): number {
  const lang = v.lang.toLowerCase().replace('_', '-');
  if (!lang.startsWith('en')) return -1;
  const name = v.name.toLowerCase();
  if (voiceConfig.avoidNames.some((n) => name === n.toLowerCase() || name.startsWith(`${n.toLowerCase()} `))) return -1;
  let score = 0;
  const pref = voiceConfig.preferredNames.findIndex((n) => name.includes(n.toLowerCase()));
  if (pref >= 0) score += 200 - pref * 8;
  if (/premium|enhanced|natural|neural/.test(name)) score += 60;
  if (v.localService) score += 15; // starts instantly, works offline
  if (lang === 'en-us') score += 12;
  else if (lang === 'en-gb' || lang === 'en-au' || lang === 'en-ca') score += 8;
  if (v.default) score += 4;
  return score;
}

export function useVoiceGuidance() {
  const s = synth();
  const supported = !!s && typeof window !== 'undefined' && 'SpeechSynthesisUtterance' in window;
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [prefs, setPrefs] = useState<VoicePrefs>(loadPrefs);
  const [speakingKey, setSpeakingKey] = useState<string | null>(null);
  const lastPlayRef = useRef(0);
  const uttRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (!supported || !s) return;
    const update = () => setVoices(s.getVoices());
    update();
    s.addEventListener?.('voiceschanged', update);
    return () => {
      s.removeEventListener?.('voiceschanged', update);
      s.cancel();
    };
  }, [supported, s]);

  /** English voices, best first */
  const ranked = useMemo(
    () =>
      voices
        .map((v) => ({ v, score: scoreVoice(v) }))
        .filter((x) => x.score >= 0)
        .sort((a, b) => b.score - a.score)
        .map((x) => x.v),
    [voices],
  );

  const voice = useMemo(() => ranked.find((v) => v.voiceURI === prefs.voiceURI) ?? ranked[0] ?? null, [ranked, prefs.voiceURI]);

  const stop = useCallback(() => {
    const sy = synth();
    if (uttRef.current) {
      uttRef.current.onend = null;
      uttRef.current.onerror = null;
      uttRef.current = null;
    }
    sy?.cancel();
    setSpeakingKey(null);
  }, []);

  const speak = useCallback(
    (text: string, key: string) => {
      const sy = synth();
      if (!sy || !supported) return;
      const t = Date.now();
      if (t - lastPlayRef.current < voiceConfig.replayGuardMs) return; // rapid repeat
      lastPlayRef.current = t;
      stop();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = voiceConfig.rate;
      u.pitch = voiceConfig.pitch;
      u.volume = voiceConfig.volume;
      if (voice) {
        u.voice = voice;
        u.lang = voice.lang;
      } else u.lang = 'en-US';
      const done = () => {
        if (uttRef.current === u) {
          uttRef.current = null;
          setSpeakingKey(null);
        }
      };
      u.onend = done;
      u.onerror = done;
      uttRef.current = u;
      setSpeakingKey(key);
      sy.speak(u);
    },
    [supported, voice, stop],
  );

  /** Play/stop toggle for one piece of guidance */
  const toggle = useCallback(
    (text: string, key: string) => {
      if (speakingKey === key) stop();
      else speak(text, key);
    },
    [speakingKey, speak, stop],
  );

  const setVoiceURI = useCallback((voiceURI: string | null) => {
    setPrefs((p) => {
      const next = { ...p, voiceURI };
      savePrefs(next);
      return next;
    });
  }, []);

  const setAutoRead = useCallback((autoRead: boolean) => {
    setPrefs((p) => {
      const next = { ...p, autoRead };
      savePrefs(next);
      return next;
    });
  }, []);

  return {
    supported,
    voices: ranked,
    voice,
    speakingKey,
    speaking: speakingKey !== null,
    speak,
    stop,
    toggle,
    autoRead: prefs.autoRead,
    setAutoRead,
    voiceURI: prefs.voiceURI,
    setVoiceURI,
  };
}

export type VoiceGuidance = ReturnType<typeof useVoiceGuidance>;
