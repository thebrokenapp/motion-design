/*
 * useAnime: the bridge between Anime.js and Remotion.
 *
 * The problem: Anime.js normally plays on its own clock, like a live web page.
 * Remotion does not play anything. It asks for one exact frame at a time
 * ("draw frame 147"), often out of order and in several browser tabs at once.
 * A free-running animation would land at random times and the video would jitter.
 *
 * The fix: build the Anime.js timeline with autoplay OFF, then on every frame
 * jump it to the exact moment that frame represents (frame / fps seconds).
 * Same frame in, same picture out, every time.
 *
 * Usage inside a scene:
 *
 *   const ref = useAnime((tl, $) => {
 *     tl.add($(".title"), { opacity: [0, 1], translateY: [40, 0], duration: 600 }, 0);
 *   });
 *   return <AbsoluteFill ref={ref}>...</AbsoluteFill>;
 *
 * Times inside the timeline are in milliseconds from the start of the scene.
 *
 * One rule to remember: a tween only takes control of an element once its
 * start time is reached. Before that, the element looks the way your JSX/CSS
 * draws it. So anything that should be hidden until later starts hidden in
 * the JSX (style={{ opacity: 0 }}). Draw a scene's starting state in the JSX
 * too, or hold it with a first keyframe: a `tl.set(..., 0)` was seen to miss
 * frames in a parallel render.
 * `$` finds elements inside this scene only, so class names never clash
 * with other scenes.
 */
import { useLayoutEffect, useRef } from "react";
import { createTimeline, type Timeline } from "animejs";
import { useCurrentFrame, useVideoConfig } from "remotion";

type Query = (selector: string) => HTMLElement[];
type Build = (tl: Timeline, $: Query, root: HTMLDivElement) => void;

// `offsetFrames`: this scene's first frame, counted in the timeline's own time. A long timeline can then be split
// across several Studio scenes (each one mounting the same component with its own offset) and still play as one.
export function useAnime(build: Build, offsetFrames = 0) {
  const rootRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<Timeline | null>(null);
  const frame = useCurrentFrame(); // frame number relative to this scene
  const { fps } = useVideoConfig();

  // 1. Build the timeline once, after the scene's HTML exists.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const $: Query = (selector) =>
      Array.from(root.querySelectorAll<HTMLElement>(selector));

    const tl = createTimeline({
      autoplay: false,
      // composition "none": when two tweens touch the same property (e.g. bars grow in,
      // then bounce), neither cancels the other. Without this, jumping straight to a
      // late frame can give a different picture than playing up to it.
      defaults: { ease: "outQuad", composition: "none" },
    });
    build(tl, $, root);
    timelineRef.current = tl;

    return () => {
      tl.revert(); // put every inline style back, so hot-reload starts clean
      timelineRef.current = null;
    };
    // Built once per mount on purpose: the timeline must not change mid-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. On every frame, jump the timeline to that exact moment.
  useLayoutEffect(() => {
    timelineRef.current?.seek(((frame + offsetFrames) / fps) * 1000);
  }, [frame, fps, offsetFrames]);

  return rootRef;
}
