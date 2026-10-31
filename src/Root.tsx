import React from "react";
import { Composition } from "remotion";
import { reels, stories, thumbnails } from "./reels";
import { Reel } from "./shared/Reel";
import { reelFrames, sceneSpans } from "./shared/timeline";

// One composition per reel folder: 1080x1920, 30 fps, as long as its cut (plus a short tail). `scenes` is only
// for the tools (still.mjs renders one frame per scene from it). Plus each reel's cover (thumbnail.tsx): one frame at 30 fps
// (not a <Still>, which runs at 1 fps, so video frame numbers mean the same as in the reel). And its story (story.tsx).
export const Root: React.FC = () => (
  <>
    {reels.map((r) => (
      <Composition key={r.id} id={r.id} component={Reel} durationInFrames={reelFrames(r.edit)} fps={30} width={1080} height={1920} defaultProps={{ folder: r.folder, scenes: sceneSpans(r.edit).map((s) => ({ from: s.from, to: s.to, layout: s.scene.layout })) }} />
    ))}
    {thumbnails.map((t) => (
      <Composition key={t.id} id={t.id} component={t.component} durationInFrames={1} fps={30} width={1080} height={1920} />
    ))}
    {stories.map((s) => (
      <Composition key={s.id} id={s.id} component={s.component} durationInFrames={s.frames} fps={30} width={1080} height={1920} />
    ))}
  </>
);
