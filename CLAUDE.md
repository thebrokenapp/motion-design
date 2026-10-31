# motion-design: Instagram Reels from raw footage

## Getting started
When someone says "set it up", or asks how to set it up, how to use it, or what it needs, this comes first.

- **"Set it up"** (or "install it"): follow `docs/setup.md` now.
- **A question** ("how do I set this up?", "how do I use it?", "what do I need?", "what is this?"): reply with the text
  under "The short answer" and stop. Run nothing. If `docs/this-machine.md` exists, setup is done, so give only the first
  line of the short answer and "Make a reel".
- **"Go", or asking to make a reel, before setup** (no `docs/this-machine.md`): say setup comes first, then do `docs/setup.md`.
- **"Go" with no footage named and none in `reels/`:** give "Make a reel" and stop.

### The short answer
This turns raw talking-head footage into a finished Instagram Reel: cut, captions, graphics, sound, mastered.

**What you need**
- **Claude Code** (paid): a Claude plan or API account. One reel is a heavy session.
- **ffmpeg, Node.js 22, Python with uv** (free): I install them.
- **Remotion** (free for individuals, non-profits and companies of up to 3 employees; bigger companies need its licence): draws the video. I install it.
- **Cut-out model, RobustVideoMatting** (free): I download it. An NVIDIA GPU makes it faster; no GPU works too.
- **ElevenLabs** (paid): transcript, sound effects, music. **Free alternative:** Whisper on your machine for the transcript, and your own sound and music files, or none.

**Set up**
1. Say "set it up". I check your machine, install what's missing and run a test: about 20 minutes.
2. Approve the installs as they come up.
3. Have an ElevenLabs key? Paste it into `.env` yourself, never here. No key? Nothing to do: I use the free route.

**Make a reel**
1. Make a folder inside `reels/`, named for the video: `reels/<video-name>/`.
2. Put your raw footage in `reels/<video-name>/raw/`.
3. Put any logos, screenshots or photos in `reels/<video-name>/assets/`.
4. Say "go". I'll ask for anything else the video needs, like a company's logo or a photo of someone you mention.

You get the finished video in `reels/<video-name>/renders/`.

## What this is
Reels for the user's Instagram, spoken to camera. Claude edits them in code from the user's raw footage:
- **Remotion**: React video, one composition per reel.
- **Anime.js**: animated graphics, through `src/shared/lib/useAnime.ts`.
- **ElevenLabs** (or the free route): transcription, sound effects, music.

The user drops raw video in a folder and gets back a finished MP4, mastered for Instagram.

**When the user points at a raw video and says go:** run `docs/learning.md` § Go from start to finish. Don't
ask anything that has a default. Material only the user has has no default: § Ask for material.

Read first:
- `docs/learning.md`: how to make a reel here step by step (§ Go), the setup as built, and what was learned the
  hard way. Add to it whenever something new is learned.
- `docs/decisions.md`: the user's lasting preferences, newest first. Add to it whenever they decide something.
- `docs/style.md`: the look, measured from a reference reel (not included).

## A reel
A reel is a folder `reels/<name>/`, for example `reels/1-my-app/`. The user puts in:
- `raw/`: the raw takes, as video files (the top level of the folder works too);
- `assets/`: logos, photos, screenshots, screen recordings, a background picture.

Then, in order:
1. **Import:** `npm run ingest -- <reel> --keyterms "AppName"`.
   - Writes `work/<take>.mp4`: 1080x1920, 30 fps, SDR (iPhone HDR tone-mapped).
   - Writes the voice and a word-timed transcript (Scribe v2; with no ElevenLabs key, `tools/whisper.py` on this machine).
   - Read `work/<take>.txt`.
2. **Choose the cut:** write `cut.json` (format at the top of `tools/lib/cut.mjs`).
   - List the takes in order, and drop retakes, false starts and anything off-message.
   - Fillers go automatically.
   - Pauses are cut down to the reference's pace (3.5 words a second, no pause over 0.26 s).
3. **Build the cut:** `npm run cut -- <reel>`.
   - Writes `work/cut.mp4`, `voice.wav`, `cutout.webm` (the speaker cut out, for the head over the card),
     `person.json` and `cut.json`, all frame-exact.
   - Read `work/cut.txt` to check the cut reads right.
   - It's slow only for the cut-out, so start it and write the edit meanwhile. `--no-cutout` skips it.
4. **Write the edit** in `edit.tsx`.
   - Scenes: a layout from a spoken word, every 2-4 s, alternating the speaker and graphics.
   - Graphics: in the reel's `graphics.tsx`, timed to words with `saidAt`. Shared pieces are in
     `src/shared/ui/`: `Appear`, `Pop`, `Stamp`, `Window`, `Counter`, `Odometer`, `Cta`, `BrandLogo`, and for
     screenshots `Screen` (a crop), `Ring` and `Tap`.
     More designs to port: the HyperFrames catalog (`npm run catalog`, learning.md § Graphics). Icons come from
     `lucide-react` and brand marks from `simple-icons`.
   - Also accent words, SFX and music.
   - Types and options are in `src/shared/types.ts`.
   - Put the facts shown on screen in `brief.md`; nothing goes on screen that isn't there or confirmed.
   - Screenshots with someone's personal data (names, numbers, photos, IDs): list the boxes to blur in
     `redact.json`, run `npm run redact -- <reel>`, and show only the blurred copies in `work/redacted/`
     (learning.md § Screenshots). Gitignore the originals.
   - Hindi or Hinglish takes: write `spelling.json` (each Devanagari word in Hinglish spelling, plus any name
     Scribe spells wrong) and pass it as `spell`. Anchors are then written in the same spelling.
