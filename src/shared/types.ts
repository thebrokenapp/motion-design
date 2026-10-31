import type React from "react";

// work/cut.json, written by `npm run cut`: the kept segments and every kept word, in reel time (seconds).
export type CutWord = { text: string; start: number; end: number; clip: string; src: number };
export type Segment = { clip: string; fromF: number; toF: number; frames: number; startF: number; from: number; to: number };
export type CutData = { fps: number; frames: number; cutout: boolean; segments: Segment[]; words: CutWord[] };
// work/person.json: per reel frame, [top of the head, left, right, head centre x] in pixels, or null.
// (Typed loosely, as a JSON import of the file comes out.)
export type PersonData = { fps: number; frames: (number[] | null)[] };

// The looks, all from the reference reel (docs/style.md):
// face    the speaker full screen, white captions over the chest
// split   a graphic on white on top, a dark caption, the speaker in a card at the bottom with the head popping out
// graphic a graphic full screen on white, one or two big words in capitals under it
// focus   a graphic in a card over a dark blurred copy of itself, white big words (for a "look at this" moment)
// end     the call to action: cream background, a card on top, the speaker's card at the bottom
// stage   nothing but the graphic, which draws the whole frame itself, speaker included (reel 5)
export type Layout = "face" | "split" | "graphic" | "focus" | "end" | "stage";

// When something happens: seconds into the reel, or a spoken word. A word means the next time it is said after
// the previous anchor in the same list (so a repeated word is just listed again); several words ("here's the")
// match a phrase. Matching ignores case and punctuation.
export type Anchor = number | string;

export type GraphicProps = {
  /** the reel frame this scene starts on (for a graphic that draws the speaker: the videos are in reel time) */
  from: number;
  /** frames this scene lasts */
  duration: number;
  /** the words said during this scene, times in frames from the scene's start */
  words: { text: string; start: number; end: number }[];
};

export type CaptionStyle = "face" | "face-ink" | "dark" | "big" | "big-light";

export type Scene = {
  at: Anchor;
  layout: Layout;
  /** what fills the top (split, end) or the screen (graphic, focus); over a face, it's drawn on the whole frame
   *  (a title held over the speaker; usually with captions: "none") */
  graphic?: React.FC<GraphicProps>;
  /** face: zoom on the face for this scene (overrides the reel's faceZoom) */
  zoom?: number;
  /** captions for this scene: another style, or none */
  captions?: CaptionStyle | "none";
  /** split, end: this scene's face card, in place of the reel's `card` */
  card?: ReelEdit["card"];
};

export type Sfx = {
  at: Anchor;
  /** a library sound (library/sfx/<name>.mp3) or a path in the reel folder ("audio/sfx/x.mp3") */
  sound: string;
  volume?: number;
  /** seconds to shift it by (negative = earlier, e.g. a whoosh that should peak on the word) */
  offset?: number;
};

export type ReelEdit = {
  cut: CutData;
  person?: PersonData;
  scenes: Scene[];
  /** words shown in the accent colour: gold over the face, orange on light backgrounds */
  emphasis?: string[];
  /** words never captioned */
  hide?: string[];
  /** how words are written, in the captions and for anchors: Hindi in English letters ({ "हुआ": "hua" }), or a
   *  name Scribe spells its own way ({ "Pen Pot": "Penpot" }). Keys are words as Scribe wrote them, without
   *  punctuation. Usually the reel's spelling.json. */
  spell?: Record<string, string>;
  sfx?: Sfx[];
  /** src is in the reel folder. volume is the level between lines, under the level under speech. `levels` multiply
   *  both from a moment on, reached over `frames` (default 3): 0 drops the music out, the next entry brings it back. */
  music?: { src: string; volume?: number; under?: number; skip?: number; levels?: { at: Anchor; level: number; frames?: number }[] };
  /** face scenes zoom on the face this much (1 = the take's framing) */
  faceZoom?: number;
  /** the face card: scale of the take inside it, and how far the head rises above its top edge (px).
   *  `background`: a picture in the reel folder ("assets/room.jpeg") put behind the cut-out inside the card, in
   *  place of the take's own room; `backgroundY` is which part of it shows (0 top, 100 bottom; default 38). */
  card?: { scale?: number; lift?: number; background?: string; backgroundY?: number };
  /** frames held after the last word, default 12 */
  tail?: number;
};
