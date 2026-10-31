// Finding a reel folder and probing media, shared by the tools.
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const VIDEO_EXT = /\.(mp4|mov|m4v|mkv|webm|avi|3gp)$/i;
export const REELS = "reels";

// "penpot" -> reels/penpot; "001" -> reels/001-something; an existing path is used as it is.
export function findReel(wanted) {
  if (!wanted) fail("Which reel? Pass its folder name (in reels/).");
  if (fs.existsSync(wanted) && fs.statSync(wanted).isDirectory() && path.resolve(wanted).startsWith(path.resolve(REELS) + path.sep)) {
    return { folder: path.basename(wanted), dir: path.join(REELS, path.basename(wanted)) };
  }
  const all = fs.existsSync(REELS) ? fs.readdirSync(REELS).filter((d) => !d.startsWith("_") && !d.startsWith(".") && fs.statSync(path.join(REELS, d)).isDirectory()) : [];
  const folder = all.find((d) => d === wanted) ?? all.find((d) => d.toLowerCase().startsWith(wanted.toLowerCase()));
  if (!folder) fail(`No reel "${wanted}" in reels/. Reels:\n  ${all.join("\n  ") || "(none yet)"}`);
  return { folder, dir: path.join(REELS, folder) };
}

// Composition ids may only use letters, numbers and hyphens.
export const reelId = (folder) => folder.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "reel";

export function probe(file) {
  return JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_format", "-show_streams", "-of", "json", file]).toString());
}

// ffmpeg 8 dropped -vsync and -filter_complex_script, and ffmpeg 4 doesn't have what replaced them, so ask the one here.
const refuses = (...flags) => spawnSync("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "nullsrc=s=64x64:d=0.1", ...flags, "-f", "null", "-"], { encoding: "utf8" }).stderr.includes("Unrecognized option");
export const cfrFlags = () => (refuses("-vsync", "cfr") ? ["-fps_mode", "cfr"] : ["-vsync", "cfr"]);
export const filterScriptFlag = (script) => (refuses("-filter_complex_script", script) ? "-/filter_complex" : "-filter_complex_script");

export function fail(message) {
  console.error(message);
  process.exit(1);
}
