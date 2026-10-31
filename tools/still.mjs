// Stills of a reel, to look at an edit without rendering all of it. Bundles once, then renders each frame.
//   npm run still -- <reel> 4.5          -> reels/<reel>/renders/stills/still-4.5.png (seconds into the reel)
//   npm run still -- <reel> 1,4.5,9      several, plus renders/sheet.jpg with all of them side by side
//   npm run still -- <reel> scenes       one frame from each scene (60% of the way in), sheets of 8: sheet-1.jpg...
//   npm run still -- <reel> 1,4.5 --story  the reel's story (story.tsx) instead, in renders/stills/story/
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { findReel, reelId } from "./lib/reel.mjs";

const story = process.argv.includes("--story");
const [wanted, times = "0"] = process.argv.slice(2).filter((a) => a !== "--story");
const reel = findReel(wanted);
const id = story ? `${reelId(reel.folder)}-story` : reelId(reel.folder);
const outDir = path.join(reel.dir, "renders", "stills", ...(story ? ["story"] : []));
fs.mkdirSync(outDir, { recursive: true });

const t0 = Date.now();
const serveUrl = await bundle({
  entryPoint: path.resolve("src/index.ts"),
  // the same `@shared` alias as remotion.config.ts (which only the CLI reads)
  webpackOverride: (config) => ({ ...config, resolve: { ...config.resolve, alias: { ...(config.resolve?.alias ?? {}), "@shared": path.resolve("src/shared") } } }),
});
const composition = await selectComposition({ serveUrl, id, inputProps: { folder: reel.folder } });
const frames = times === "scenes"
  ? composition.props.scenes.map((s) => Math.round(s.from + (s.to - s.from) * 0.6))
  : times.split(",").map((t) => Math.round(Number(t) * composition.fps));
const files = [];
for (const f of frames) {
  const frame = Math.min(composition.durationInFrames - 1, f);
  const output = path.join(outDir, `still-${(frame / composition.fps).toFixed(1)}.png`);
  await renderStill({ composition, serveUrl, output, frame, inputProps: { folder: reel.folder }, overwrite: true });
  files.push(output);
}

// Pictures of eight stills each, four to a row, for a quick look
const sheets = [];
for (let i = 0; files.length > 1 && i < files.length; i += 8) {
  const out = path.join(outDir, files.length > 8 ? `sheet-${i / 8 + 1}.jpg` : "sheet.jpg");
  sheet(files.slice(i, i + 8), out);
  sheets.push(out);
}
function sheet(files, out) {
  const cols = Math.min(4, files.length);
  const rows = Math.ceil(files.length / cols);
  const pad = cols * rows - files.length;
  const inputs = [...files.flatMap((f) => ["-i", f]), ...Array.from({ length: pad }, () => ["-f", "lavfi", "-i", "color=c=white:s=1080x1920:d=1"]).flat()];
  const n = files.length + pad;
  const scaled = Array.from({ length: n }, (_, i) => `[${i}:v]scale=360:640,setsar=1[s${i}]`);
  const rowsGraph = Array.from({ length: rows }, (_, r) => `${Array.from({ length: cols }, (_, c) => `[s${r * cols + c}]`).join("")}hstack=inputs=${cols}[r${r}]`);
  const all = rows > 1 ? `${Array.from({ length: rows }, (_, r) => `[r${r}]`).join("")}vstack=inputs=${rows}[out]` : `[r0]null[out]`;
  spawnSync("ffmpeg", ["-v", "error", "-y", ...inputs, "-filter_complex", [...scaled, ...rowsGraph, all].join(";"), "-map", "[out]", "-frames:v", "1", "-q:v", "3", out], { stdio: "inherit" });
}
console.log(`${files.length} still(s) in ${((Date.now() - t0) / 1000).toFixed(0)} s: ${files.map((f) => path.basename(f)).join(", ")}${sheets.length ? `\nSheets: ${sheets.join(", ")}` : ""}`);
