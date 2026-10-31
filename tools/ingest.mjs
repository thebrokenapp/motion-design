// Gets a reel's raw footage ready to edit: normalised video, the voice, and a word-timed transcript.
//   npm run ingest -- <reel>                        reel = a folder in reels/ (or its start, "001"), or a path
//   npm run ingest -- <reel> --keyterms "Penpot,Figma"   names Scribe should hear right (apps, brands)
//   npm run ingest -- <reel> --language en          skip language detection (en, hi, ...)
//   npm run ingest -- <reel> --isolate              also clean the voice with ElevenLabs Voice Isolator
//   npm run ingest -- <reel> --whisper              transcribe on this machine (the default with no ElevenLabs key)
//   npm run ingest -- <reel> --force                redo everything
//
// Raw takes are the video files at the top of the reel folder or in raw/. For each take <clip>, in work/:
//   <clip>.mp4        1080x1920, 30 fps constant, SDR (iPhone HDR is tone-mapped), rotation applied, no sound
//   <clip>.voice.wav  its sound, 48 kHz mono, same timeline (and <clip>.voice.clean.wav with --isolate)
//   <clip>.words.json Scribe v2's answer, or tools/whisper.py's in the same shape: every word with its start and end
//   <clip>.txt        the transcript to read: phrases with times, pauses, fillers [um], unsure words?
// Videos in assets/ (screen recordings) become work/assets/<name>.mp4 (30 fps, H.264, aspect kept).
// Also creates cut.json and brief.md in the reel folder if they're missing.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { isolate, transcribe } from "./lib/eleven.mjs";
import { cfrFlags, findReel, probe, VIDEO_EXT } from "./lib/reel.mjs";

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
const reel = findReel(args[0]);
const force = flag("--force");
const keyterms = (opt("--keyterms") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const language = opt("--language");
const cfr = cfrFlags();

const work = path.join(reel.dir, "work");
fs.mkdirSync(work, { recursive: true });

const rawFiles = [reel.dir, path.join(reel.dir, "raw")]
  .filter((d) => fs.existsSync(d))
  .flatMap((d) => fs.readdirSync(d).map((f) => path.join(d, f)))
  .filter((f) => fs.statSync(f).isFile() && VIDEO_EXT.test(f));
if (!rawFiles.length) {
  console.error(`No raw video in ${reel.dir} (put the takes at the top of the folder or in raw/)`);
  process.exit(1);
}
const clipName = (f) => path.basename(f).replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "take";

function run(cmd, argv) {
  const r = spawnSync(cmd, argv, { stdio: ["ignore", "inherit", "inherit"] });
  if (r.status !== 0) throw new Error(`${cmd} failed (${r.status})`);
}

// iPhones record HDR (HLG, or PQ) by default; Reels and Remotion want SDR BT.709. The tone map is the slow part
// (float maths on every pixel), so the filters drop to 30 fps and scale down before it: 3x faster on a 60 fps
// 1440x2560 iPhone take (0.25x -> 0.74x real time, same picture: 43.8 dB; 2026-10-23). GPU decoding was slower.
function toneMap(v) {
  const tin = { "arib-std-b67": "arib-std-b67", smpte2084: "smpte2084" }[v.color_transfer];
  if (!tin) return [];
  return [`zscale=tin=${tin}:min=bt2020nc:pin=bt2020:rin=tv:t=linear:npl=100`, "format=gbrpf32le", "zscale=p=bt709",
    "tonemap=tonemap=hable:desat=0", "zscale=t=bt709:m=bt709:r=tv"];
}

function normalize(src, clip) {
  const out = path.join(work, `${clip}.mp4`);
  const voice = path.join(work, `${clip}.voice.wav`);
  if (!force && fs.existsSync(out) && fs.existsSync(voice)) return;
  const info = probe(src);
  const v = info.streams.find((s) => s.codec_type === "video");
  const a = info.streams.find((s) => s.codec_type === "audio");
  const rot = Math.abs(Number(v.side_data_list?.find((d) => d.rotation !== undefined)?.rotation ?? v.tags?.rotate ?? 0)) % 180;
  const [w, h] = rot === 90 ? [v.height, v.width] : [v.width, v.height];
  const hdr = toneMap(v);
  console.log(`${clip}: ${path.basename(src)}, ${w}x${h}, ${v.avg_frame_rate} fps, ${Number(info.format.duration).toFixed(1)} s${hdr.length ? ", HDR -> SDR" : ""}${a ? "" : ", NO SOUND"}`);
  if (w > h) console.warn(`  ${clip} is landscape: centre-cropped to 9:16. Shoot vertical for the full picture.`);
  const vf = ["fps=30", "scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos", "crop=1080:1920", ...hdr, "setsar=1", "format=yuv420p"].join(",");
  run("ffmpeg", [
    "-y", "-v", "error", "-nostats", "-i", src,
    "-map", "0:v:0", "-vf", vf, "-c:v", "libx264", "-preset", "medium", "-crf", "15", "-g", "30", "-keyint_min", "30",
    "-sc_threshold", "0", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
    ...cfr, "-r", "30", "-an", "-movflags", "+faststart", out,
    ...(a ? ["-map", "0:a:0", "-af", "aresample=48000:async=1:first_pts=0", "-ac", "1", "-c:a", "pcm_s16le", voice] : []),
  ]);
  if (!a) {
    // A silent take still needs a voice track the same length, so the cut tool can treat every take alike.
    run("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono", "-t", String(info.format.duration), "-c:a", "pcm_s16le", voice]);
  }
}

