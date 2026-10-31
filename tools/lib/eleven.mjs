// ElevenLabs calls used by the tools: transcription (Scribe v2), voice isolation, sound effects and music.
// The key comes from .env as ELEVENLABS_API_KEY (the npm scripts load it with `--env-file-if-exists`) and is never printed.
// Parameters checked against the elevenlabs/skills docs in .claude/skills (2026-10-23).
import fs from "node:fs";
import path from "node:path";

const API = "https://api.elevenlabs.io/v1";

function key() {
  const k = process.env.ELEVENLABS_API_KEY;
  if (!k) throw new Error("ELEVENLABS_API_KEY is missing from .env");
  return k;
}

async function check(r, what) {
  if (r.ok) return r;
  throw new Error(`${what}: HTTP ${r.status} ${(await r.text()).slice(0, 500)}`);
}

const fileBlob = (file) => new Blob([fs.readFileSync(file)]);

// Words with start/end in seconds. `keyterms` are names Scribe would otherwise mishear (app names, brands).
// Verbatim on purpose: fillers ("um", "uh") and false starts stay in, so the cut can see and remove them.
export async function transcribe(file, { keyterms = [], language } = {}) {
  const form = new FormData();
  form.append("file", fileBlob(file), path.basename(file));
  form.append("model_id", "scribe_v2");
  form.append("timestamps_granularity", "word");
  form.append("tag_audio_events", "true");
  if (language) form.append("language_code", language);
  for (const k of keyterms.slice(0, 100)) form.append("keyterms", k);
  const r = await check(await fetch(`${API}/speech-to-text`, { method: "POST", headers: { "xi-api-key": key() }, body: form }), "speech-to-text");
  return r.json();
}

// Background noise and room sound removed from a voice recording. Returns MP3 bytes.
export async function isolate(file) {
  const form = new FormData();
  form.append("audio", fileBlob(file), path.basename(file));
  const r = await check(await fetch(`${API}/audio-isolation`, { method: "POST", headers: { "xi-api-key": key() }, body: form }), "voice isolator");
  return Buffer.from(await r.arrayBuffer());
}

export async function soundEffect({ text, seconds, influence = 0.5, loop = false }) {
  const r = await check(
    await fetch(`${API}/sound-generation?output_format=mp3_44100_192`, {
      method: "POST",
      headers: { "xi-api-key": key(), "Content-Type": "application/json" },
      body: JSON.stringify({ text, model_id: "eleven_text_to_sound_v2", duration_seconds: seconds ?? null, prompt_influence: influence, loop }),
    }),
    "sound effect",
  );
  return Buffer.from(await r.arrayBuffer());
}

// Instrumental music from a prompt. ElevenLabs tends to end tracks early: ask for a few seconds more than needed.
export async function music({ prompt, seconds }) {
  const r = await check(
    await fetch(`${API}/music?output_format=mp3_44100_192`, {
      method: "POST",
      headers: { "xi-api-key": key(), "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, music_length_ms: Math.round(seconds * 1000), force_instrumental: true, model_id: "music_v2_5" }),
    }),
    "music",
  );
  return Buffer.from(await r.arrayBuffer());
}
