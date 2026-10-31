// A reel's cover, from reels/<reel>/thumbnail.tsx (a still composition, <id>-thumbnail).
//   npm run thumbnail -- <reel>   -> renders/thumbnail.png, thumbnail.jpg (9:16, the reel's cover) and
//                                    thumbnail-grid.jpg (the middle 3:4, what the profile grid shows)
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fail, findReel, reelId } from "./lib/reel.mjs";

const reel = findReel(process.argv[2]);
if (!fs.existsSync(path.join(reel.dir, "thumbnail.tsx"))) fail(`No ${reel.dir}/thumbnail.tsx yet.`);
const outDir = path.join(reel.dir, "renders");
fs.mkdirSync(outDir, { recursive: true });

const t0 = Date.now();
const serveUrl = await bundle({
  entryPoint: path.resolve("src/index.ts"),
  // the same `@shared` alias as remotion.config.ts (which only the CLI reads)
  webpackOverride: (config) => ({ ...config, resolve: { ...config.resolve, alias: { ...(config.resolve?.alias ?? {}), "@shared": path.resolve("src/shared") } } }),
});
const composition = await selectComposition({ serveUrl, id: `${reelId(reel.folder)}-thumbnail` });
const png = path.join(outDir, "thumbnail.png");
await renderStill({ composition, serveUrl, output: png, overwrite: true });

const ffmpeg = (...args) => {
  const r = spawnSync("ffmpeg", ["-loglevel", "error", "-y", ...args], { stdio: "inherit" });
  if (r.status !== 0) fail("ffmpeg failed");
};
ffmpeg("-i", png, "-q:v", "1", path.join(outDir, "thumbnail.jpg"));
ffmpeg("-i", png, "-vf", "crop=1080:1440:0:240", "-q:v", "1", path.join(outDir, "thumbnail-grid.jpg"));
console.log(`Cover in ${Math.round((Date.now() - t0) / 1000)} s: ${outDir}/thumbnail.jpg, thumbnail-grid.jpg`);
