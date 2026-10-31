// Renders a reel into its own folder.
//   npm run render -- <reel>                 -> reels/<reel>/renders/<id>.mp4, sound mastered for Instagram
//   npm run render -- <reel> --story         -> reels/<reel>/renders/story.mp4, from the reel's story.tsx
// Extra flags pass through to Remotion (e.g. --scale=0.5 for a quick look). Stills: tools/still.mjs.
// Mastering: two-pass loudnorm to -14 LUFS (linear, so the mix keeps its dynamics), then a limiter so peaks stay
// under -1.5 dBTP after Instagram's AAC re-encode. The unmastered render is kept next to it.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { findReel, reelId } from "./lib/reel.mjs";

const [wanted, ...args] = process.argv.slice(2);
const reel = findReel(wanted);
const story = args.includes("--story");
const rest = args.filter((a) => a !== "--story");
const id = story ? `${reelId(reel.folder)}-story` : reelId(reel.folder);
const outDir = path.join(reel.dir, "renders");
fs.mkdirSync(outDir, { recursive: true });

const remotion = (args) => {
  const r = spawnSync("npx", ["remotion", ...args], { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

const name = story ? "story" : id;
const raw = path.join(outDir, `${name}.unmastered.mp4`);
const final = path.join(outDir, `${name}.mp4`);
const t0 = Date.now();
remotion(["render", "src/index.ts", id, raw, ...rest]);
const secs = (Date.now() - t0) / 1000;

const measure = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", raw, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"], { encoding: "utf8" });
const m = JSON.parse(measure.stderr.slice(measure.stderr.lastIndexOf("{")));
const chain = [
  `loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`,
  // at loudnorm's 192 kHz, so the limiter sees inter-sample peaks; -2.6 dBFS lands under -1.5 dBTP after AAC
  "alimiter=limit=0.74:attack=2:release=60:level=false",
].join(",");
const r = spawnSync("ffmpeg", ["-y", "-v", "error", "-i", raw, "-c:v", "copy", "-af", chain, "-ar", "48000", "-ac", "2", "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", final], { stdio: "inherit" });
if (r.status !== 0) process.exit(r.status ?? 1);

const check = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", final, "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" }).stderr;
const lufs = /I:\s+(-?[\d.]+) LUFS/.exec(check.slice(check.lastIndexOf("Summary")))?.[1];
const peak = /Peak:\s+(-?[\d.]+) dBFS/.exec(check.slice(check.lastIndexOf("Summary")))?.[1];
console.log(`\nRendered in ${secs.toFixed(0)} s. Mastered: ${final} (${lufs} LUFS, true peak ${peak} dBTP)`);
