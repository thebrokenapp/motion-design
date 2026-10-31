import { loadFont as loadPoppins } from "@remotion/google-fonts/Poppins";

// The look of a reference reel (docs/style.md, measured at 720x1280 and scaled to 1080x1920).
// Every word on screen is Poppins (it also has Devanagari). The reference's big italic serif is dropped.
export const fonts = {
  sans: loadPoppins("normal", { weights: ["500", "600", "700", "800", "900"], subsets: ["latin", "devanagari"] }).fontFamily,
};

export const colors = {
  ink: "#0D0D0D",
  paper: "#FFFFFF",
  cream: "#F8EEE5",
  line: "#E7E7EA",
  muted: "#8A8A93",
  // accent words: gold over the face, orange on white/cream
  gold: "linear-gradient(180deg, #FFE98A 0%, #F6C63C 55%, #E9A912 100%)",
  orange: "linear-gradient(180deg, #FF9A1F 0%, #FF7A00 60%, #F25F00 100%)",
};

export const W = 1080;
export const H = 1920;

// Where things sit (px). Reels UI covers the bottom ~20% and the right edge, so nothing that must be read
// goes below CAPTION.face or near the right edge.
export const CARD = { left: 50, top: 1238, width: 980, radius: 64 }; // the face card (split, end)
export const TOP = { top: 130, bottom: 880 }; // the graphic area above a face card
export const FULL = { top: 170, bottom: 1250 }; // the graphic area on a full-screen graphic
export const CAPTION = { face: 1395, dark: 948, big: 1372 }; // caption centre lines
