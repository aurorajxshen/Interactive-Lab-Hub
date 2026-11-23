#!/usr/bin/env node
/**
 * generate-voice.mjs — pre-record every spoken line with ElevenLabs.
 *
 *   npm run voice:dry                      # list lines + character count (no key, no credits)
 *   npm run voice:voices                   # list voices your account can use
 *   npm run voice:generate                 # record missing/changed clips into public/voice/
 *   npm run voice:generate -- --voice "Sarah" --model eleven_multilingual_v2
 *
 * The API key is read ONLY from the ELEVENLABS_API_KEY environment variable
 * (or a git-ignored .env.local loaded by the npm script). It is never printed,
 * written to disk or bundled into the website — only the MP3s and a manifest are.
 * Clips already recorded with the same text/voice/model are skipped, so
 * re-running costs credits only for lines that changed.
 */
import { createHash } from 'node:crypto';
import { mkdir, readdir, rm, writeFile, readFile, mkdtemp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'voice');
const API = 'https://api.elevenlabs.io';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const MODEL = opt('model', process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2');
const VOICE = opt('voice', process.env.ELEVENLABS_VOICE || 'Sarah');
const MAX_CHARS = Number(opt('max-chars', '6000'));
const SETTINGS = { stability: 0.55, similarity_boost: 0.75, style: 0.15, use_speaker_boost: true, speed: 0.97 };

async function loadLines() {
  const dir = await mkdtemp(join(tmpdir(), 'rim-voice-'));
  const outfile = join(dir, 'voiceLines.mjs');
  await build({ entryPoints: [join(ROOT, 'src/voice/voiceLines.ts')], bundle: true, platform: 'node', format: 'esm', outfile, logLevel: 'error' });
  const mod = await import(pathToFileURL(outfile).href);
  await rm(dir, { recursive: true, force: true });
  return mod.allVoiceLines();
}

function key() {
  const k = process.env.ELEVENLABS_API_KEY;
  if (!k) {
    console.error('ELEVENLABS_API_KEY is not set. Put it in .env.local (see README) or export it in this terminal.');
    process.exit(1);
  }
  return k;
}

async function api(path, init = {}) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(API + path, { ...init, headers: { 'xi-api-key': key(), ...(init.headers || {}) } });
    if (res.status === 429 && attempt < 3) {
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      continue;
    }
    if (!res.ok) {
      const body = await res.text();
      const hint = res.status === 401 ? ' — the API key was rejected (check it, and that it has Text to Speech + Voices permission)' : res.status === 402 ? ' — out of credits or the voice needs a paid plan' : '';
      throw new Error(`ElevenLabs ${res.status}${hint}: ${body.slice(0, 300)}`);
    }
    return res;
  }
}

async function listVoices() {
  const res = await api('/v1/voices');
  const { voices } = await res.json();
  return voices.map((v) => ({ id: v.voice_id, name: v.name, category: v.category, accent: v.labels?.accent, gender: v.labels?.gender, desc: v.labels?.description || v.labels?.descriptive }));
}

async function resolveVoice() {
  const voices = await listVoices();
  const byId = voices.find((v) => v.id === VOICE);
  const byName = voices.find((v) => v.name.toLowerCase() === VOICE.toLowerCase()) || voices.find((v) => v.name.toLowerCase().startsWith(VOICE.toLowerCase()));
  const v = byId || byName;
  if (!v) {
    console.error(`Voice "${VOICE}" not found. Run: npm run voice:voices`);
    process.exit(1);
  }
  return v;
}

const hash = (s) => createHash('sha1').update(s).digest('hex').slice(0, 10);

async function main() {
  const lines = await loadLines();
  const chars = lines.reduce((a, l) => a + l.text.length, 0);

  if (flag('dry-run')) {
    lines.forEach((l) => console.log(`${l.key.padEnd(28)} ${l.text}`));
    console.log(`\n${lines.length} lines, ${chars} characters (model ${MODEL}).`);
    return;
  }
  if (flag('list-voices')) {
    const voices = await listVoices();
    voices.forEach((v) => console.log(`${v.name.padEnd(22)} ${v.id}  ${[v.gender, v.accent, v.desc, v.category].filter(Boolean).join(' · ')}`));
    console.log('\nUse one with: npm run voice:generate -- --voice "<name>"');
    return;
  }

  const voice = await resolveVoice();
  await mkdir(OUT, { recursive: true });
  const manifestPath = join(OUT, 'manifest.json');
  const old = existsSync(manifestPath) ? JSON.parse(await readFile(manifestPath, 'utf8')) : null;

  const plan = lines.map((l) => {
    const file = `${l.key}-${hash(`${l.text}|${voice.id}|${MODEL}|${JSON.stringify(SETTINGS)}`)}.mp3`;
    return { ...l, file, exists: existsSync(join(OUT, file)) };
  });
  const todo = plan.filter((p) => !p.exists);
  const todoChars = todo.reduce((a, l) => a + l.text.length, 0);
  console.log(`Voice: ${voice.name} (${voice.id}), model ${MODEL}`);
  console.log(`${plan.length} lines; ${todo.length} to record (${todoChars} characters ≈ credits on multilingual v2), ${plan.length - todo.length} already up to date.`);
  if (todoChars > MAX_CHARS) {
    console.error(`That is more than --max-chars ${MAX_CHARS}. Re-run with a higher --max-chars if intended.`);
    process.exit(1);
  }

  let done = 0;
  for (const p of todo) {
    const res = await api(`/v1/text-to-speech/${voice.id}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text: p.text, model_id: MODEL, voice_settings: SETTINGS }),
    });
    await writeFile(join(OUT, p.file), Buffer.from(await res.arrayBuffer()));
    done += 1;
    console.log(`  [${done}/${todo.length}] ${p.key}`);
  }

  const manifest = {
    provider: 'elevenlabs',
    voiceName: voice.name,
    voiceId: voice.id,
    modelId: MODEL,
    generatedAt: new Date().toISOString(),
    credit: 'Voice generated with ElevenLabs',
    clips: Object.fromEntries(plan.map((p) => [p.key, { file: p.file, text: p.text }])),
  };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

  // remove clips no longer referenced (old text / voice / model)
  const keep = new Set(plan.map((p) => p.file));
  const removed = [];
  for (const f of await readdir(OUT)) if (f.endsWith('.mp3') && !keep.has(f)) (await rm(join(OUT, f)), removed.push(f));
  console.log(`\nDone. ${done} recorded, manifest written to public/voice/manifest.json${removed.length ? `, ${removed.length} outdated clips removed` : ''}.`);
  if (old && old.voiceId !== voice.id) console.log(`Voice changed from ${old.voiceName} to ${voice.name}.`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