async function words(clip) {
  const out = path.join(work, `${clip}.words.json`);
  if (!force && fs.existsSync(out)) return JSON.parse(fs.readFileSync(out, "utf8"));
  if (flag("--whisper") || !process.env.ELEVENLABS_API_KEY) return whisper(clip, out);
  const flac = path.join(work, `${clip}.upload.flac`); // half the size of the wav, same sound
  run("ffmpeg", ["-y", "-v", "error", "-i", path.join(work, `${clip}.voice.wav`), "-c:a", "flac", flac]);
  try {
    const t0 = Date.now();
    const result = await transcribe(flac, { keyterms, language });
    fs.writeFileSync(out, JSON.stringify(result, null, 1) + "\n");
    console.log(`${clip}: transcribed in ${((Date.now() - t0) / 1000).toFixed(1)} s (${result.language_code})`);
    return result;
  } finally {
    fs.rmSync(flac, { force: true });
  }
}

// The free way: transcribed on this machine (tools/whisper.py), in its own Python environment.
function whisper(clip, out) {
  const python = path.join(".venv-whisper", "bin", "python");
  if (!fs.existsSync(python)) {
    throw new Error("No ELEVENLABS_API_KEY in .env, and free local transcription isn't installed. Add the key, or run:\n  uv venv .venv-whisper --python 3.10\n  uv pip install --python .venv-whisper/bin/python faster-whisper==1.2.1");
  }
  const t0 = Date.now();
  run(python, ["-I", "tools/whisper.py", path.join(work, `${clip}.voice.wav`), out, ...(language ? ["--language", language] : []), "--keyterms", keyterms.join(",")]);
  const result = JSON.parse(fs.readFileSync(out, "utf8"));
  console.log(`${clip}: transcribed on this machine in ${((Date.now() - t0) / 1000).toFixed(1)} s (${result.language_code})`);
  return result;
}

