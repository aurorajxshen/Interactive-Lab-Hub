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
import type { VoiceManifest } from './voiceLines';

interface VoicePrefs {
  voiceURI: string | null;
  autoRead: boolean;
}

function loadPrefs(): VoicePrefs {
  try {
    const raw = localStorage.getItem(voiceConfig.storageKey);
    if (raw) return { voiceURI: null, autoRead: voiceConfig.autoReadDefault, ...(JSON.parse(raw) as Partial<VoicePrefs>) };
  } catch {
    /* ignore */
  }
  return { voiceURI: null, autoRead: voiceConfig.autoReadDefault };
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

/** Select value meaning "use the pre-recorded clips" (the default when they exist) */
export const RECORDED_VOICE = 'recorded';

type SpeakOpts = { auto?: boolean; delayMs?: number; /** key into public/voice/manifest.json */ clip?: string };

export function useVoiceGuidance() {
  const s = synth();
  const synthSupported = !!s && typeof window !== 'undefined' && 'SpeechSynthesisUtterance' in window;
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [prefs, setPrefs] = useState<VoicePrefs>(loadPrefs);
  const [speakingKey, setSpeakingKey] = useState<string | null>(null);
  const [manifest, setManifest] = useState<VoiceManifest | null>(null);
  const lastPlayRef = useRef(0);
  const uttRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!synthSupported || !s) return;
    const update = () => setVoices(s.getVoices());
    update();
    s.addEventListener?.('voiceschanged', update);
    return () => {
      s.removeEventListener?.('voiceschanged', update);
      s.cancel();
    };
  }, [synthSupported, s]);

  // pre-recorded clips (scripts/generate-voice.mjs). Missing manifest = browser voice only.
  useEffect(() => {
    let alive = true;
    fetch(`${import.meta.env.BASE_URL}voice/manifest.json`, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then((m: VoiceManifest | null) => {
        if (alive && m && m.clips) setManifest(m);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

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

  const useRecorded = !!manifest && (prefs.voiceURI === null || prefs.voiceURI === RECORDED_VOICE);
  const voice = useMemo(() => ranked.find((v) => v.voiceURI === prefs.voiceURI) ?? ranked[0] ?? null, [ranked, prefs.voiceURI]);
  const supported = synthSupported || !!manifest;

  const stop = useCallback(() => {
    if (pendingRef.current) {
      clearTimeout(pendingRef.current);
      pendingRef.current = null;
    }
    if (uttRef.current) {
      uttRef.current.onend = null;
      uttRef.current.onerror = null;
      uttRef.current = null;
    }
    if (audioRef.current) {
      const a = audioRef.current;
      a.onended = null;
      a.onerror = null;
      a.pause();
      audioRef.current = null;
    }
    synth()?.cancel();
    setSpeakingKey(null);
  }, []);

  const speak = useCallback(
    (text: string, key: string, opts: SpeakOpts = {}) => {
      // a recording is used only if it was made from exactly this text (recipe edits fall back safely)
      const clip = useRecorded && opts.clip ? manifest?.clips[opts.clip] : undefined;
      const recorded = clip && clip.text === text ? clip : undefined;
      if (!recorded && !synthSupported) return;
      const t = Date.now();
      // rapid repeated presses are ignored; automatic reads always replace what is playing
      if (!opts.auto && t - lastPlayRef.current < voiceConfig.replayGuardMs) return;
      lastPlayRef.current = t;
      stop();
      setSpeakingKey(key);
      const start = () => {
        const finish = (owner: unknown) => () => {
          if (audioRef.current === owner || uttRef.current === owner) {
            audioRef.current = null;
            uttRef.current = null;
            setSpeakingKey(null);
          }
        };
        if (recorded) {
          const a = new Audio(`${import.meta.env.BASE_URL}voice/${recorded.file}`);
          a.volume = voiceConfig.volume;
          audioRef.current = a;
          a.onended = finish(a);
          a.onerror = () => {
            // file missing or blocked → say it with the browser voice instead
            if (audioRef.current !== a) return;
            audioRef.current = null;
            if (synthSupported) speakSynth();
            else setSpeakingKey(null);
          };
          a.play().catch(() => a.onerror?.(new Event('error')));
          return;
        }
        speakSynth();
        function speakSynth() {
          const u = new SpeechSynthesisUtterance(text);
          u.rate = voiceConfig.rate;
          u.pitch = voiceConfig.pitch;
          u.volume = voiceConfig.volume;
          if (voice) {
            u.voice = voice;
            u.lang = voice.lang;
          } else u.lang = 'en-US';
          u.onend = finish(u);
          u.onerror = finish(u);
          uttRef.current = u;
          synth()!.speak(u);
        }
      };
      if (opts.delayMs) {
        pendingRef.current = setTimeout(() => {
          pendingRef.current = null;
          start();
        }, opts.delayMs);
      } else start();
    },
    [useRecorded, manifest, synthSupported, voice, stop],
  );

  /** Play/stop toggle for one piece of guidance */
  const toggle = useCallback(
    (text: string, key: string, clip?: string) => {
      if (speakingKey === key) stop();
      else speak(text, key, { clip });
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
    /** Pre-recorded voice in use (null = browser voice) */
    recorded: useRecorded && manifest ? { name: manifest.voiceName, credit: manifest.credit, provider: manifest.provider } : null,
    hasRecordings: !!manifest,
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
