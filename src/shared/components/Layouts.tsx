import { Video } from "@remotion/media";
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { useReel } from "../context";
import { colors, FULL, H, TOP, W } from "../theme";
import { headDuring, segmentAt, type Span } from "../timeline";
import type { GraphicProps } from "../types";
import { FaceCard, HoldLast } from "./FaceCard";

// One scene, drawn in its layout. Rendered inside a <Sequence> that starts at span.from, so frames here count
// from the scene's start; the videos (in reel time) are trimmed by span.from to match.

function graphicProps(span: Span, words: { text: string; start: number; end: number }[]): GraphicProps {
  const fps = 30;
  return {
    from: span.from,
    duration: span.to - span.from,
    words: words
      .filter((w) => w.start * fps >= span.from && w.start * fps < span.to)
      .map((w) => ({ text: w.text, start: Math.round(w.start * fps) - span.from, end: Math.round(w.end * fps) - span.from })),
  };
}

const Area: React.FC<{ top: number; bottom: number; children: React.ReactNode }> = ({ top, bottom, children }) => (
  <div style={{ position: "absolute", left: 0, top, width: W, height: bottom - top, display: "flex", alignItems: "center", justifyContent: "center" }}>
    {children}
  </div>
);

// The speaker full screen. Zoomed in (faceZoom), the head sits centred with its top FACE_TOP from the top of
// the screen, as in the reference, as far as the zoom allows without showing an edge. Every jump cut alternates
// a slight punch-in (x1 <-> x1.07), so cuts read as edits rather than glitches. A graphic, if the scene has one, is
// drawn over the whole frame and doesn't zoom (a title held over the speaker).
const FACE_TOP = 300;
const Face: React.FC<{ span: Span }> = ({ span }) => {
  const { edit, file } = useReel();
  const frame = useCurrentFrame();
  const head = headDuring(edit.person, span.from, span.to);
  const zoom = (span.scene.zoom ?? edit.faceZoom ?? 1) * (segmentAt(edit, span.from + frame) % 2 ? 1.07 : 1);
  const left = Math.min(0, Math.max(W - W * zoom, W / 2 - head.cx * zoom));
  const top = Math.min(0, Math.max(H - H * zoom, FACE_TOP - head.top * zoom));
  const G = span.scene.graphic;
  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      <HoldLast from={span.from}>
        <Video src={file("work/cut.mp4")} trimBefore={span.from} muted
          style={{ position: "absolute", left, top, width: W * zoom, height: H * zoom, maxWidth: "none" }} />
      </HoldLast>
      {G ? <AbsoluteFill><G {...graphicProps(span, edit.cut.words)} /></AbsoluteFill> : null}
    </AbsoluteFill>
  );
};

const Split: React.FC<{ span: Span; background: string }> = ({ span, background }) => {
  const { edit } = useReel();
  const G = span.scene.graphic;
  return (
    <AbsoluteFill style={{ background }}>
      {G ? <Area {...TOP}><G {...graphicProps(span, edit.cut.words)} /></Area> : null}
      <FaceCard from={span.from} to={span.to} card={span.scene.card} />
    </AbsoluteFill>
  );
};

const Graphic: React.FC<{ span: Span }> = ({ span }) => {
  const { edit } = useReel();
  const G = span.scene.graphic;
  return <AbsoluteFill style={{ background: colors.paper }}>{G ? <Area {...FULL}><G {...graphicProps(span, edit.cut.words)} /></Area> : null}</AbsoluteFill>;
};

// "Look at this": the graphic sharp in front of a dark, blurred, enlarged copy of itself, with a vignette.
const Focus: React.FC<{ span: Span }> = ({ span }) => {
  const { edit } = useReel();
  const G = span.scene.graphic;
  if (!G) return <AbsoluteFill style={{ background: "#111" }} />;
  const props = graphicProps(span, edit.cut.words);
  return (
    <AbsoluteFill style={{ background: "#141416", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: "scale(1.35)", filter: "blur(26px) brightness(0.5)" }}>
        <Area {...FULL}><G {...props} /></Area>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 42%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.65) 100%)" }} />
      <Area {...FULL}><G {...props} /></Area>
    </AbsoluteFill>
  );
};

// The graphic alone, on the whole frame: it draws the speaker itself, for what the other layouts can't do (a
// background that changes behind the cut-out, words behind the head).
const Stage: React.FC<{ span: Span }> = ({ span }) => {
  const { edit } = useReel();
  const G = span.scene.graphic;
  return <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>{G ? <G {...graphicProps(span, edit.cut.words)} /> : null}</AbsoluteFill>;
};

export const SceneView: React.FC<{ span: Span }> = ({ span }) => {
  switch (span.scene.layout) {
    case "stage":
      return <Stage span={span} />;
    case "face":
      return <Face span={span} />;
    case "split":
      return <Split span={span} background={colors.paper} />;
    case "end":
      return <Split span={span} background={`radial-gradient(ellipse at 50% 30%, #FFF8F1 0%, ${colors.cream} 70%)`} />;
    case "graphic":
      return <Graphic span={span} />;
    case "focus":
      return <Focus span={span} />;
  }
};
