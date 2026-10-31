// Turns a reel's edit into frames: where each scene starts and ends, the caption pages, when someone is
// speaking (for the music to dip), and where the speaker's head is (for framing).
import type { Anchor, CaptionStyle, CutWord, Layout, PersonData, ReelEdit, Scene } from "./types";

export const FPS = 30;
export const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}]/gu, "");

// Anchors in one list are found in order: a word is the next time it's said after the previous anchor.
export function resolveAnchors(anchors: Anchor[], words: CutWord[], what: string): number[] {
  let cursor = 0; // seconds
  return anchors.map((a) => {
    if (typeof a === "number") {
      cursor = a;
      return Math.round(a * FPS);
    }
    const want = a.split(/\s+/).map(norm).filter(Boolean);
    const i = words.findIndex((w, k) => w.start >= cursor - 1e-3 && want.every((x, j) => words[k + j] && norm(words[k + j].text) === x));
    if (i < 0) throw new Error(`${what}: no "${a}" said after ${cursor.toFixed(2)} s. Words: ${words.map((w) => w.text).join(" ")}`);
    cursor = words[i].start + 1e-3;
    return Math.round(words[i].start * FPS);
  });
}

// The edit with its words as the captions write them: `spell` applied, the Devanagari full stop (।) as a full
// stop, and a spelled word that starts a sentence capitalised (unless it has capitals of its own: iPhone). Applied once, when the reel is loaded (reels.ts),
// so anchors, captions and graphics all see the same words.
export function withSpelling(edit: ReelEdit): ReelEdit {
  const spell = edit.spell ?? {};
  let sentenceStart = true;
  const words = edit.cut.words.map((w) => {
    const [, bare, punct] = /^(.*?)([।.,;:?!]*)$/u.exec(w.text)!;
    let text = spell[bare] ?? bare;
    if (sentenceStart && bare in spell && text === text.toLowerCase()) text = text.charAt(0).toUpperCase() + text.slice(1);
    const p = punct.replace(/।/g, ".");
    sentenceStart = /[.?!]/.test(p);
    return { ...w, text: text + p };
  });
  return { ...edit, cut: { ...edit.cut, words } };
}

export type Span = { scene: Scene; from: number; to: number };

export function reelFrames(edit: ReelEdit) {
  return Math.max(1, edit.cut.frames + (edit.tail ?? 12));
}

export function sceneSpans(edit: ReelEdit): Span[] {
  const starts = resolveAnchors(edit.scenes.map((s) => s.at), edit.cut.words, "scenes");
  starts[0] = 0; // the first scene always starts the reel
  const end = reelFrames(edit);
  return edit.scenes.map((scene, i) => ({ scene, from: starts[i], to: i + 1 < starts.length ? starts[i + 1] : end })).filter((s) => s.to > s.from);
}

const DEFAULT_CAPTIONS: Record<Layout, CaptionStyle> = { face: "face", split: "dark", graphic: "big", focus: "big-light", end: "dark", stage: "face" };
export const captionStyleOf = (scene: Scene): CaptionStyle | "none" => scene.captions ?? DEFAULT_CAPTIONS[scene.layout];

export type Page = { from: number; to: number; words: { text: string; accent: boolean }[]; style: CaptionStyle };

// Caption pages: a word or a few short ones at a time, as in the reference (1-3 words, never across a sentence
// end, a pause or a scene change). Accent words stand alone. Big styles take fewer letters per page.
export function captionPages(edit: ReelEdit, spans: Span[]): Page[] {
  const accent = new Set((edit.emphasis ?? []).map(norm));
  const hidden = new Set((edit.hide ?? []).map(norm));
  const words = edit.cut.words.filter((w) => !hidden.has(norm(w.text)));
  const spanAt = (f: number) => spans.find((s) => f >= s.from && f < s.to) ?? spans[spans.length - 1];
  const pages: (Page & { last: CutWord })[] = [];
  for (const w of words) {
    const f = Math.round(w.start * FPS);
    const span = spanAt(f);
    const style = captionStyleOf(span.scene);
    if (style === "none") continue;
    const big = style === "big" || style === "big-light";
    const isAccent = accent.has(norm(w.text));
    const text = w.text.replace(/[.,;:]+$/g, "").replace(/^["'“]|["'”]$/g, (q) => (big ? q : ""));
    const cur = pages[pages.length - 1];
    const chars = cur ? cur.words.reduce((n, x) => n + x.text.length + 1, 0) + text.length : 0;
    const startNew =
      !cur ||
      cur.style !== style ||
      spanAt(cur.from) !== span ||
      cur.words.length >= (big ? 2 : 3) ||
      // big: two words of 12 characters measured 757-824 px, over the ~740 beside Instagram's buttons; 10 measured
      // 541-732 px (reel 2, 2026-10-25)
      chars > (big ? 10 : 14) ||
      /[.?!]["']?$/.test(cur.last.text) ||
      w.start - cur.last.end > 0.3 ||
      isAccent ||
      cur.words.some((x) => x.accent);
    if (startNew) pages.push({ from: f, to: f, words: [{ text, accent: isAccent }], style, last: w });
    else {
      cur.words.push({ text, accent: isAccent });
      cur.last = w;
    }
  }
  // A page stays 8 frames past its last word, or runs on to the next page when that comes soon after (no flicker
  // of empty screen between words), never past the next page or its scene.
  return pages.map((p, i) => {
    const next = pages[i + 1];
    let to = Math.round(p.last.end * FPS) + 8;
    if (next && next.from - to < 6) to = next.from;
    if (next) to = Math.min(to, next.from);
    to = Math.min(to, spanAt(p.from).to);
    return { from: p.from, to: Math.max(to, p.from + 4), words: p.words, style: p.style };
  });
}

// When the speaker is talking, as [start, end] seconds, with short gaps joined (for the music to dip under).
export function speechRanges(words: CutWord[]): [number, number][] {
  const out: [number, number][] = [];
  for (const w of words) {
    const last = out[out.length - 1];
    if (last && w.start - last[1] < 0.5) last[1] = Math.max(last[1], w.end);
    else out.push([w.start, w.end]);
  }
  return out;
}

// Where the head is during a span: medians, so one odd frame doesn't move the framing. Falls back to a guess
// for a take framed like the reference (head top ~15% down, centred).
export function headDuring(person: PersonData | undefined, from: number, to: number) {
  const frames = (person?.frames ?? []).slice(from, to).filter((f): f is number[] => !!f);
  if (!frames.length) return { top: 290, cx: 540, found: false };
  const med = (xs: number[]) => xs.sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  return { top: med(frames.map((f) => f[0])), cx: med(frames.map((f) => f[3])), found: true };
}

// The segment (index) a reel frame falls in, for alternating punch-ins on every jump cut.
export function segmentAt(edit: ReelEdit, frame: number) {
  const segs = edit.cut.segments;
  let i = 0;
  while (i + 1 < segs.length && segs[i + 1].startF <= frame) i++;
  return i;
}
