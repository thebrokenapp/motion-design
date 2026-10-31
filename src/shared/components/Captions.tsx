import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { CAPTION, colors, fonts, W } from "../theme";
import type { Page } from "../timeline";

// The captions, in the reference's four styles, all in plain Poppins (no serif or italic: the user's call):
// face       white Poppins Bold over the speaker's chest, soft shadow; accent words gold ExtraBold
// face-ink   the same place and sizes in near-black, accent orange, for a speaker in a light shirt
// dark       near-black Poppins Bold between the graphic and the face card; accent words orange ExtraBold
// big        one or two words in near-black Poppins ExtraBold capitals under a graphic; accent orange
// big-light  the same in white with a shadow, over a dark background
// Each page pops in over 3 frames (scale 0.9 -> 1); nothing else moves, as in the reference.

// The space between words, from the word size (an em here would be the page's 16 px, not the caption's).
const gapOf = (style: Page["style"]) => (style === "big" || style === "big-light" ? 28 : 24);

const gradientText = (bg: string): React.CSSProperties => ({ background: bg, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" });

function wordStyle(style: Page["style"], accent: boolean): React.CSSProperties {
  const big = style === "big" || style === "big-light";
  if (big) {
    return {
      fontFamily: fonts.sans, fontWeight: 800, fontSize: 110, letterSpacing: -2, textTransform: "uppercase", lineHeight: 1.05,
      ...(accent ? gradientText(colors.orange) : { color: style === "big" ? colors.ink : "#fff" }),
      ...(style === "big-light" && !accent ? { textShadow: "0 6px 30px rgba(0,0,0,0.55)" } : {}),
    };
  }
  const onFace = style === "face" || style === "face-ink";
  if (accent) {
    return {
      fontFamily: fonts.sans, fontWeight: 800, fontSize: onFace ? 94 : 86, letterSpacing: -1.5, lineHeight: 1.1,
      ...gradientText(style === "face" ? colors.gold : colors.orange),
      ...(style === "face" ? { filter: "drop-shadow(0 4px 14px rgba(0,0,0,0.45))" } : {}),
    };
  }
  return {
    fontFamily: fonts.sans, fontWeight: 700, fontSize: onFace ? 84 : 78, letterSpacing: -1.5, lineHeight: 1.1,
    color: style === "face" ? "#fff" : colors.ink,
    ...(style === "face" ? { textShadow: "0 4px 22px rgba(0,0,0,0.55), 0 1px 3px rgba(0,0,0,0.35)" } : {}),
  };
}

export const Captions: React.FC<{ pages: Page[] }> = ({ pages }) => {
  const frame = useCurrentFrame();
  const page = pages.find((p) => frame >= p.from && frame < p.to);
  if (!page) return null;
  const t = frame - page.from;
  const pop = interpolate(t, [0, 3], [0.9, 1], { extrapolateRight: "clamp" });
  const y = page.style === "face" || page.style === "face-ink" ? CAPTION.face : page.style === "dark" ? CAPTION.dark : CAPTION.big;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 60, width: W - 120, top: y, transform: `translateY(-50%) scale(${pop})`, display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "baseline", columnGap: gapOf(page.style), textAlign: "center" }}>
        {page.words.map((w, i) => (
          <span key={i} style={wordStyle(page.style, w.accent)}>{w.text}</span>
        ))}
      </div>
    </AbsoluteFill>
  );
};
