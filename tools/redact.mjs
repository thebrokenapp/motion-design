// Blurs the private parts of a reel's screenshots (names, numbers, photos), so the originals never reach a render.
//   npm run redact -- <reel>
// reels/<reel>/redact.json lists each screenshot in assets/ and the boxes to blur, in the screenshot's own pixels:
//   { "form.png": [{ "x": 26, "y": 324, "w": 328, "h": 38, "note": "full name" }], "home.png": [] }
// A name with a slash is a path in the reel folder instead ("response/IMG_1.PNG").
// Writes work/redacted/<name>.png (spaces in the name become "-"): each box under a heavy Gaussian blur (sigma 7 px, or the box's own "sigma")
// that takes in nothing from outside the box, or with "fill": true a flat patch of the box's average colour, which can't be
// guessed back as a blur can, so use it on phone and ID numbers. Then the whole picture scaled up with lanczos to about 1100 px wide
// (small desktop screenshots: 3x), so its text stays sharp at the sizes a reel shows it. A screenshot with no
// boxes is only scaled. The edit reads the copies (`work/redacted/<name>.png`), never assets/.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fail, findReel, probe } from "./lib/reel.mjs";

const reel = findReel(process.argv[2]);
const listFile = path.join(reel.dir, "redact.json");
if (!fs.existsSync(listFile)) fail(`No ${listFile}: list the screenshots and the boxes to blur (format at the top of tools/redact.mjs)`);
const list = JSON.parse(fs.readFileSync(listFile, "utf8"));
const out = path.join(reel.dir, "work", "redacted");
fs.mkdirSync(out, { recursive: true });

for (const [name, boxes] of Object.entries(list)) {
  const src = name.includes("/") ? path.join(reel.dir, name) : path.join(reel.dir, "assets", name);
  if (!fs.existsSync(src)) fail(`${listFile}: no ${src}`);
  const { width, height } = probe(src).streams[0];
  const k = Math.max(1, Math.ceil(1100 / width));
  // Each box: crop it out, blur the crop on its own (edges replicate, so nothing outside leaks in), lay it back.
  const chain = [];
  let last = "0:v";
  boxes.forEach((b, i) => {
    const x = Math.max(0, Math.round(b.x)), y = Math.max(0, Math.round(b.y));
    const w = Math.min(width - x, Math.round(b.w)), h = Math.min(height - y, Math.round(b.h));
    const hide = b.fill ? `scale=1:1:flags=area,scale=${w}:${h}:flags=neighbor` : `gblur=sigma=${b.sigma ?? 7}:steps=6`;
    chain.push(`[0:v]crop=${w}:${h}:${x}:${y},${hide}[b${i}]`, `[${last}][b${i}]overlay=${x}:${y}[o${i}]`);
    last = `o${i}`;
  });
  chain.push(`[${last}]scale=${width * k}:${height * k}:flags=lanczos,format=rgb24[out]`);
  const dest = path.join(out, path.basename(name).replace(/\.[^.]+$/, ".png").replace(/\s+/g, "-"));
  const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", src, "-filter_complex", chain.join(";"), "-map", "[out]", "-frames:v", "1", dest], { stdio: "inherit" });
  if (r.status !== 0) fail(`ffmpeg failed on ${name}`);
  console.log(`${dest}  ${width * k}x${height * k} (${k}x), ${boxes.length} box${boxes.length === 1 ? "" : "es"} blurred`);
}