// The transcript Claude reads to decide the cut: a line per phrase, with source times.
const FILLER = /^(um+|uh+|uhm|erm|er|ah|hmm?|mm+|mhm)$/i;
function transcriptText(clip, result, seconds) {
  const ws = result.words.filter((w) => w.type === "word" || w.type === "audio_event");
  const lines = [`${clip}: ${seconds.toFixed(1)} s, ${ws.filter((w) => w.type === "word").length} words, language ${result.language_code}`,
    "Times are seconds in the take. [um] = filler, word? = unsure, (event) = non-speech sound.", ""];
  let line = [];
  let start = null;
  let prevEnd = null;
  const flush = (end) => {
    if (!line.length) return;
    lines.push(`${start.toFixed(2).padStart(7)}-${end.toFixed(2).padEnd(7)} ${line.join(" ")}`);
    line = [];
  };
  for (const w of ws) {
    const gap = prevEnd === null ? 0 : w.start - prevEnd;
    if (gap >= 0.35) {
      flush(prevEnd);
      lines.push(`${"".padStart(16)}  · pause ${gap.toFixed(2)} s`);
    }
    if (!line.length) start = w.start;
    const text = w.type === "audio_event" ? w.text : FILLER.test(w.text.replace(/[^\p{L}]/gu, "")) ? `[${w.text}]` : w.text;
    line.push(w.logprob !== undefined && w.logprob < -1 ? `${text}?` : text);
    prevEnd = w.end;
    if (/[.?!]["']?$/.test(w.text)) flush(w.end);
  }
  flush(prevEnd ?? 0);
  return lines.join("\n") + "\n";
}

async function cleanVoice(clip) {
  const out = path.join(work, `${clip}.voice.clean.wav`);
  if (!force && fs.existsSync(out)) return;
  const raw = path.join(work, `${clip}.voice.wav`);
  const mp3 = path.join(work, `${clip}.voice.isolated.mp3`);
  fs.writeFileSync(mp3, await isolate(raw));
  run("ffmpeg", ["-y", "-v", "error", "-i", mp3, "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le", out]);
  fs.rmSync(mp3);
  const [a, b] = [raw, out].map((f) => Number(probe(f).format.duration));
  console.log(`${clip}: voice isolated${Math.abs(a - b) > 0.05 ? ` (WARNING: ${b.toFixed(2)} s vs ${a.toFixed(2)} s, timing may drift)` : ""}`);
}

function assets() {
  const dir = path.join(reel.dir, "assets");
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir).filter((x) => VIDEO_EXT.test(x))) {
    const out = path.join(work, "assets", `${clipName(f)}.mp4`);
    if (!force && fs.existsSync(out)) continue;
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const v = probe(path.join(dir, f)).streams.find((s) => s.codec_type === "video");
    const vf = ["fps=30", "scale=1920:1920:force_original_aspect_ratio=decrease:flags=lanczos", "scale=trunc(iw/2)*2:trunc(ih/2)*2", ...toneMap(v), "setsar=1", "format=yuv420p"].join(",");
    run("ffmpeg", ["-y", "-v", "error", "-i", path.join(dir, f), "-vf", vf, "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-g", "30", "-an", ...cfr, "-r", "30", "-movflags", "+faststart", out]);
    console.log(`asset: ${f} -> work/assets/${path.basename(out)}`);
  }
}

const clips = [];
for (const src of rawFiles.sort()) {
  const clip = clipName(src);
  if (clips.includes(clip)) throw new Error(`Two raw files both make the clip name "${clip}"; rename one`);
  clips.push(clip);
  normalize(src, clip);
  if (flag("--isolate")) await cleanVoice(clip);
  const result = await words(clip);
  const seconds = Number(probe(path.join(work, `${clip}.mp4`)).format.duration);
  fs.writeFileSync(path.join(work, `${clip}.txt`), transcriptText(clip, result, seconds));
  console.log(`${clip}: transcript -> ${path.join(work, `${clip}.txt`)}`);
}
assets();

const cutFile = path.join(reel.dir, "cut.json");
if (!fs.existsSync(cutFile)) fs.writeFileSync(cutFile, JSON.stringify({ clips, drop: [], keep: [] }, null, 2) + "\n");
const brief = path.join(reel.dir, "brief.md");
if (!fs.existsSync(brief)) {
  fs.writeFileSync(brief, fs.readFileSync(path.join("tools", "templates", "brief.md"), "utf8").replaceAll("{{title}}", reel.folder));
}
console.log(`\nReady: ${clips.length} take(s). Next: read work/*.txt, write cut.json, then npm run cut -- "${reel.folder}"`);
