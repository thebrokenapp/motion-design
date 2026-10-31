# Decisions

Things already decided, newest first. Claude adds a line whenever the user decides something or states a lasting
preference, so it never has to be asked again. If a decision changes, strike it through and add the new one.

## Defaults this setup came with
Decided while this pipeline was built and used on real reels. The code follows them. They hold until this user decides
otherwise; this user's decisions go above this section and win.
- **Claude edits everything itself:** cut, captions, graphics, sound effects and music. The user brings the raw video, what
  only they have (`CLAUDE.md` § Ask for material) and the CTA keyword.
- **Raw video goes in `reels/<name>/raw/`.**
- **Subtle, high-quality editing, not a high-energy one:** one idea per stretch, long soft eases with no bounce, no shakes,
  no stickers. A sound marks something that happens: no whoosh on every cut.
- **Covers and graphics are made in code**, not in Canva or Runway.
- **Captions are plain Poppins everywhere**: accent words, the big words under a graphic, and the end card's COMMENT
  “WORD”. No serif, no italic. Big words are Poppins ExtraBold capitals; accent words are gold over the face and orange on
  white.
- **A stretch that explains who sends what to whom keeps one diagram** across its scenes, and grows it instead of drawing a
  new picture.
- **No drawn metaphors for the speaker's opinion lines:** the talking head carries them. Graphics show something: proof, a
  mechanism, a list being named.
- **The CTA keyword is the word the user's auto-DM listens for.** The voice may only say "comment below"; the end card still
  shows COMMENT “<WORD>”. Ask for the word whenever the script doesn't name one.
- **Hinglish reels get captions in English letters** ("Exactly hua kya?"). Scribe writes Hindi in Devanagari, so each reel
  has a `spelling.json` (Devanagari word → Hinglish spelling) that the edit passes as `spell`.
- **Names are spelled the way the company spells them**, even when the folder name or the transcript differs.
- **Screenshots with someone's personal data are shown blurred,** baked into copies (`npm run redact`).
- **Music:** baked in, ducked under speech, a little low. No dead air.
- **Master:** -14 LUFS, peaks ≤ -1.5 dBTP.
- **Layout:** 1080x1920. Text that must be read stays between y≈200 and y≈1600, away from the right edge, where Instagram's
  buttons sit.
- **Pictures of people stay still** once on screen: no bobbing or swaying.
- **Narration**, only if a reel needs a voice the user didn't record: ElevenLabs, a natural voice with real intonation, no
  pause longer than a sentence break.
- **Replies:** short and plain. Decide the defaults and start in the same turn. Give file paths, not commands. Hand over
  finished work as finished. Ask for material in a short, flat list.
- **Claude can't hear:** check audio with ffmpeg (levels, timing, gaps); the user judges how it sounds.
