# Learning: how to make a reel here

Read before every reel. § Go is the run from a raw video to a delivered reel; then the setup as built, and what
was learned the hard way, by stage. The user's decisions are in `decisions.md`, the look in `style.md`; this file is
how to build. Add to it whenever something is learned. Reels 1 to 5 below are the original setup's: their code and footage
aren't here.

## Go
The user points at a raw video (a file, a folder, or a `\\wsl.localhost\...` path) and says "go". Do all of it in
one run, without stopping to ask. Post a one-line status about every 10 minutes. Long steps run in the background
(`run_in_background`), and the edit gets written while they work. The times below are from the original machine
(`docs/this-machine.md` has this one's). On it, reel 1 took 38 min from the raw video to the
delivered reel (with pipeline fixes along the way); a round of changes took 26 min. Reel 2 (12 short 4K takes,
five screenshots, 61 s) took 36 min, including a second render to turn effects down. Reel 4
(9 short 4K takes, four screenshots to blur, 46.6 s) took ~30 min to the reel and its cover, including the blur
tool and moving `Screen` into `src/shared/ui`. Reel 5 (10 short 4K takes, 42.75 s, a new stage
layout) took ~50 min to the reel and its cover, with two renders and one restarted cut, and ~40 min more for a round
that re-matted it and rebuilt its middle. Its render ran at ~8 fps: 168 s for 1282 frames, ~25% slower than a
card-and-graphics reel, because the stage draws the cut-out full screen.

0. **One session per reel.** Start it fresh (`/clear`): the context carried into every step is what uses tokens
   (§ Tokens).
1. **Put the footage in place.** A reel is a folder in `reels/`, named by the user (`1-my-app`).
   - If the user made the folder at the project root, move it into `reels/`.
   - If they gave only a file, make a folder for it in the same style: the next number and the subject.
   - Delete the `<file>:Zone.Identifier` files that Windows copies along.
   - Raw takes go in `raw/` (the top of the folder works too). Logos, photos, screenshots and recordings go in
     `assets/`.
2. **Import** (background; 0.74× real time for a 1440p iPhone HDR take, so ~2 min for 80 s; 0.51× for 4K, so ~3 min
   for 86 s):
   `npm run ingest -- <reel> --keyterms "<app or brand names>"`.
   - Then read `work/<take>.txt`: what's said, the language, retakes, the hook, the call to action.
   - Hindi or Hinglish: captions go in English letters, so `spelling.json` is needed (§ Transcript).
   - Then ask for what only the user has, once, in one flat list, and carry on meanwhile (`CLAUDE.md` § Ask for
     material): logos, pictures of other people, app screens, proof.
   - The CTA keyword goes in that list. It's the word the user's auto-DM listens for, and the voice may only say
     "comment below". Pick the obvious word from the script, carry on, and ask.
   - Screenshots are needed only when the reel shows an app's own screens. A news explainer is drawn in code.
3. **Cut** (background; ~8 min for 77 s, nearly all of it the cut-out):
   - Write `cut.json`: the takes in order, and `drop` ranges for retakes, false starts and anything off-message.
     Fillers and long pauses go by themselves. A clean single take needs no drops (reel 1: 80 s became 77.0 s).
   - Run `npm run cut -- <reel>`.
   - Read `work/cut.txt` to check the cut reads right. Meanwhile, do steps 4 and 5.
4. **Brief and spelling.** Fill in `brief.md`: the facts that will be on screen, exactly as the speaker says them;
   nothing else goes on screen. Write `spelling.json` for Hindi words and for names Scribe spells wrong.
5. **The edit.**
   - The template `edit.tsx` that `npm run cut` creates is a stub (a LogoCard title): replace it, don't extend it.
   - Write `graphics.tsx`: one component per graphic scene, its beats on spoken words (`saidAt`). § Graphics has
     what worked.
   - Scenes switch every 2-4 s, alternating the speaker and graphics. Reel 1 had 27 scenes in 77 s:
     - face for the hook, then a full graphic on the hook word;
     - split while explaining, so the speaker stays on screen;
     - one focus for the big reveal;
     - the end card on the keyword, with `captions: "none"`.
   - Accent words: 4-6 per reel. Sound effects go in time order. Music is `{ src: "audio/music/bed.mp3" }`.
6. **Sound.**
   - Write `audio/spec.json`: one music prompt, with seconds ≈ the reel's length + 7 (84 for 77 s).
   - Run `npm run audio -- <reel>`. It makes the music and any library sound the edit names that doesn't exist yet.
7. **Look.**
   - Run `npm run typecheck`.
   - Run `npm run still -- <reel> scenes` (one frame per scene, ~16 s per eight) and read the sheets.
   - Then render chosen seconds (`npm run still -- <reel> 20.6,22.4`) at the busiest frames of anything new or
     fixed.
   - Check the text against the safe area, the head over the card, captions, and the graphics against their area.
8. **Render** (background; ~4 min for 77 s): `npm run render -- <reel>`.
   - Run nothing heavy meanwhile; stills during a render slow both.
   - Then run `npm run check -- <reel>` (7 s). The frames, the duration, -14 LUFS, a true peak at or under
     -1.5 dBTP, and the mix against the voice should look like reel 1's (§ Sound).
9. **Hand over**, in a few lines:
   - the path, and on WSL the Windows path (`wslpath -w <path>`);
   - what's in it (captions, graphics, end card, sound);
   - one line per thing decided along the way.

   Then:
   - add a dated line to the feedback log in `brief.md`;
   - put any lasting preference in `decisions.md`;
   - put anything learned here.
10. **Changes.** The user replies with changes, naming scenes by the words said. Find those words' times in `work/cut.json`, change only
    those scenes, take stills of them, re-render, re-check, and hand over the same path. Say in one line anything
    changed that they didn't ask for.

## Setup as built
`docs/setup.md` sets this up. `docs/this-machine.md` (written at setup, ignored by git) has this machine's details and
speeds.
- **Node packages:** remotion and `@remotion/*` 4.0.538 (cli, media, captions, elevenlabs, google-fonts, transitions), react
  19.2.0, animejs 4.5.0, lucide-react 0.460.0, simple-icons 13.21.0, TypeScript. The exact tree is in `package-lock.json`.
- **Remotion:**
  - `remotion.config.ts`: jpeg frames, crf 16, yuv420p, a concurrency worked out from the RAM and CPU, and the `@shared`
    alias.
  - `public/` holds symlinks to `reels/` and `library/`, for `staticFile`, which encodes spaces.
  - `src/reels.ts` finds every `reels/*/edit.tsx`. The composition id is the folder name in lower case with hyphens
    (`1-my-app`).
- **Python:**
  - `.venv` is Python 3.10 with onnxruntime and numpy 2.2.6. It has no PIL: read images through ffmpeg. Run it as
    `.venv/bin/python -I`.
  - The matting models are in `.models/rvm/` (RobustVideoMatting): `rvm_mobilenetv3_fp32.onnx`, and on a GPU
    `rvm_resnet50_fp32.onnx`, which `tools/cutout.py` prefers there.
  - `.venv-whisper`, on the free route: faster-whisper, its model in `.models/whisper`.
- **Keys:** `.env` (chmod 600) holds `ELEVENLABS_API_KEY`. The npm scripts load it. With no key, the free route runs.
  - Never print the key, read `.env` or ask for the key in chat. The user pastes it into `.env`.
  - It needs Speech to Text, Sound Effects and Music Generation (Voice Isolator for `--isolate`). A 401 that names a
    missing permission means the user has to allow it on the key.
- **Library sounds** (`library/sfx/`): the prompts in its `spec.json`, each made the first time an edit names it.
- **Where it runs:** only on this machine, through Claude Code.
  - From claude.ai/code or the Claude phone app, use Remote Control: `/remote-control` (`/rc`) in a session, or
    `claude remote-control` in the project folder. The session still runs here, so the machine stays on with that terminal
    open.
- **Not needed:** Canva, Runway, HyperFrames as an engine (its catalog is a design library: § Graphics).

## Footage and import
- iPhone footage arrives as HEVC HLG with Dolby Vision 8.4, 1440x2560, 60 fps. The import tone-maps it (zscale +
  hable) to 1080x1920, 30 fps, SDR.
- The filter order makes it 3× faster: fps=30 → scale → crop → tone-map, instead of tone-mapping 60 full-size
  frames a second. The picture is identical (43.8 dB). Decoding on the GPU (CUDA) was slower here.
- Rotation metadata is handled in the import but untested on a real rotated clip (§ Not yet tested).
- **Shooting advice** given to the user (reel 1 had a lot of ceiling, and the mic receiver showed at the
  bottom): hold the phone a little higher, and keep the receiver out of frame.
  - That take needed `faceZoom: 1.45`; at 1.3 the receiver filled the bottom of the frame.
  - 1.45 was chosen after comparing sharpness against the 1440 source.

## Transcript and Hinglish
- Scribe v2 detects Hinglish as "hin". It writes Hindi words in Devanagari and English words in Latin letters.
- Captions are wanted in English letters ("Exactly hua kya?"), so every Hindi or Hinglish reel needs
  `spelling.json`: each Devanagari word mapped to its Hinglish spelling.
  - reel 1 had 69 entries for 237 words, e.g. "उसे": "usse".
  - Names are spelled the company's way, even when Scribe hears them differently.
- `withSpelling()` applies the spelling once, when the reel loads, so anchors, captions and graphics all see the
  same words. It also turns "।" into "." and capitalises a sentence's first word when it's all lower case.
- **Anchors** are written in that spelling ("Yeh aise", "Ab bank"). A word anchor means the next time the word is
  said after the previous anchor in the same list, so a repeated word is simply listed again. Several words match
  a phrase. Scenes and sound effects are each one such list, in time order.
- `--keyterms` helps Scribe get names right.
- To find when words are said, read the kept words in `work/cut.json`. Their times are in reel seconds, but Hindi
  words are still in Devanagari there, so map them through `spelling.json`:

  ```
  node -e 'const spell = require("./reels/<reel>/spelling.json"), cut = require("./reels/<reel>/work/cut.json");
  for (const w of cut.words) console.log(w.start.toFixed(2), spell[w.text.replace(/[।.,?!]+$/u, "")] ?? w.text)'
  ```

## Cut
- Joining segments with ffmpeg's concat demuxer drifted +1 frame at some joins. `duration` lines in the concat
  list fixed it, and `onTheGrid()` checks every packet sits on the frame grid.
- In ffmpeg 4.4, `-to` after an input `-ss` acts as a duration. Cut by frame count instead: `-frames:v`.
- Segments are cached in `work/segments/`, so a re-cut redoes only the new parts.
- ffmpeg closes a killed encode as a valid, short file, which the cache then trusted: stopping a cut left a segment 3
  frames short, and the next cut failed on "cut.mp4 has 1238 frames, the cut has 1241". Segments are now written aside
  and moved into place. Stop a cut with TaskStop, not `pkill -f`, which also matches the shell running it.
- `npm run cut | tail` reports tail's exit code, so a failed cut looks finished: `set -o pipefail` first.
- **A stretch where the picture changes around the speaker** needs no jump cuts: a `keep` over the whole take
  (["img-3866", 0.46, 6.94]) holds its pauses, and the pauses are where the effects land (reel 5).
- **Look for gestures before cutting.** The transcript shows a pause; the frames show what's in it. "the background
  change" had 0.82 s of pause with a finger snap inside, which is what the user meant by "click". Find the exact frame
  in the take's `.voice.wav` (a one-frame peak) and put the effect on it. The lapel mic barely hears a snap (-41 dB), so
  the library's `snap` sits on top of it.

## Cut-out (the head over the card)
- **The model:** ResNet50 at downsample 0.5 on a GPU (2026-10-31). MobileNetV3 at 0.25, used for the first four reels, is
  fine on a card but not full screen: it dropped forearms whole, left a dark smudge by the hair and a halo round the ears.
  Measured on one take at 1080x1920 (model only): MobileNet 0.25 12 fps, 0.5 9 fps; ResNet50 0.25 14 fps, 0.5 6 fps, under
  1 GB of GPU memory. ResNet50 at 0.25 already keeps the arm; 0.5 is what makes the hair crisp. On a CPU the tool stays
  on MobileNet.
- **The edge (`firm_edge`):** a ramp on the matte takes off the faint halo: 0.2-0.93 down to the chin, so hair keeps its
  strands, and 0.55-0.96 below it, where edges are hard (clothes, arms), which also drops a patch of room RVM left by the
  shoulder. Edge colour stays RVM's foreground. Filling the edge from nearby solid pixels instead looked worse: a pull-push
  fill made visible blocks, and a normalised blur put skin colour into the hair.
- **It keeps what's on the table:** ResNet50 holds on to whatever's in front of the speaker, differently per take: a mug, a corner
  of wood, a wide patch of table, or nothing, leaving a hole under the arm. So check the bottom of the frame in every take.
  Frame full-screen shots to end above it (§ Layouts), and if a take won't crop, put it in the card, where it falls off
  the bottom.
- **VP8 with alpha, not VP9:** VP9 encoded at 7.7 fps, VP8 at 24 fps, and they looked the same (50.5 dB).
- **Pipelining:** four stages run at once (decode, model, combine, encode), so the GPU doesn't wait.
- **One model session for all segments** (`cutout.py --jobs`): starting one costs ~10 s.
- **A few frames of run-in:** RVM's memory settles over its first frames, so each segment starts a few frames
  early (`skip`).
- **A harmless warning:** onnxruntime warns about `/sys/class/drm` under WSL on import. It's harmless and
  silenced.
- **Speed:** ~5 fps overall on the original's RTX 2050 (~8 min for 77 s); its CPU, on the smaller model, did 1.8 fps
  (~20 min). Start the cut, then write the edit.
- **A person from a photo:** RVM takes a still too. Loop it for a few frames so its memory settles, then keep the last one
  (a clear photo with one person; check the edges, since it's built for video):
  ```
  ffmpeg -v error -y -loop 1 -i photo.jpg -t 1 -r 30 -vf "scale=1080:-2" -pix_fmt yuv420p work/photo.mp4
  .venv/bin/python -I tools/cutout.py work/photo.mp4 work/photo.webm
  ffmpeg -v error -y -c:v libvpx -sseof -0.04 -i work/photo.webm -frames:v 1 assets/photo-cutout.png
  ```

## Layout
- Graphic areas are not scaled. The graphic is centred in its area, and anything taller spills into the caption.
  Design each graphic for its area:
  - split and end: 1080x750 at the top (y 130-880);
  - graphic and focus: 1080x1080 (y 170-1250).

  A diagram shared between graphic and split scenes must be about 700 tall at most.
- Instagram covers the right edge and the bottom ~20%. Text that must be read stays between y≈200 and y≈1600, away
  from the right edge.
- The big caption (y≈1372) sits beside Instagram's buttons, so keep it under ~740 px wide.
- Face scenes put the top of the head at y 300 (`FACE_TOP`) and alternate a 1.07 punch-in at every jump cut.
- **A background picture in the card** (`card: { background: "assets/<file>" }`, reel 3): the card
  holds the picture, blurred 3 px like a lens's background, and the whole cut-out stands in front of it, rising
  over the top edge as usual (one cut-out layer, clipped to the card plus the strip above it). `backgroundY` picks
  the part of the picture that shows (default 38%: for a 900x1600 room, the wall with a plant and a lamp at the
  sides). Face scenes still show the take's own room. The user asked for it: "use this for my background image
  whenever you are showing my cut out".
- **A title held over the face:** a face scene's `graphic` is drawn over the whole frame and doesn't punch in. Give
  the scene `captions: "none"` and draw the words where the captions sit (`CAPTION.face`). Reel 4
  opens on the subject's name, two lines in the face accent (gold ExtraBold 92 px, each line its own gradient), held for
  the whole scene: the name whole, not paged word by word, so its audience stops scrolling.
- The reel holds its last frame for `tail` frames (default 12) after the last word.
- **A `stage` scene** (reel 5): the graphic draws the whole frame itself, speaker included, for
  what the other layouts can't do: a background changing behind the cut-out, words behind the head. `GraphicProps.from`
  gives the scene's reel frame (`trimBefore={from}` on the videos). One component across several scenes plays as one if
  it works in reel frames (`from + useCurrentFrame()`). Frame the head per take, not per scene, so it doesn't jump when
  a scene changes mid-take.
- **The cut-out full screen:** show it as it comes. A wood desk drawn across the bottom to hide a matte's flaws was "an
  awkward table", and a fade looked fake. Frame instead: zoom 1.3 with the head top at y 600 ends the frame at the wrist
  (raw y≈1700), above what the matte keeps of the table (raw y≥1735), and drops the mic to y≈1450, under the captions.
  The card layouts are fine as they are: all that falls off the bottom. One take has a patch of table higher
  up, at the bottom right, so its line went in a split.
- **`scene.card`** overrides the reel's `card` for one scene: the hook's cards keep the take's own room, so the new room
  is still news when the test changes it.
- **Pick the background against the shirt:** a cream T-shirt would vanish on a beige room; navy walls make the speaker
  stand out.

## Captions
- **Plain Poppins only,** the user's call (decisions.md).
  - Big words: Poppins ExtraBold capitals at 110 px. "RESEARCHERS" (11 letters) measured 727 px, x 178-905. A
    longer word would need a smaller size: measure it.
  - Accent words: ExtraBold, gold over the face (94 px) and orange on white (86 px).
- **A light shirt takes ink captions:** `captions: "face-ink"` is the face position and sizes in near-black, accent
  orange. White and gold were lost on a cream T-shirt. Check that the captions clear the mic: on a full-screen
  cut-out, keep the mic out of y≈1340-1445, above it or below it, at every point of the take.
- The space between words comes from the style (`gapOf`). An em would be the page's 16 px, which ran words
  together.
- Accent words stand alone on their page. Pages are 1-3 words; big pages are 1-2 words of at most 10 characters
  (spaces counted). At 12, "ANTHROPIC OR" measured 824 px and "SELECT WHICH" 789; at 10 or fewer, reel 2's widest
  was 732 ("WORKING ON"). A lone long word still stands alone ("APPLICATION", 11 letters, 720 px).
- Words longer than ~11 letters ("speech-to-text", "effectiveness") don't fit a big page: put them in a split or
  face scene (reel 2's Step2Options is a split for that reason). Some 11-letter words are too wide as well:
  "FUNDAMENTAL" measured 810 px (reel 3). Wide letters (M, W) count for more; check every 11.
- **Measuring text in a still** (no PIL): crop the band and find the inked columns.

  ```
  ffmpeg -v error -i reels/<reel>/renders/stills/still-62.9.png -vf "crop=1080:150:0:1300,format=gray" -f rawvideo - |
    .venv/bin/python -I -c 'import sys, numpy as np
  a = np.frombuffer(sys.stdin.buffer.read(), np.uint8).reshape(150, 1080).astype(int)
  c = np.flatnonzero((np.abs(a - np.median(a)) > 80).any(axis=0)); print(c.min(), c.max())'
  ```

## Graphics
These worked on reel 1, the original setup's first reel, which its user called "perfect" (its code isn't here).
A piece that a second reel needs moves to `src/shared/ui/`.
- **Draw it in code.** A news explainer needs no screenshots: brand marks come from simple-icons (Safari, Firefox,
  Chrome, Apple, Mozilla, Google) and everything else from lucide icons. Nothing imitates a real site's look.
- **Every beat lands on a spoken word.** `saidAt(words, "word", fallback)` gives frames from the scene's start;
  always pass a fallback.
- **One diagram per stretch.** A stretch that explains who sends what to whom keeps one diagram and grows it across
  its scenes. Reel 1's view of the user and their bank gained two more parties (built from a
  `View` of `Party` boxes, with `Link` lines and `Travel` tokens).
  - Its user asked for exactly this, twice.
  - Things that travel are tokens, each always drawn the same way: an "HTML" page, a certificate. One token stands
    for one thing. The response first flew as a certificate icon; once the certificate had a scene of its own,
    that showed it twice, so the response became the HTML page.
  - After a face cut, re-establish the view fast: pop the parties in at frames 0, 2 and 4, then start the action.
  - Draw lines first (under the parties) and tokens last. Check that lines clear the labels.
- **Patterns that read well:**
  - brand tiles popping in as each is named, then a ban badge or a BLOCKED `Stamp`;
  - a line dropping off a cliff, with a `Counter` (-40%);
  - a browser `Window` with the URL typed out, then the page loading;
  - a card greying out under a big red X;
  - a bar with "Weak" in red, then a progress bar filling.
- **Text inside graphics is at least ~30 px** at 1080 wide. A 25 px "HTML" label was too small.
- **The HyperFrames catalog** (HeyGen's open-source video framework, Apache-2.0) is a design library, not an
  engine. `npm run catalog` fetches its registry at a pinned commit into `catalog/hyperframes/src` (gitignored,
  ~160 MB) and writes `catalog/hyperframes/index.html`: our picks first, by the layout they'd serve, then all
  448 items. The picks and the ruled-out reasons live in `tools/catalog.mjs`.
  - Its items are HTML driven by GSAP timelines. A port is a rebuild: read the block's timeline (durations,
    stagger, eases: GSAP `power3.out` = `Easing.out(Easing.cubic)`) and redo it with `interpolate`/`spring` or
    `useAnime`, in Poppins and our colours. Credit it in the component's comment and add it to `PORTED` in
    `tools/catalog.mjs`.
  - Ported so far: `number-wheel` → `Odometer`.
  - Ruled out: handwritten (`hw-*`) and caption styles (decisions.md), WebGL/WebGPU/Three.js pieces.
  - Only ~85 of 238 components ship a preview clip. Rendering the rest with the HyperFrames CLI was refused by the
    permission classifier (installing and running its code); the user would have to allow it.
  - It lives in `catalog/`, not `library/`: `public/library` links to `library/`, and Studio would watch its
    ~9,000 files.
- **A word stamped on** (the ask: "slammed on the screen (like a stamp is hammered), with a sound effect of a
  thud"). It drops from
  2.4x over 5 frames with an ease-in (speeding up, like a hammer: an ease-out reads as floating in), unblurring,
  hits 2 frames into the word, squashes 0.92 → 1.03 → 1, settles at -4° in an orange stamp frame while a copy of the
  frame spreads and fades, and the card jolts for 8 frames. The thud (0.6) is offset +0.067 s to land on the hit.
- **What didn't (reel 4):** cartoon metaphors drawn for opinion lines. A meter for an opinion
  line, and coins flying into a piggy bank, felt like "un-necessary animation": the user wanted their talking head there. Draw what needs
  showing (proof, a mechanism, a list being named); let the speaker deliver opinions and appeals. That left 15 s of
  face before the end card (two takes), which was what they wanted.
- **A reel that shows its own edit** (reel 5): a hook, then everything stripped on "let's test it"
  (raw framing, no captions, the music stopped), then each thing added as it's named, on one stage. One small label says
  what's being added (spinner while it's named, tick when done), so silent viewers follow before captions exist. Then:
  a thin glow round the cut-out (`drop-shadow` on the video) on "cutout"; the room flipping to a checkerboard tile by
  tile, spreading from behind the speaker, in the pause before "Done"; the new room spreading in a circle from the fingers on
  the snap.
- **What didn't (the same reel, first version):** for "animations, background music, sound effects": burst shapes, a
  squiggle, words springing up letter by letter, an equaliser skyline, sound rings, WHOOSH/POP stickers, sparks, a screen
  shake and two rows of pills. It "sends out a message that claude does sloppy video editing". What replaced it: one line
  of type and one line of sound, both behind the head, and nothing else. The letters rise out of their line's own edge on
  one long ease (`Easing.bezier(0.16, 1, 0.3, 1)`, no bounce). A thin line draws out under the first word, stays flat
  until "music", then carries the music's measured level outwards from the speaker (`audio/level.json`, from `tools/level.py`) at the
  music's tempo, with a swell for each sound effect; it
  settles on "all done" and draws back on "perfect". The room's
  lights go down slowly for this stretch (brightness 0.55), so white type reads on its pale ceiling. When a stretch feels
  busy, ask what the one idea is and take away the rest.
- **A duration on a clock** (the same reel): a ring filling completely for "18 minutes" says "all of it". An hour's dial
  says how much: 60 radial marks (SVG `<line>`s, rotated), every fifth longer, labelled 60, 15, 30, 45 outside them, the
  first 18 lit in order (`interpolateColors` per mark), a pale slice behind them, and the number in the middle.
- **`Odometer`'s digits are all one width**, so at a big size a "1" stands far from its neighbour. For a close pair, use
  one `Odometer` per digit, with a negative margin between them.
- **A name card** (the same reel): a small rectangle on the clear wall beside the head of the first shot, with a fine line
  out of its bottom edge, under the text's left edge, down to a small dot on the shoulder. A `face` scene draws its
  `graphic` over the whole frame with no zoom, so place it by reading a still's pixels. Leave the card's width off (an
  absolute div shrinks to its text) and the padding stays even. Use an ink line, since white is lost on a pale wall. Card,
  then line, then dot, in 0.7 s with no sound; the scene's cut takes it away. Nothing tracks the speaker, so check the head
  and shoulder at several frames.
- **Gotchas:**
  - `Pop` sets `transform` (its scale), so a rotation on the same element cancels the pop. Rotate an inner div.
  - No HTML elements inside an `<svg>`.
  - An anchor takes the first match after the last one: "First" matched "but first" two seconds early, showing a pill
    too soon. Use a phrase ("First the"). A word said once can't be anchored twice in a list.

## Sound
- **ElevenLabs:**
  - Music: `music_v2_5` (the endpoint defaults to v1). Sound effects: `eleven_text_to_sound_v2`, 0.5-30 s.
  - Speech-to-text: `scribe_v2`, word timestamps, up to 100 keyterms.
  - It takes two jobs at a time; more are refused.
- **With no ElevenLabs key:** the transcript comes from `tools/whisper.py` (faster-whisper, on this machine), and no sounds
  can be made.
  - Measured on 10 English takes on the `small` model (`base` heard "18" as "80"): all 123 words the same as Scribe's, the
    word times within 0.02 s at the median, and a cut of 42.6 s against Scribe's 41.7 s. That's with `vad_filter`: without it,
    words stretched across the silences beside them and the cut came to 46 s. It writes out fewer fillers and false starts,
    so read the transcript against the takes before trusting a number. It's slower (about 90 s for that 45 s on 12 CPU
    threads), and less sure of Hindi and Hinglish.
  - Sound effects and music are files the user supplies, so ask for them. Effects go in `library/sfx/<name>.mp3` (an edit
    names them `sound: "<name>"`), then `npm run audio -- library --level <name>.mp3`. Music goes in
    `reels/<reel>/audio/music/`, then `npm run audio -- <reel> --level audio/music/<file>.mp3`. Without them a reel has
    just the voice, and music can be added in Instagram when posting. An edit may not name a file that doesn't exist: the
    render stops on it.
