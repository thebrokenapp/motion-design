import type React from "react";
import { withSpelling } from "./shared/timeline";
import type { ReelEdit } from "./shared/types";

// Every reel is a folder in reels/ with an edit.tsx (created by `npm run cut`). Found automatically; folders
// starting with "_" or "." are skipped. Composition ids may only use letters, numbers and hyphens.
const ctx = require.context("../reels", true, /^\.\/[^_.][^/]*\/edit\.tsx$/);

export const reelId = (folder: string) => folder.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "reel";

export const reels = ctx.keys().map((key) => {
  const folder = key.split("/")[1];
  return { folder, id: reelId(folder), edit: withSpelling(ctx(key).default as ReelEdit) };
});

// A reel's cover, if it has one: reels/<folder>/thumbnail.tsx, a still (1080x1920) rendered by `npm run thumbnail`.
const thumbs = require.context("../reels", true, /^\.\/[^_.][^/]*\/thumbnail\.tsx$/);

export const thumbnails = thumbs.keys().map((key) => {
  const folder = key.split("/")[1];
  return { folder, id: `${reelId(folder)}-thumbnail`, component: thumbs(key).default as React.FC };
});

// A reel's story, if it has one: reels/<folder>/story.tsx, a short video on its own timeline (no voice, no cut),
// e.g. a thank-you after the reel did well. Exports the component as default and its length as `frames`.
// Rendered by `npm run render -- <reel> --story`.
const storyFiles = require.context("../reels", true, /^\.\/[^_.][^/]*\/story\.tsx$/);

export const stories = storyFiles.keys().map((key) => {
  const folder = key.split("/")[1];
  const mod = storyFiles(key) as { default: React.FC; frames: number };
  return { folder, id: `${reelId(folder)}-story`, component: mod.default, frames: mod.frames };
});