5. **Make the sound:** `npm run audio -- <reel>`.
   - Makes the reel's `audio/spec.json` music (levelled to -14 LUFS).
   - Makes any library sound the edit names (`library/sfx/spec.json`, made once and reused by every reel).
   - With no ElevenLabs key nothing can be made, so an edit may only name sound files that exist (learning.md § Sound).
   - Every sound effect is levelled to the voice's loudness, so a volume of 1 is as loud as the voice. Set 0.4
     for whooshes, 0.5 for pops and UI, and 0.5-0.6 for hits.
   - Check the mix after rendering. No sound effect should be more than ~3 dB over the speech around it, or
     it covers the word it lands on.
6. **Look:** `npm run still -- <reel> scenes` renders one frame from every scene, in `renders/stills/sheet-1.jpg`,
   `sheet-2.jpg`, etc.
   - `npm run still -- <reel> 1,4.5,9` renders chosen seconds.
   - Check text placement, the head over the card, captions, and graphics at their busiest frame.
   - A frame caught mid-animation is fine; look again a little later before "fixing" it.
7. **Render:** `npm run render -- <reel>` gives `renders/<id>.mp4`, mastered (-14 LUFS, true peak ≤ -1.5 dBTP).
   - Check the LUFS/peak line it prints.
   - Then `npm run check -- <reel>`: frames, duration, loudness, and the mix against the voice (sound-effect
     spikes, gaps). Claude can't hear the result.
8. **Cover:** `thumbnail.tsx` (the user's face at a moment they pick, plus the hook as a title), then
   `npm run thumbnail -- <reel>` gives `renders/thumbnail.jpg` and `thumbnail-grid.jpg` (learning.md § Render).

Preview with scrubbing: `npm run dev` (it prints the address, http://localhost:3000 unless that's taken; from Windows too). `npm run typecheck` before
rendering.

## Ask for material
Claude makes everything except what only the user has. After reading the transcript, work out what this reel shows
that only they can give. Ask once, in one short flat list that says what each thing is for and where it goes, and start
the rest meanwhile. Put each file in `reels/<reel>/assets/` as it comes.
- **Logos** of each company or app named on screen (SVG, or PNG with a transparent background). Don't draw one from memory.
  Don't ask for one that's in `simple-icons`.
- **Pictures of people** other than the speaker: a cut-out (PNG with a transparent background), or a clear photo, which
  Claude cuts out (learning.md § Cut-out). The speaker's own cut-out comes from the footage.
- **App or site screens** the reel walks through: screenshots or screen recordings.
- **Proof the script leans on:** the headline, email, document or number, as a screenshot.
- **The CTA keyword**, when the script doesn't name it.
- **A background picture** for the speaker's cut-out, if they want one. Without one, the footage's own room stays.
- **Sound effects and music,** only with no ElevenLabs key: their own files, or none (learning.md § Sound).

If they don't have something, go on without it: the name in plain type instead of a logo, the speaker instead of a photo.
Never generate or fake a real logo, a real person's picture or proof.

## How it fits together
- **Composition:** `src/Root.tsx` finds every `reels/*/edit.tsx` (`src/reels.ts`).
- **`src/shared/Reel.tsx`** draws the scenes in their layouts (`components/Layouts.tsx`, `FaceCard.tsx`), then the
  captions (`Captions.tsx`) and the soundtrack (`Soundtrack.tsx`).
- **Times:** everything is timed from spoken words in `work/cut.json` (`timeline.ts`), so a new cut re-times the
  edit by itself.
- **Files:** `public/` links to `reels/` and `library/`; files are read with `staticFile`.
- **Tools:**
  - `tools/*.mjs` are the npm scripts; `tools/audiocheck.py` is `npm run check`; `tools/redact.mjs` blurs
    screenshots; `tools/level.py` measures a track's level per frame, for graphics that follow the music.
  - `tools/cutout.py` is the matting (RobustVideoMatting ONNX, `.models/rvm/`, `.venv` with onnxruntime: on an
    NVIDIA GPU when there is one, else the CPU).
  - `tools/whisper.py` is the free transcript, for when there's no ElevenLabs key (`.venv-whisper`).
  - Run Python as `.venv/bin/python -I`.
- **Folders:** everything in `reels/` stays on this machine (gitignored). `work/` and `renders/` are generated; `cut.json`,
  `edit.tsx`, `brief.md` and `audio/spec.json` are the reel's source.

## Rules
- **Keys:**
  - The key is in `.env` (`ELEVENLABS_API_KEY`); the user puts it there. With no key, the free route runs.
  - Never print it, read `.env` or ask for it in chat.
  - It needs Speech to Text, Sound Effects and Music Generation (Voice Isolator for `--isolate`). A 401 that
    names a missing permission means the user has to allow it on the key.
- **Safe area:** text that must be read stays between y≈200 and y≈1600, away from the right edge.
- **Accents:** accent words are a few per reel (the hook word, the turn, the CTA keyword).
- **Facts:** app names, numbers and claims on screen come from the brief or the user, never guessed.
- **Delivery:** hand over the finished render's path (on WSL also the Windows path, from
  `wslpath -w`), and one line on anything decided along the way.

## Speeds
This machine's are in `docs/this-machine.md`, from the setup's test. The original machine, for scale (WSL2, 12 cores,
7.6 GB RAM, RTX 2050): ingest 0.74x real time for a 60 fps 1440x2560 iPhone HDR take, 0.51x for 4K; cut-out ~5 fps; stills
~16 s for eight; render ~10 fps at concurrency 2, plus ~20 s mastering. So a 75 s reel takes about 40 minutes.
