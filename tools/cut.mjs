// Builds a reel's cut from its cut.json: the picture, the voice and the cut-out, all in reel time.
//   npm run cut -- <reel>               build what changed since last time
//   npm run cut -- <reel> --no-cutout   skip the cut-out (cards then show no head popping out; much faster)
//
// Writes in work/:
//   cut.json     segments and every kept word in reel time (the reel's edit.tsx imports it)
//   cut.txt      the cut as text: what's said in each segment, and what was removed
//   cut.mp4      the picture, frame-exact, 30 fps, no sound
//   voice.wav    the voice cut at the same frames, 8 ms fades at each join (no clicks), cleaned and levelled
//   cutout.webm  the speaker cut out of the picture (transparent), for the head popping out over cards
//   person.json  where the speaker is in each frame, so layouts frame the face without guessing
// Each segment is encoded (and cut out) once into work/segments/, so a new cut only redoes the new parts.
// Creates the reel's edit.tsx from tools/templates/ the first time.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { computeCut, describeCut, FPS } from "./lib/cut.mjs";
import { filterScriptFlag, findReel, probe, reelId } from "./lib/reel.mjs";

const args = process.argv.slice(2);
const reel = findReel(args[0]);
const withCutout = !args.includes("--no-cutout");
const work = path.join(reel.dir, "work");
const segDir = path.join(work, "segments");
fs.mkdirSync(segDir, { recursive: true });

function run(cmd, argv, quiet = false) {
  const r = spawnSync(cmd, argv, { stdio: ["ignore", quiet ? "ignore" : "inherit", "inherit"] });
  if (r.status !== 0) throw new Error(`${cmd} ${argv.slice(0, 4).join(" ")}... failed (${r.status})`);
}
const fresh = (out, ...inputs) => fs.existsSync(out) && inputs.every((i) => fs.statSync(i).mtimeMs <= fs.statSync(out).mtimeMs);

// 1. The cut itself
const cutFile = path.join(reel.dir, "cut.json");
const spec = fs.existsSync(cutFile) ? JSON.parse(fs.readFileSync(cutFile, "utf8")) : {};
const names = spec.clips?.length ? spec.clips : fs.readdirSync(work).filter((f) => f.endsWith(".words.json")).map((f) => f.replace(/\.words\.json$/, "")).sort();
const clips = Object.fromEntries(names.map((n) => {
  const words = JSON.parse(fs.readFileSync(path.join(work, `${n}.words.json`), "utf8")).words;
  return [n, { words, duration: Number(probe(path.join(work, `${n}.mp4`)).format.duration) }];
}));
const result = computeCut(clips, { ...spec, clips: names });
fs.writeFileSync(path.join(work, "cut.txt"), describeCut(result));
console.log(describeCut(result));

// 2. Picture: one file per segment, then joined without re-encoding
const segName = (s) => `${s.clip}_${s.fromF}_${s.toF}`;
for (const s of result.segments) {
  const out = path.join(segDir, `${segName(s)}.mp4`);
  const src = path.join(work, `${s.clip}.mp4`);
  if (fresh(out, src)) continue;
  // Written aside and moved into place: ffmpeg closes a killed encode as a valid, short file, which would then pass as cached.
  const part = `${out}.part.mp4`;
  run("ffmpeg", ["-y", "-v", "error", "-ss", String(Math.max(0, (s.fromF - 0.5) / FPS)), "-i", src, "-frames:v", String(s.frames),
    "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "14", "-g", "30", "-pix_fmt", "yuv420p", "-r", String(FPS),
    "-video_track_timescale", "15360", part]);
  fs.renameSync(part, out);
}
// The joiner offsets each file by the duration it's told; left to read it from the files, it was off by a frame
// at some joins (2026-10-23 test: 4 frames late after 10 s), which slides the picture against the voice.
const join = (ext, out) => {
  const list = path.join(segDir, `list${ext}.txt`);
  fs.writeFileSync(list, result.segments.map((s) => `file '${segName(s)}${ext}'\nduration ${(s.frames / FPS).toFixed(6)}`).join("\n") + "\n");
  run("ffmpeg", ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", ...(ext === ".mp4" ? ["-movflags", "+faststart"] : []), out]);
  onTheGrid(out);
};
// Every frame where Remotion will look for it: frame n at n/30 s, and exactly as many frames as the cut.
function onTheGrid(file) {
  const pts = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "packet=pts_time", "-of", "csv=p=0", file]).stdout.toString()
    .split("\n").filter(Boolean).map(Number).sort((a, b) => a - b);
  if (pts.length !== result.frames) throw new Error(`${file} has ${pts.length} frames, the cut has ${result.frames}`);
  const worst = pts.reduce((m, t, n) => Math.max(m, Math.abs(t - n / FPS)), 0);
  if (worst > 0.004) throw new Error(`${file}: frames off the 30 fps grid by up to ${worst.toFixed(3)} s`);
}
join(".mp4", path.join(work, "cut.mp4"));