- **Levelling** happens when a sound is made. Music goes to -14 LUFS integrated (reel 1's bed came out at
  -15.0). Sound effects go to -16 LUFS at most (momentary), so a volume of 1 is as loud as the voice.
- **Volumes used** (approved):
  - whoosh 0.4, offset -0.12 s so it peaks on the cut;
  - pop 0.5; ding, glitch, sparkle, printer 0.45; error, typing 0.4;
  - hits (impact) 0.5-0.6.
- **Music ducking:** 0.3 between lines and 0.13 under speech (the Soundtrack defaults).
- **`music.levels`** multiply that from a moment on: 0 drops the music out, the next entry brings it back (the track
  keeps running underneath). Reel 5 stops it on "let's test it" and brings it back on the word
  "music", at 1.5 over half a second so it's heard under the voice, then 1 again for the close.
- **A subtle mix** (reel 5, round 2): 15 effects in 42 s instead of 33, at 0.25-0.4, and none on the
  scene cuts, with a bed asked for as "understated, warm, minimal ... no build-ups, no drops". The earlier list (whoosh
  on every cut, a hit on the hook, a record scratch, an error buzz, sparkles) read as a "high banger" edit.
- **Reading `npm run check`'s spikes:** it compares the mix with the voice in the same 100 ms, so a pause between words
  counts as a spike when the music fills it (voice -33 dBFS, mix -26). What matters is the mix against the speech around
  it: on that reel all nine flagged windows were under the speech right before them, by 1 to 15 dB. Only an effect
  that's louder than the speech around it needs turning down.
