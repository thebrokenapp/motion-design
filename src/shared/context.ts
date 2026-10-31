import { createContext, useContext } from "react";
import { staticFile } from "remotion";
import type { ReelEdit } from "./types";

// What every piece of a reel can reach: its edit, and its files (public/reels -> reels, public/library -> library).
export type ReelInfo = { folder: string; edit: ReelEdit; file: (pathInReel: string) => string };

export const ReelContext = createContext<ReelInfo | null>(null);

export function useReel(): ReelInfo {
  const r = useContext(ReelContext);
  if (!r) throw new Error("useReel() outside a reel");
  return r;
}

export const reelFile = (folder: string) => (p: string) => staticFile(`reels/${folder}/${p}`);

// "whoosh" -> library/sfx/whoosh.mp3; anything with a slash is a file in the reel folder.
export const soundFile = (folder: string, sound: string) =>
  sound.includes("/") ? staticFile(`reels/${folder}/${sound}`) : staticFile(`library/sfx/${sound}.mp3`);
