// Building blocks for the app graphics, in the reference's look: white, soft shadows, rounded, Poppins.
// Frames count from the start of the scene the graphic is in (useCurrentFrame inside a scene's Sequence).
// Anything more involved than these (a cursor clicking through a flow, UI rebuilt from screenshots) goes in the
// reel's own graphics/ folder; a piece used by two reels moves here.
import React from "react";
import { Easing, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useReel } from "../context";
import { colors, fonts } from "../theme";
import { norm } from "../timeline";
import type { GraphicProps } from "../types";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.2, 0.8, 0.2, 1);

// Fades, rises and un-blurs its children in, starting at frame `at` (of the scene), over `frames`.
export const Appear: React.FC<{ at?: number; frames?: number; rise?: number; blur?: number; scale?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({
  at = 0, frames = 9, rise = 24, blur = 10, scale = 0.97, style, children,
}) => {
  const t = interpolate(useCurrentFrame(), [at, at + frames], [0, 1], { ...clamp, easing: ease });
  return (
    <div style={{ opacity: t, transform: `translateY(${(1 - t) * rise}px) scale(${scale + (1 - scale) * t})`, filter: blur ? `blur(${(1 - t) * blur}px)` : undefined, ...style }}>
      {children}
    </div>
  );
};

// When a word is said in this scene, in frames from the scene's start, to time a graphic's beats to the voice.
// `nth` picks a later saying of it (0 = the first). `fallback` if the scene doesn't say it.
export function saidAt(words: GraphicProps["words"], word: string, fallback = 0, nth = 0): number {
  const want = norm(word);
  return words.filter((w) => norm(w.text) === want)[nth]?.start ?? fallback;
}

// Pops its children in at frame `at`, with a little overshoot: icons, logos, badges.
export const Pop: React.FC<{ at?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ at = 0, style, children }) => {
  const s = spring({ frame: useCurrentFrame() - at, fps: useVideoConfig().fps, config: { damping: 12, stiffness: 190, mass: 0.6 } });
  return <div style={{ transform: `scale(${s})`, opacity: Math.min(1, s * 2), ...style }}>{children}</div>;
};