- **The approved mix** (reel 1), as `npm run check` prints it:
  - 2322 frames, 77.42 s;
  - -14.1 LUFS, true peak -2.5 dBTP;
  - the mix sits +3.0 dB over the voice while speaking, and -30.4 dBFS between lines;
  - spikes over 6 dB only on sound-effect hits;
  - nothing quiet except the last 0.1 s.

  A new reel should look like this. A spike landing on a word covers it.
- **Reel 2's mix, also approved** ("all good"): 1845 frames, 61.50 s; -14.4 LUFS, true peak -1.5 dBTP; +3.5 dB
  over the voice while speaking, -29.0 dBFS between lines; 41 spikes over 6 dB, the biggest +15 (pops on word
  starts: reel 1's peaked at +18 too). Its hook hit was 0.45 (the first word starts at 0.07 s) and its logo
  pops 0.4.
- Claude can't hear it. The user judges the sound, so ask whether the music or effects feel loud or quiet.

## Render and stills
- Render, on the original machine: ~10 fps at concurrency 2. 2322 frames took 231 s, plus ~20 s of mastering. It
  prints the LUFS and true peak.
- **Remotion's "Version mismatch" warning about zod** (`installed 4.6.7, required 4.5.4`) prints on every render and is
  expected. `package.json` overrides zod, because versions under 4.6.6 carry a high-severity advisory (GHSA-mrhx-c7xc-m3w5,
  memory use while validating oversized input). Renders and stills work with it, and Studio starts and serves. Don't install 4.5.4 as the
  warning says. Drop the override once Remotion itself requires 4.6.6 or newer.
- Mastering is a two-pass loudnorm to -14 LUFS, then a limiter for peaks under -1.5 dBTP after Instagram's AAC
  re-encode. The unmastered file is kept next to it.
- Stills: one bundle per run, ~16 s for eight. A list of eight gives `renders/stills/sheet.jpg`; `scenes` or a
  longer list gives `sheet-1.jpg`, `sheet-2.jpg`, and so on.
  - Old stills stay in the folder: delete `renders/stills/` first when that would confuse.
  - A frame caught mid-animation is fine. Look a little later before fixing anything.
- The frames and duration change only when the cut or the scene list does. If they move without either, look into
  it.
- Thumbnail (cover): `reels/<reel>/thumbnail.tsx`, a one-frame composition `<id>-thumbnail`, rendered by
  `npm run thumbnail -- <reel>` to `renders/thumbnail.jpg` (9:16) and `thumbnail-grid.jpg` (the middle 3:4, y
  240-1680, which is what the profile grid shows). Look at the grid one at ~360 px wide: that's a phone's tile.
  - The face is the cut-out at the user's chosen moment: `<OffthreadVideo src=work/cutout.webm trimBefore={frame}
    transparent>`, moved down so the hands fall off the bottom.
  - It's a 30 fps `<Composition>` of one frame, not a `<Still>`: a Still runs at 1 fps, so `trimBefore` in frames
    lands seconds too far (it showed the take's last frame).
  - The look (reel 3, after four rounds): flat paper `#F3EEE7`; a letter-spaced grey kicker; the title in
    Poppins 700 ink, 96 px, the key words in one dark accent; a thin rule; a grey 36 px subline. No blocks,
    badges, tilts, glows or drop shadows.
  - Logos work as part of a picture, not as a header row: 62 px in a row were lost at grid size, 132 px in a row
    killed the look. On the final cover they're the two ends of a thread arcing over the head (116 px).
  - Draw the cover's picture from the reel's own idea.

## Working with the user
The original user's way, which the steps above assume. Keep it until this user shows they want something else, then note
the change in `decisions.md`.
- Replies are short and plain. Give paths, not commands. Hand over finished work as finished.
- Decide the defaults and start in the same turn. Ask for material in one short, flat list.
- Post a one-line status about every 10 minutes on long jobs.
- Asked "how much more time?", answer from the speeds in `docs/this-machine.md`.
- Changes often come as numbered lists that name scenes by the words said. Say in one line anything you changed that
  wasn't asked for.

## Tokens (measured 2026-10-23)
- Editing reel 1 (77 s, setup excluded) processed ~24M tokens:
  - ~245k output, ~150k of it thinking at `/effort max`;
  - ~820k new input;
  - ~23M cache reads (~95%: the conversation re-read at every step).
- The first edit ran on 170-440k tokens of context per step, because the setup's history stayed in. A fresh
  session starts at ~58k.
- Estimate for a 70-90 s reel in its own session: ~15M processed and ~250k output (first pass plus one round of
  changes).
- Keep the context small:
  - read only the part of a big file you need (`graphics.tsx` is ~500 lines);
  - look at stills in sheets;
  - don't reread files you've just written.

## Screenshots (reel 2, reel 4)
- iPhone screenshots are 1206x2622. Whole, in a 750 px split area, their text is ~11 px. Show crops instead:
  `Screen` (`src/shared/ui`, from reel 2) shows a box of a screenshot at a given width, scrolls it (`pans`),
  and places marks in the screenshot's own pixels (`Ring` round a field, `Tap` on a button), so they stay put while
  it scrolls. `shot` is the screenshot's width in those pixels. Keep the crop ~800-960 px wide, which puts the
  app's text at 30-40 px.
- **Someone else's personal data gets blurred, baked into a copy** (names, photos,
  phone numbers, addresses, ID numbers). `redact.json` lists each screenshot and
  the boxes, in its own pixels; `npm run redact -- <reel>` writes `work/redacted/<name>.png` with each box under a
  Gaussian blur (sigma 7 px, 9 for a photo) that takes nothing from outside the box, so the originals never reach a
  render and a blur can't slip off its field mid-animation. Blur the value inside the field and keep the label and
  the field's border sharp: it reads as "this field is exposed". Digits in a known font can be guessed back from a blur, so
  phone and ID numbers get `"fill": true` on their box: a flat patch of the box's average colour. Check the copies side by side before the edit
  (`work/redacted/sheet.jpg`), gitignore the originals, and keep the person's name out of every file.
