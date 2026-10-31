import React, { useMemo } from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { reels } from "../reels";
import { Captions } from "./components/Captions";
import { SceneView } from "./components/Layouts";
import { Soundtrack } from "./components/Soundtrack";
import { reelFile, ReelContext } from "./context";
import { captionPages, sceneSpans } from "./timeline";

// A reel: its scenes in order (each in its layout), the captions on top, the soundtrack under.
// Everything is timed from the reel's own edit.tsx, which reads the cut (work/cut.json).
export const Reel: React.FC<{ folder: string; scenes?: { from: number; to: number; layout: string }[] }> = ({ folder }) => {
  const reel = reels.find((r) => r.folder === folder);
  if (!reel) throw new Error(`No reel "${folder}"`);
  const { edit } = reel;
  const spans = useMemo(() => sceneSpans(edit), [edit]);
  const pages = useMemo(() => captionPages(edit, spans), [edit, spans]);
  const info = useMemo(() => ({ folder, edit, file: reelFile(folder) }), [folder, edit]);
  return (
    <ReelContext.Provider value={info}>
      <AbsoluteFill style={{ background: "#fff" }}>
        {spans.map((span, i) => (
          <Sequence key={i} from={span.from} durationInFrames={span.to - span.from} name={`${i + 1}. ${span.scene.layout}`}>
            <SceneView span={span} />
          </Sequence>
        ))}
        <Captions pages={pages} />
        <Soundtrack />
      </AbsoluteFill>
    </ReelContext.Provider>
  );
};