// A rubber-stamp word slammed on at frame `at` (BLOCKED): it lands from 1.6x with a slight tilt.
export const Stamp: React.FC<{ text: string; at?: number; color?: string; size?: number; rotate?: number }> = ({ text, at = 0, color = "#E5484D", size = 72, rotate = -7 }) => {
  const f = useCurrentFrame() - at;
  if (f < 0) return null;
  const t = interpolate(f, [0, 5], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  return (
    <div style={{ display: "inline-block", transform: `rotate(${rotate}deg) scale(${1.6 - 0.6 * t})`, opacity: t, border: `7px solid ${color}`, borderRadius: 20, padding: "4px 30px", background: "rgba(255,255,255,0.92)", color, fontFamily: fonts.sans, fontWeight: 800, fontSize: size, letterSpacing: 3 }}>
      {text}
    </div>
  );
};

// A brand's mark from simple-icons (`import { siGooglechrome } from "simple-icons"`), in its own colour or `color`.
export const BrandLogo: React.FC<{ icon: { title: string; hex: string; path: string }; size?: number; color?: string }> = ({ icon, size = 120, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={icon.title}>
    <path d={icon.path} fill={color ?? `#${icon.hex}`} />
  </svg>
);

// A desktop app or browser window: traffic lights, an optional address bar, rounded, soft shadow.
export const Window: React.FC<{ width: number; height?: number; url?: React.ReactNode; title?: string; children?: React.ReactNode; style?: React.CSSProperties }> = ({
  width, height, url, title, children, style,
}) => (
  <div style={{ width, height, background: "#fff", borderRadius: 26, border: `1.5px solid ${colors.line}`, boxShadow: "0 30px 80px rgba(20,20,40,0.12), 0 6px 18px rgba(20,20,40,0.06)", overflow: "hidden", display: "flex", flexDirection: "column", ...style }}>
    <div style={{ height: 54, flexShrink: 0, display: "flex", alignItems: "center", gap: 10, padding: "0 20px", borderBottom: `1.5px solid ${colors.line}`, background: "#FBFBFC" }}>
      {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => <div key={c} style={{ width: 15, height: 15, borderRadius: 8, background: c }} />)}
      {url ? (
        <div style={{ marginLeft: 18, flex: 1, height: 32, borderRadius: 10, background: "#F0F0F3", display: "flex", alignItems: "center", gap: 8, padding: "0 14px", fontFamily: fonts.sans, fontSize: 18, color: colors.muted }}>{url}</div>
      ) : title ? (
        <div style={{ marginLeft: 14, fontFamily: fonts.sans, fontWeight: 600, fontSize: 19, color: colors.ink }}>{title}</div>
      ) : null}
    </div>
    <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>{children}</div>
  </div>
);

// A screenshot (a file in the reel folder, e.g. "assets/home.png") drifting slowly from one framing to another.
export const Shot: React.FC<{ src: string; frames: number; from?: { scale: number; x: number; y: number }; to?: { scale: number; x: number; y: number }; style?: React.CSSProperties }> = ({
  src, frames, from = { scale: 1, x: 0, y: 0 }, to = { scale: 1.06, x: 0, y: 0 }, style,
}) => {
  const { file } = useReel();
  const t = interpolate(useCurrentFrame(), [0, Math.max(1, frames)], [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const v = (k: "scale" | "x" | "y") => from[k] + (to[k] - from[k]) * t;
  return <Img src={file(src)} style={{ width: "100%", display: "block", transform: `translate(${v("x")}px, ${v("y")}px) scale(${v("scale")})`, transformOrigin: "50% 0%", ...style }} />;
};

// A rounded pill: an icon, a label, an optional tag (the reference's GitHub repo pill with "FREE").
export const Pill: React.FC<{ icon?: React.ReactNode; text: string; tag?: string; width?: number }> = ({ icon, text, tag, width = 560 }) => (
  <div style={{ width, height: 104, borderRadius: 26, background: "#fff", border: `1.5px solid ${colors.line}`, boxShadow: "0 14px 40px rgba(20,20,40,0.08)", display: "flex", alignItems: "center", gap: 18, padding: "0 28px", fontFamily: fonts.sans }}>
    {icon}
    <div style={{ flex: 1, fontSize: 30, fontWeight: 600, color: colors.ink }}>{text}</div>
    {tag ? <div style={{ background: "#1F9D55", color: "#fff", fontWeight: 700, fontSize: 18, letterSpacing: 1, borderRadius: 999, padding: "6px 14px" }}>{tag}</div> : null}
  </div>
);

// A number counting up from `from` to `to` between frames `at` and `at + frames` (stars, users, downloads).
export const Counter: React.FC<{ from?: number; to: number; at?: number; frames?: number; format?: (n: number) => string; style?: React.CSSProperties }> = ({
  from = 0, to, at = 0, frames = 24, format = (n) => Math.round(n).toLocaleString("en-US"), style,
}) => {
  const t = interpolate(useCurrentFrame(), [at, at + frames], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  return <span style={{ fontFamily: fonts.sans, fontWeight: 700, fontVariantNumeric: "tabular-nums", ...style }}>{format(from + (to - from) * t)}</span>;
};

// A number rolling into place digit by digit, each column a strip of 0-9 sliding up to its digit ("45,000"): a
// livelier proof number than `Counter`. Columns start `stagger` frames apart, left first; `spin` adds full turns.
// The original rolls for 1.1 s (33 frames); 24 suits our 2-4 s scenes. Anything that isn't a digit (",", "+", "%",
// "₹") stands still. Size and colour come from `style` or the parent.
// Adapted from HyperFrames `number-wheel` (HeyGen, Apache-2.0; catalog/hyperframes, npm run catalog).
export const Odometer: React.FC<{ value: string; at?: number; frames?: number; stagger?: number; spin?: number; style?: React.CSSProperties }> = ({
  value, at = 0, frames = 24, stagger = 1.5, spin = 0, style,
}) => {
  const frame = useCurrentFrame();
  let column = 0;
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", fontFamily: fonts.sans, fontWeight: 700, fontVariantNumeric: "tabular-nums", ...style }}>
      {[...value].map((ch, i) => {
        if (!/\d/.test(ch)) return <span key={i}>{ch}</span>;
        const start = at + column++ * stagger;
        const stops = spin * 10 + Number(ch);
        const t = interpolate(frame, [start, start + frames], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
        return (
          <span key={i} style={{ display: "inline-block", height: "1em", lineHeight: "1em", overflow: "hidden" }}>
            <span style={{ display: "grid", transform: `translateY(${-stops * t}em)` }}>
              {Array.from({ length: stops + 1 }, (_, n) => <span key={n} style={{ height: "1em" }}>{n % 10}</span>)}
            </span>
          </span>
        );
      })}
    </span>
  );
};

// The call to action, as the reference ends: "COMMENT" over the keyword in quotes, in big Poppins capitals (the
// reference's serif is dropped), the keyword orange. `lead` changes the first line ("SAVE THIS", "FOLLOW FOR").
export const Cta: React.FC<{ word: string; lead?: string; size?: number }> = ({ word, lead = "COMMENT", size = 112 }) => (
  <div style={{ fontFamily: fonts.sans, fontWeight: 900, fontSize: size, lineHeight: 1.02, letterSpacing: -2, textAlign: "center", textTransform: "uppercase" }}>
    <div style={{ color: colors.ink }}>{lead}</div>
    <div style={{ background: colors.orange, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", padding: "0 0.08em" }}>“{word}”</div>
  </div>
);

// A white card with a logo and a name (the reference's end card, and product intros).
export const LogoCard: React.FC<{ logo?: string; name: string; width?: number }> = ({ logo, name, width = 870 }) => {
  const { file } = useReel();
  return (
    <div style={{ width, height: 450, borderRadius: 48, background: "#fff", boxShadow: "0 24px 70px rgba(60,40,20,0.10)", border: "1.5px solid rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 }}>
      {logo ? <Img src={file(logo)} style={{ height: 210, objectFit: "contain" }} /> : null}
      <div style={{ fontFamily: fonts.sans, fontWeight: 600, fontSize: 84, letterSpacing: -2, color: colors.ink }}>{name}</div>
    </div>
  );
};

// ---- Screenshots, shown as crops (reel 2, reel 4) ----------------------------------------

// A part of a screenshot, in its own pixels.
export type Box = { x: number; y: number; w: number; h: number };
export const pad = (b: Box, n: number): Box => ({ x: b.x - n, y: b.y - n, w: b.w + 2 * n, h: b.h + 2 * n });

const ORANGE = "#FF7A00";
const rgba = (hex: string, a: number) => `rgba(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(",")},${a})`;
const screenCard: React.CSSProperties = { position: "relative", background: "#fff", borderRadius: 32, border: `1.5px solid ${colors.line}`, boxShadow: "0 24px 60px rgba(20,20,40,0.10)" };

// A crop of a screenshot (a file in the reel folder), `width` px wide on screen and as tall as `box` makes it, in a
// card. Boxes are in the screenshot's own pixels, `shot` px wide in all; a copy scaled up for sharpness (what
// `npm run redact` writes) keeps the original's pixels. `pans` scroll it to other heights (`y`, from frame `at`).
// `marks` are drawn over it, placed in screenshot pixels with `place`, so they stay on what they mark while it
// scrolls.
export const Screen: React.FC<{ src: string; shot: number; box: Box; width: number; pans?: { at: number; y: number; frames?: number }[]; dark?: boolean; bare?: boolean; filter?: string; marks?: (place: (b: Box) => React.CSSProperties) => React.ReactNode }> = ({
  src, shot, box, width, pans = [], dark = false, bare = false, filter, marks,
}) => {
  const { file } = useReel();
  const frame = useCurrentFrame();
  const s = width / box.w;
  let y = box.y;
  for (const p of pans) y += (p.y - y) * interpolate(frame, [p.at, p.at + (p.frames ?? 12)], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const place = (b: Box): React.CSSProperties => ({ position: "absolute", boxSizing: "border-box", left: (b.x - box.x) * s, top: (b.y - y) * s, width: b.w * s, height: b.h * s });
  return (
    <div style={{ ...(bare ? { position: "relative" } : screenCard), width, height: box.h * s, overflow: "hidden", background: dark ? "#1C1C1E" : "#fff", border: bare ? undefined : dark ? "1.5px solid #2C2C30" : screenCard.border }}>
      <Img src={file(src)} style={{ position: "absolute", left: -box.x * s, top: -y * s, width: shot * s, maxWidth: "none", filter }} />
      {marks?.(place)}
    </div>
  );
};

// A ring round a field or a button from frame `at`, landing from a little larger. `style` is where: place(box).
export const Ring: React.FC<{ at: number; style: React.CSSProperties; color?: string; radius?: number }> = ({ at, style, color = ORANGE, radius = 30 }) => {
  const f = useCurrentFrame() - at;
  if (f < 0) return null;
  const t = interpolate(f, [0, 6], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  return <div style={{ ...style, borderRadius: radius, border: `7px solid ${color}`, boxShadow: `0 0 0 8px ${rgba(color, 0.16)}, 0 12px 34px ${rgba(color, 0.3)}`, opacity: t, transform: `scale(${1.12 - 0.12 * t})` }} />;
};

// A finger tap in the middle of `style`'s box at frame `at`: a dot pressing in, then a ripple.
export const Tap: React.FC<{ at: number; style: React.CSSProperties }> = ({ at, style }) => {
  const f = useCurrentFrame() - at;
  if (f < 0 || f > 20) return null;
  const press = interpolate(f, [0, 4, 12, 18], [0.5, 1, 1, 0.8], clamp);
  const dot = interpolate(f, [0, 2, 12, 18], [0, 1, 1, 0], clamp);
  const ripple = interpolate(f, [4, 20], [0.6, 2.4], clamp);
  return (
    <div style={{ ...style, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", width: 100, height: 100, borderRadius: 50, border: `6px solid ${ORANGE}`, transform: `scale(${ripple})`, opacity: interpolate(f, [4, 20], [0.9, 0], clamp) }} />
      <div style={{ position: "absolute", width: 84, height: 84, borderRadius: 42, background: "rgba(255,122,0,0.45)", border: "4px solid #fff", boxShadow: "0 6px 20px rgba(0,0,0,0.25)", transform: `scale(${press})`, opacity: dot }} />
    </div>
  );
};
