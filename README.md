# motion-design

Raw talking-head footage in, finished Instagram Reel out: cut, captions, animated graphics, sound effects and music,
1080x1920 and mastered for Instagram. [Claude Code](https://claude.com/claude-code) does the editing, in code.

Made by [The Broken App](https://www.instagram.com/thebrokenapp).

## Start
1. [Install Claude Code](https://code.claude.com/docs/en/setup) and log in.
2. Get the repo and open it. On Windows, do this inside WSL2.
   ```sh
   git clone https://github.com/thebrokenapp/motion-design.git
   cd motion-design
   claude
   ```
3. Say **"set it up"**. Claude checks your machine, installs what's missing and runs a test. It takes about 20 minutes.
4. Make a reel:
   1. Make a folder inside `reels/`, named for the video: `reels/<video-name>/`.
   2. Put your raw footage in `reels/<video-name>/raw/`.
   3. Put any logos, screenshots or photos in `reels/<video-name>/assets/`.
   4. Say **"go"**. Claude asks for anything else the video needs, like a company's logo or a photo of someone you mention.

The finished video lands in `reels/<video-name>/renders/`. Ask Claude for changes in plain words, naming the moment by
what's said.

## What it uses
| Component | What it does | Cost | Alternative |
| --- | --- | --- | --- |
| [Claude Code](https://code.claude.com/docs/en/setup) | The editing | Paid: Pro or higher, or an API account. One reel is a heavy session (about 15M tokens, mostly cached). | None |
| [ffmpeg](https://ffmpeg.org) | Import, cutting, mastering | Free | None |
| [Node.js](https://nodejs.org) 22 | Runs the tools | Free | None |
| [Python](https://www.python.org) with [uv](https://docs.astral.sh/uv/) | Runs the cut-out and the checks | Free | None |
| [Remotion](https://www.remotion.dev) | Draws the video | [Free](https://www.remotion.dev/docs/license) for individuals, non-profits and companies of up to 3 employees. Bigger companies need its paid licence. | None |
| [RobustVideoMatting](https://github.com/PeterL1n/RobustVideoMatting) | Cuts the speaker out of the background | Free. Downloaded at setup. An NVIDIA GPU makes it several times faster; no GPU works too. | Skip the head-over-graphics look |
| [ElevenLabs](https://elevenlabs.io/pricing) | Transcript, sound effects, music | Paid. Its free plan has no commercial licence. | **Free route**, below |

### The free route
With no ElevenLabs key, setup installs [faster-whisper](https://github.com/SYSTRAN/faster-whisper) and the transcript is
made on your machine. It's slower and less sure of Hindi and Hinglish; in English it matched ElevenLabs on all 123
words of our one test.

Nothing can generate sounds on this route, so sound effects and music are your own files. Claude asks for them and says
where they go. [Pixabay](https://pixabay.com/sound-effects/) and [Mixkit](https://mixkit.co/free-sound-effects/) have free
ones; check the licence on each file. You can also post without them and add music in Instagram.

Add a key to `.env` at any time and the tools switch to ElevenLabs by themselves.

## Your files stay yours
- `reels/` and `.env` are ignored by git, so your footage and keys don't get committed.
- Paste keys into `.env` yourself, never into a chat.
- Claude Code sends what Claude reads to Anthropic: transcripts, frames and screenshots. With ElevenLabs, your voice goes to
  it too. On the free route the transcript is made on your machine and ElevenLabs sees nothing.
- Claude adds your preferences to `docs/decisions.md` and lessons to `docs/learning.md`, which git tracks. Read them before
  you push a fork.
- Preview (`npm run dev`) only answers on your own machine.

## How it works
`CLAUDE.md` is the map: the steps from raw video to render, and what to ask you for. `docs/learning.md` is the
step-by-step and everything learned making real reels, `docs/style.md` is the look, and `docs/decisions.md` holds the
defaults, with your own choices added above them as you make them.

- `reels/`: one folder per video (`reels/README.md`).
- `src/shared/`: the layouts, captions, soundtrack and graphics pieces.
- `tools/`: the npm scripts.
- `library/sfx/spec.json`: prompts for the shared sound effects, made with your key the first time a reel names one.

Built and tested on WSL2 Ubuntu 22.04, with an NVIDIA GPU and on the CPU. The macOS and other Linux steps follow those
tools' own docs and haven't been run end to end.

## License
The code is [MIT](LICENSE). What it uses has its own terms:
- [Remotion's licence](https://www.remotion.dev/docs/license), above.
- RobustVideoMatting's code is GPL-3.0. Its models are downloaded at setup and aren't part of this repo.
- `Odometer` in `src/shared/ui` is rebuilt from [HyperFrames](https://github.com/heygen-com/hyperframes) (Apache-2.0): see
  [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
- Sounds you make with ElevenLabs are under [its terms](https://elevenlabs.io/sound-effects-terms). They don't allow
  publishing them as separate files, which is why this repo holds the prompts and not the sounds.
- Logos and brand names belong to their owners.
