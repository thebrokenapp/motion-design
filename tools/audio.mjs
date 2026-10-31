// Makes a reel's sound effects and music with ElevenLabs (only files that don't exist yet).
//   npm run audio -- <reel>                   reels/<reel>/audio/spec.json, plus the library sounds its edit uses
//   npm run audio -- <reel> --force sfx/x.mp3 remake one (or several, space-separated)
//   npm run audio -- library                  every sound in library/sfx/spec.json
//   npm run audio -- <reel> --level audio/music/song.mp3   level a supplied track to -14 LUFS, like made ones
//   npm run audio -- library --level whoosh.mp3            level a supplied sound effect (a file in library/sfx/)
// With no ElevenLabs key nothing can be made: it lists the files that are missing, for the user to supply.
//
// spec.json:
// {
//   "sfx":   [{ "file": "sfx/door.mp3", "text": "...", "seconds": 1.5, "influence": 0.6 }],
//   "music": [{ "file": "music/bed.mp3", "prompt": "...", "seconds": 45 }]
// }
// The library (library/sfx/) holds the sounds every reel reuses (whoosh, pop, click...), made once, so reels
// sound alike and credits aren't spent twice; an edit names them by name: { at: "word", sound: "whoosh" }.
// Writes durations.json next to the spec. ElevenLabs runs jobs two at a time (more are refused on small plans).
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { music, soundEffect } from "./lib/eleven.mjs";
import { findReel } from "./lib/reel.mjs";

const [wanted, ...rest] = process.argv.slice(2);
const force = rest[0] === "--force" ? new Set(rest.slice(1)) : new Set();
const LIB = path.join("library", "sfx");
if (rest[0] === "--level") {
  const library = wanted === "library";
  const dir = library ? LIB : findReel(wanted).dir;
  for (const f of rest.slice(1)) {
    const kind = library || /(^|\/)sfx\//.test(f) ? "sfx" : "music";
    console.log(`${f}: levelled from ${level(path.join(dir, f), kind).toFixed(1)} to ${kind === "sfx" ? "-16" : "-14"} LUFS`);
  }
  process.exit(0);
}
const libSpec = JSON.parse(fs.readFileSync(path.join(LIB, "spec.json"), "utf8"));
const noKey = !process.env.ELEVENLABS_API_KEY;
const missing = [];

const jobs = []; // [dir, entry, kind]
if (wanted === "library") {
  for (const s of libSpec.sfx) jobs.push([LIB, s, "sfx"]);
} else {
  const reel = findReel(wanted);
  const dir = path.join(reel.dir, "audio");
  const specFile = path.join(dir, "spec.json");
  const spec = fs.existsSync(specFile) ? JSON.parse(fs.readFileSync(specFile, "utf8")) : {};
  for (const s of spec.sfx ?? []) jobs.push([dir, s, "sfx"]);
  for (const s of spec.music ?? []) jobs.push([dir, s, "music"]);
  // Library sounds this reel's edit names (sound: "whoosh")
  const editFile = path.join(reel.dir, "edit.tsx");
  const used = new Set(fs.existsSync(editFile) ? [...fs.readFileSync(editFile, "utf8").matchAll(/sound:\s*["']([\w-]+)["']/g)].map((m) => m[1]) : []);
  for (const name of used) {
    const s = libSpec.sfx.find((x) => x.file === `${name}.mp3`);
    if (s) jobs.push([LIB, s, "sfx"]);
    else if (fs.existsSync(path.join(LIB, `${name}.mp3`))) continue; // a file the user supplied
    else if (noKey) missing.push(path.join(LIB, `${name}.mp3`));
    else console.warn(`edit uses sound "${name}", which isn't in library/sfx/spec.json (add it there, or to the reel's spec)`);
  }
}

// Everything is levelled when it's made, so a volume in an edit means the same for every file:
// - music to -14 LUFS (Soundtrack.tsx: 0.3 between lines, 0.13 under speech). ElevenLabs tracks come out
//   anywhere from -10 to -20.
// - sound effects to the voice's loudness, -16 LUFS at their loudest 400 ms (Soundtrack.tsx default 0.5 sits a
//   little under the voice). As made they ranged from -6 (impact) to -34 (pop) (2026-10-23).
// Music the user supplies: `npm run audio -- <reel> --level audio/music/<file>.mp3` levels it the same way.
function level(file, kind = "music") {
  const stats = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "ebur128", "-f", "null", "-"], { encoding: "utf8" }).stderr;
  const lufs = kind === "music"
    ? Number(/I:\s+(-?[\d.]+) LUFS/.exec(stats.slice(stats.lastIndexOf("Summary")))?.[1])
    : Math.max(...[...stats.matchAll(/M:\s*(-?[\d.]+)/g)].map((m) => Number(m[1])));
  if (!Number.isFinite(lufs)) throw new Error(`couldn't measure ${file}`);
  const target = kind === "music" ? -14 : -16;
  const tmp = file.replace(/\.mp3$/, ".levelling.mp3");
  execFileSync("ffmpeg", ["-y", "-v", "error", "-i", file, "-af", `volume=${(target - lufs).toFixed(2)}dB,alimiter=limit=0.89:level=false`, "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "192k", tmp]);
  fs.renameSync(tmp, file);
  return lufs;
}

const seconds = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString());
let failed = 0;
async function run([dir, s, kind]) {
  const out = path.join(dir, s.file);
  if (fs.existsSync(out) && !force.has(s.file)) return;
  if (noKey) {
    missing.push(out);
    return;
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  try {
    fs.writeFileSync(out, kind === "music" ? await music(s) : await soundEffect(s));
    const was = ` (levelled from ${level(out, kind).toFixed(1)} LUFS)`;
    const got = seconds(out);
    const short = kind === "music" && got < s.seconds - 1 ? ` (asked ${s.seconds} s: ElevenLabs ended it early)` : "";
    console.log(`made   ${path.join(dir, s.file)}  ${got.toFixed(2)} s${short}${was}`);
  } catch (e) {
    failed++;
    console.error(`FAILED ${path.join(dir, s.file)}: ${e.message}`);
  }
}
const queue = [...jobs];
await Promise.all([0, 1].map(async () => {
  while (queue.length) await run(queue.shift());
}));

for (const dir of new Set(jobs.map(([d]) => d))) {
  const durations = {};
  for (const [d, s] of jobs) if (d === dir && fs.existsSync(path.join(d, s.file))) durations[s.file] = Math.round(seconds(path.join(d, s.file)) * 1000) / 1000;
  const file = path.join(dir, "durations.json");
  const old = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
  fs.writeFileSync(file, JSON.stringify({ ...old, ...durations }, null, 2) + "\n");
}
if (missing.length) {
  console.error(`No ELEVENLABS_API_KEY in .env, so these weren't made. Supply each file (then level it with --level), or take it out of the edit:\n  ${missing.join("\n  ")}`);
}
process.exit(failed || missing.length ? 1 : 0);