// 3. Voice: every segment from its take's voice (the isolated one if made), 8 ms fades, joined, then cleaned up.
// highpass: rumble and handling noise; acompressor: evens out loud and quiet words; loudnorm: a steady level
// for the music to sit under (the final mix is mastered again to -14 LUFS).
const voiceOf = (c) => [`${c}.voice.clean.wav`, `${c}.voice.wav`].map((f) => path.join(work, f)).find((f) => fs.existsSync(f));
const inputs = [...new Set(result.segments.map((s) => voiceOf(s.clip)))];
const graph = result.segments.map((s, i) => {
  const d = s.frames / FPS;
  // apad + atrim make every piece exactly as long as its frames, so no later segment's voice can slip.
  return `[${inputs.indexOf(voiceOf(s.clip))}:a]atrim=start=${s.fromF / FPS}:end=${s.toF / FPS},asetpts=PTS-STARTPTS,apad=whole_dur=${d},atrim=end=${d},afade=t=in:d=0.008,afade=t=out:st=${Math.max(0, d - 0.008)}:d=0.008[a${i}]`;
});
graph.push(`${result.segments.map((_, i) => `[a${i}]`).join("")}concat=n=${result.segments.length}:v=0:a=1,highpass=f=80,acompressor=threshold=0.125:ratio=3:attack=8:release=120:makeup=1.5,loudnorm=I=-16:LRA=7:TP=-2,aresample=48000[voice]`);
const script = path.join(segDir, "voice.filter");
fs.writeFileSync(script, graph.join(";\n"));
run("ffmpeg", ["-y", "-v", "error", ...inputs.flatMap((f) => ["-i", f]), filterScriptFlag(script), script, "-map", "[voice]", "-ac", "1", "-c:a", "pcm_s16le", path.join(work, "voice.wav")]);

// 4. Cut-out and where the speaker is
const person = { fps: FPS, frames: [] };
if (withCutout) {
  // All new segments in one run of the matting tool, so the GPU starts up once.
  const jobs = result.segments
    .filter((s) => !(fresh(path.join(segDir, `${segName(s)}.webm`), path.join(work, `${s.clip}.mp4`)) && fs.existsSync(path.join(segDir, `${segName(s)}.webm.person.json`))))
    .map((s) => {
      const warm = Math.min(15, s.fromF); // frames matted before the segment so its first frames are settled
      return { src: path.join(work, `${s.clip}.mp4`), out: path.join(segDir, `${segName(s)}.webm`), from: (s.fromF - warm) / FPS, frames: s.frames, skip: warm };
    });
  if (jobs.length) {
    const t0 = Date.now();
    const jobFile = path.join(segDir, "cutout-jobs.json");
    fs.writeFileSync(jobFile, JSON.stringify(jobs, null, 1));
    console.log(`cut-out: ${jobs.length} segment(s), ${jobs.reduce((n, j) => n + j.frames, 0)} frames`);
    run(path.join(".venv", "bin", "python"), ["-I", "tools/cutout.py", "--jobs", jobFile]);
    console.log(`cut-out done in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  join(".webm", path.join(work, "cutout.webm"));
  for (const s of result.segments) {
    const frames = JSON.parse(fs.readFileSync(path.join(segDir, `${segName(s)}.webm.person.json`), "utf8")).frames;
    for (let i = 0; i < s.frames; i++) person.frames.push(frames[Math.min(i, frames.length - 1)] ?? null);
  }
}
fs.writeFileSync(path.join(work, "person.json"), JSON.stringify(person) + "\n");

// 5. What edit.tsx imports
const { segments, words, frames } = result;
fs.writeFileSync(path.join(work, "cut.json"), JSON.stringify({ fps: FPS, frames, cutout: withCutout, segments, words }, null, 1) + "\n");
const edit = path.join(reel.dir, "edit.tsx");
if (!fs.existsSync(edit)) {
  fs.writeFileSync(edit, fs.readFileSync(path.join("tools", "templates", "edit.tsx"), "utf8"));
  console.log(`created ${edit}`);
}
console.log(`Cut ready: ${(frames / FPS).toFixed(2)} s. Composition "${reelId(reel.folder)}". Still: npm run still -- "${reel.folder}" <seconds>`);