- Typing into a field: a white box over the placeholder (inside the field's border), the value a key every 4 frames
  from the spoken word, at the field's text size (52 px here), and a caret that blinks once it's done. Type an
  illustrative number, not dots: dots read as a password.
- Small desktop screenshots (~377 px wide, ~10 px text): the redact step also scales them up 3x with lanczos, and
  `Screen` keeps the original's pixels (`shot={377}`), so boxes measured on the original still work. Shown ~2.5x,
  the text is ~30 px and a little soft, which is the source.
- Find field boxes by measuring, not by eye: on a white form, a field's border rows are long runs (200 px or more)
  of grey 185-236, and its text rows are the rows with pixels under 110. List both with numpy (as in § Captions)
  and take every box from there.
- Leave out the status bar and the browser bar. Crop away anything personal: an email's crops stop above its To:
  line.
- Find a box by measuring the screenshot, not by eye: crop a row with ffmpeg and list the inked columns (as in
  § Captions); the first guess at a ring round a line of text cut into the next word.
- A logo cropped from a screenshot sits on the page's own grey (#FCFCFC on one site), which shows as a box on a
  white card: `filter: brightness(1.02)` lifts it to white.
- A white SVG logo (`openai-light.svg`) disappears on white: `filter: brightness(0)` draws it black.
- A form's steps read well as one stepper kept across the stretch (done ticked, current a dark pill with its name),
  with the step's screenshot under it and each field ringed as it's named.
- Language names in their own scripts: Poppins has Devanagari; Gujarati, Tamil and Telugu come from Hind Vadodara,
  Hind Madurai and Hind Guntur (`@remotion/google-fonts`), from the same foundry as Poppins.

## Stories
- A short video with no voice (a thank-you after a reel did well) is the reel's `story.tsx`: a default component
  plus `export const frames`. It's its own composition (`<id>-story`) on a fixed timeline, outside the cut/edit
  system. `npm run still -- <reel> 1,4.5 --story` and `npm run render -- <reel> --story` (→ `renders/story.mp4`,
  mastered the same way). Music: a second entry in the reel's `audio/spec.json`.
- People's comments, as their screenshots: `redact.json` takes paths outside `assets/` ("response/IMG_1.PNG"), so
  the commenter's photo (sigma 14) and username (sigma 10) are blurred; blur any tagged accounts too; the text stays.
  Instagram's dark comment rows: the avatar is the only thing left of x 145, the username the first run of white
  (>185) text right of it; the grey timestamp after it isn't part of the box.
- Read every comment before it goes on screen: leave out anything hateful or that could harm someone, and unproven
  accusations, and tell the user what was left out.
- A story can show the reel's cover as "the post", read from `renders/thumbnail.jpg`, so
  `npm run thumbnail` must have run first (renders/ isn't committed).
- With no voice nothing ducks the music: at 0.6 it buried the pops, so it's 0.38, with pops 0.55, whooshes and
  clicks 0.45-0.5 and a hit 0.7. ElevenLabs gave the track a near-silent 0.8 s intro despite "starts right away":
  measure the first seconds (ebur128) and skip it with `trimBefore`.
- 19 s (four beats: comments popping onto the cover, numbers rolling, the proof, thank you) rendered in ~95 s.

## Not yet tested
Treat these as first-time paths; check them closely when a reel needs them.
- A real clip with rotation metadata.
- `--isolate` (ElevenLabs voice isolator) on a real reel.
- `Shot` (a screenshot that drifts) and screen recordings from `assets/` in an edit. (Still screenshots, cropped,
  are done: § Screenshots.)
- `drop` ranges on real multi-take footage. (reel 2 was 12 single-line takes with nothing to drop: the takes in
  file order, joined, worked.)
- The face card's `card` options (scale, lift) and `hide` (words never captioned). (`card.background` is done.)
- Narration (TTS): not needed so far.
