// The cut: which parts of the raw takes stay, worked out from the words Scribe heard.
//
// The rules come from the reference reel (docs/style.md: 3.5 words a second, no pause over 0.26 s):
// - every word stays unless it's a filler ("um", "uh"...) or inside a `drop` range (a retake, a mistake);
// - a pause shorter than `joinGap` stays as it is; a longer one is cut down to padAfter + padBefore;
// - cut points land on whole frames, so the picture and the sound are cut at the same frame.
//
// reels/<folder>/cut.json, written by Claude after reading the transcript (work/<clip>.txt):
// {
//   "clips": ["take1"],                // raw takes in the order they play (work/<clip>.mp4); default: all, by name
//   "drop": [["take1", 12.3, 15.8]],   // source seconds to remove: retakes, false starts, anything unwanted
//   "keep": [["take1", 40.0, 41.2]],   // source seconds to keep even without words (a reaction, a gesture)
//   "fillers": true,                   // remove um / uh / erm (default true)
//   "padBefore": 0.06, "padAfter": 0.08, "joinGap": 0.15
// }
export const FPS = 30;
export const DEFAULTS = { padBefore: 0.06, padAfter: 0.08, joinGap: 0.15, fillers: true };
const FILLERS = new Set(["um", "umm", "uh", "uhh", "uhm", "erm", "er", "ah", "hmm", "hm", "mm", "mhm"]);

export const norm = (s) => s.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}]/gu, "");
const round = (n) => Math.round(n * 1000) / 1000;

// clips: { [name]: { words: Scribe words [{ text, start, end, type }], duration: seconds } }
// Returns the kept segments (source frames, and where each lands in the reel) and the kept words in reel time.
export function computeCut(clips, cut = {}) {
  const o = { ...DEFAULTS, ...cut };
  const order = cut.clips?.length ? cut.clips : Object.keys(clips).sort();
  const pieces = [];
  const removedWords = [];

  for (const name of order) {
    const clip = clips[name];
    if (!clip) throw new Error(`cut.json plays clip "${name}", but there is no work/${name}.words.json (run ingest)`);
    const drops = (cut.drop ?? []).filter((d) => d[0] === name).map(([, a, b]) => [a, b]);
    const words = clip.words.filter((w) => w.type === "word");
    const isFiller = (w) => o.fillers && FILLERS.has(norm(w.text));
    const isDropped = (w) => drops.some(([a, b]) => (w.start + w.end) / 2 >= a && (w.start + w.end) / 2 <= b);
    const kept = words.filter((w) => !isFiller(w) && !isDropped(w));
    for (const w of words) if (!kept.includes(w)) removedWords.push({ clip: name, text: w.text, start: w.start, why: isFiller(w) ? "filler" : "drop" });

    // Everything removed is a wall the padding around kept words may not cross.
    const walls = [...drops, ...words.filter((w) => !kept.includes(w)).map((w) => [w.start, w.end])].sort((a, b) => a[0] - b[0]);
    const wallBetween = (a, b) => walls.some(([s, e]) => e > a && s < b);

    let run = null;
    const runs = [];
    for (const w of kept) {
      if (run && (w.start - run.end > o.joinGap || wallBetween(run.end, w.start))) {
        runs.push(run);
        run = null;
      }
      if (!run) run = { start: w.start, end: w.end };
      else run.end = Math.max(run.end, w.end);
    }
    if (run) runs.push(run);

    for (const r of runs) {
      const lo = Math.max(0, ...walls.filter(([, e]) => e <= r.start + 1e-6).map(([, e]) => e));
      const hi = Math.min(clip.duration, ...walls.filter(([s]) => s >= r.end - 1e-6).map(([s]) => s));
      pieces.push({ clip: name, from: Math.max(lo, r.start - o.padBefore), to: Math.min(hi, r.end + o.padAfter) });
    }
    for (const [c, a, b] of cut.keep ?? []) if (c === name) pieces.push({ clip: name, from: Math.max(0, a), to: Math.min(clip.duration, b) });
  }

  // Whole frames; pieces of one clip that touch or overlap become one segment (in play order per clip).
  const segments = [];
  for (const name of order) {
    const mine = pieces
      .filter((p) => p.clip === name)
      .map((p) => ({ clip: name, fromF: Math.round(p.from * FPS), toF: Math.round(p.to * FPS) }))
      .filter((p) => p.toF > p.fromF)
      .sort((a, b) => a.fromF - b.fromF);
    for (const p of mine) {
      const last = segments.at(-1);
      if (last && last.clip === name && p.fromF <= last.toF) last.toF = Math.max(last.toF, p.toF);
      else segments.push({ ...p });
    }
  }
  let at = 0;
  for (const s of segments) {
    s.frames = s.toF - s.fromF;
    s.startF = at;
    s.from = round(s.fromF / FPS);
    s.to = round(s.toF / FPS);
    at += s.frames;
  }

  // Kept words in reel time (seconds), clipped to their segment.
  const words = [];
  for (const name of order) {
    for (const w of clips[name].words.filter((x) => x.type === "word")) {
      const s = segments.find((g) => g.clip === name && w.start * FPS >= g.fromF - 0.5 && w.start * FPS < g.toF);
      if (!s || removedWords.some((r) => r.clip === name && r.start === w.start)) continue;
      const toReel = (t) => (s.startF + Math.min(Math.max(t * FPS, s.fromF), s.toF) - s.fromF) / FPS;
      words.push({ text: w.text, start: round(toReel(w.start)), end: round(toReel(w.end)), clip: name, src: w.start });
    }
  }
  return { fps: FPS, frames: at, segments, words, removed: removedWords };
}

// The cut as text, for reading the edit back: one line per segment, reel time on the left.
export function describeCut(result) {
  const lines = [];
  for (const s of result.segments) {
    const ws = result.words.filter((w) => w.start * FPS >= s.startF - 0.5 && w.start * FPS < s.startF + s.frames);
    lines.push(`${(s.startF / FPS).toFixed(2).padStart(7)}  ${ws.map((w) => w.text).join(" ")}    [${s.clip} ${s.from}-${s.to}]`);
  }
  const removed = result.removed.map((r) => `${r.text} (${r.clip} ${r.start}, ${r.why})`);
  return `${lines.join("\n")}\n\nLength: ${(result.frames / FPS).toFixed(2)} s, ${result.segments.length} segments, ${result.words.length} words\nRemoved: ${removed.join(", ") || "nothing"}\n`;
}
