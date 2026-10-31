# Style: the reference reel

Every reel starts from this look, measured from the original setup's reference reel (not included; an app review:
720x1280, 34.5 s, 30 fps), scaled to our 1080x1920. In code: `src/shared/theme.ts` (fonts, colours, positions),
`src/shared/components/` (layouts, captions, soundtrack), `src/shared/ui/` (pieces for the graphics).

## Script shape
Hook (what it is, why it matters) → the name and one proof number → three features → "But here's the
difference" → the two differentiators → one concrete use case → CTA: "comment <WORD> and I'll send you the repo".
121 words in 34.2 s: 3.5 words a second, no pause over 0.26 s. The speaker says every line on camera.

## Picture
The layout changes every 1-2 s, mostly on hard cuts. Graphics come in with a quick fade, rise and un-blur
(`Appear`). Nothing drifts much.
- **face**: the speaker full screen. White Poppins Bold captions at about 72% height (y≈1395), 1-3 words a page.
  Accent words are in gold italic serif ("BUT HERE'S / the difference"). Each jump cut alternates a 1.07 punch-in.
- **split**: white page with the app's UI on top (y 130-880). A black Poppins caption sits between (y≈948). The
  speaker is in a rounded card at the bottom (x 50-1030, top 1238, radius 64), with the head rising out over the
  card's top edge by about 180 px.
- **graphic**: a full-screen white UI animation, with one big black italic serif word in caps under it (y≈1372).
  The key word is orange.
- **focus**: the graphic in front of a dark, blurred, enlarged copy of itself, with a vignette and a white serif
  word.
- **end**: cream page, a white logo card, and "COMMENT “WORD”" in the big serif with the keyword orange (`Cta`).
  The speaker card is at the bottom.

Fonts: Poppins (captions, UI) and Playfair Display Black Italic (the big serif word). **Our reels use Poppins
only**: the original user found the serif "shabby cursive".

## Sound
- A continuous music bed, low, ducking under speech (music is levelled to -14 LUFS when made; then 0.3 between
  lines and 0.13 under speech).
- A bass hit on the hook, whooshes on layout changes, pops and clicks on UI, a sparkle on a reveal.
- Master: -14 LUFS integrated, true peak ≤ -1.5 dBTP (the reference: -14.2 LUFS, LRA 1.9).

## Footage that fits
- Vertical, phone at eye level, framed head and shoulders with some room above the head. The card shows the whole
  frame, so a tight face shot makes the card all face.
- The reference's card shows a wider shot than its full-screen face parts: wide footage plus `faceZoom` ≈ 1.3
  gives that.
