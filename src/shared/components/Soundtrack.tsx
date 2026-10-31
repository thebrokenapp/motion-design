import { Audio } from "@remotion/media";
import React from "react";
import { interpolate, Sequence, useVideoConfig } from "remotion";
import { soundFile, useReel } from "../context";
import { FPS, resolveAnchors, speechRanges } from "../timeline";

// The voice (work/voice.wav, already cut and levelled), the music bed and the sound effects. Sound effects are
// levelled to the voice when made (tools/audio.mjs), so the default 0.5 sits a little under it.
// The music sits at `volume` between lines and dips to `under` whenever the speaker talks: down over the
// 0.25 s before a line, back up over the 0.4 s after it. It fades in over 0.3 s and out over the last second.
// `levels` multiply all of that from a moment on (the track keeps running underneath while it's at 0).
export const Soundtrack: React.FC = () => {
  const { edit, folder, file } = useReel();
  const { durationInFrames } = useVideoConfig();
  const speech = speechRanges(edit.cut.words);
  const music = edit.music;
  const open = music?.volume ?? 0.3;
  const under = music?.under ?? 0.13;
  const levels = music?.levels ?? [];
  const levelFrames = resolveAnchors(levels.map((l) => l.at), edit.cut.words, "music levels");
  const levelAt = (f: number) => levels.reduce((v, l, i) => (f < levelFrames[i] ? v : v + (l.level - v) * Math.min(1, (f - levelFrames[i] + 1) / (l.frames ?? 3))), 1);
  const musicVolume = (f: number) => {
    const t = f / FPS;
    const duck = speech.reduce((v, [s, e]) => Math.min(v, interpolate(t, [s - 0.25, s, e, e + 0.4], [open, under, under, open], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })), open);
    return levelAt(f) * duck * interpolate(f, [0, 9, durationInFrames - FPS, durationInFrames], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  };
  const sfx = edit.sfx ?? [];
  const sfxAt = resolveAnchors(sfx.map((s) => s.at), edit.cut.words, "sfx");
  return (
    <>
      <Audio src={file("work/voice.wav")} />
      {music ? <Audio src={file(music.src)} loop trimBefore={Math.round((music.skip ?? 0) * FPS)} volume={musicVolume} /> : null}
      {sfx.map((s, i) => (
        <Sequence key={i} from={Math.max(0, sfxAt[i] + Math.round((s.offset ?? 0) * FPS))} layout="none">
          <Audio src={soundFile(folder, s.sound)} volume={s.volume ?? 0.5} />
        </Sequence>
      ))}
    </>
  );
};
