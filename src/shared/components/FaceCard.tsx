import { Video } from "@remotion/media";
import React from "react";
import { Freeze, Img, OffthreadVideo } from "remotion";
import { useReel } from "../context";
import { CARD, H, W } from "../theme";
import { headDuring } from "../timeline";
import type { ReelEdit } from "../types";

// Past the end of the cut (the reel's short tail after the last word) the speaker holds the last frame, in every
// layer alike. `from` is the reel frame the scene starts on.
export const HoldLast: React.FC<{ from: number; children: React.ReactNode }> = ({ from, children }) => {
  const { edit } = useReel();
  const last = Math.max(0, edit.cut.frames - 1 - from);
  return <Freeze frame={last} active={(f) => f > last}>{children}</Freeze>;
};

// The card's outline (its top corners rounded), plus, with `head`, the strip above it the head rises into: the
// cut-out's clip when a background picture stands in for the take's room.
function cardClip(head: boolean): string {
  const [l, r, t, k] = [CARD.left, CARD.left + CARD.width, CARD.top, CARD.radius];
  const card = `V ${t + k} A ${k} ${k} 0 0 1 ${l + k} ${t} H ${r - k} A ${k} ${k} 0 0 1 ${r} ${t + k} V ${H} Z`;
  return head
    ? `path("M ${l} 0 H ${r} V ${t} H ${r - k} A ${k} ${k} 0 0 1 ${r} ${t + k} V ${H} H ${l} V ${t + k} A ${k} ${k} 0 0 1 ${l + k} ${t} H ${l} Z")`
    : `path("M ${l} ${H} ${card}")`;
}

// The speaker in a rounded card at the bottom of the screen, the head rising out over the card's top edge
// (the reference's split and end layouts). Two layers with the same framing: the take itself, clipped to the
// card; and the cut-out (work/cutout.webm), shown only above the card, so just the head pops out over the page.
// With `card.background` (and a cut-out), the card holds that picture instead, softly blurred like a lens's
// background, and the whole cut-out stands in front of it, rising out over the top edge the same way.
// `from` is the reel frame the scene starts on (the videos are in reel time).
export const FaceCard: React.FC<{ from: number; to: number; card?: ReelEdit["card"] }> = ({ from, to, card: sceneCard }) => {
  const { edit, file } = useReel();
  const card = sceneCard ?? edit.card;
  const scale = card?.scale ?? 0.92;
  const lift = card?.lift ?? 170;
  const head = headDuring(edit.person, from, to);
  const w = W * scale;
  const h = H * scale;
  // Head centred on the card, its top `lift` px above the card. Kept so the take always fills the card.
  const left = Math.min(CARD.left, Math.max(CARD.left + CARD.width - w, W / 2 - head.cx * scale));
  const top = Math.min(CARD.top, Math.max(H - h, CARD.top - lift - head.top * scale));
  const videoStyle: React.CSSProperties = { position: "absolute", width: w, height: h, maxWidth: "none" };
  const cardBox: React.CSSProperties = { position: "absolute", left: CARD.left, top: CARD.top, width: CARD.width, height: H - CARD.top + CARD.radius, borderRadius: CARD.radius, overflow: "hidden" };
  if (card?.background && edit.cut.cutout) {
    return (
      <HoldLast from={from}>
        <div style={{ ...cardBox, background: "#d8cfc2" }}>
          <Img src={file(card.background)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: `50% ${card.backgroundY ?? 38}%`, filter: "blur(3px)", transform: "scale(1.03)" }} />
        </div>
        <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, clipPath: cardClip(head.found) }}>
          <OffthreadVideo src={file("work/cutout.webm")} trimBefore={from} transparent muted style={{ ...videoStyle, left, top }} />
        </div>
      </HoldLast>
    );
  }
  return (
    <HoldLast from={from}>
      <div style={{ ...cardBox, background: "#222" }}>
        <Video src={file("work/cut.mp4")} trimBefore={from} muted style={{ ...videoStyle, left: left - CARD.left, top: top - CARD.top }} />
      </div>
      {edit.cut.cutout && head.found ? (
        <div style={{ position: "absolute", left: CARD.left, top: 0, width: CARD.width, height: CARD.top, overflow: "hidden" }}>
          <OffthreadVideo src={file("work/cutout.webm")} trimBefore={from} transparent muted style={{ ...videoStyle, left: left - CARD.left, top }} />
        </div>
      ) : null}
    </HoldLast>
  );
};
