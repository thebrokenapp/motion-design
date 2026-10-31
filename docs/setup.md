# Setup, for Claude

The person said "set it up". Do all of this, in order, in one run. It takes about 20 minutes. It was built and tested on
WSL2 Ubuntu 22.04; the macOS and other Linux lines follow those tools' docs and haven't been run end to end.

Rules for the whole setup:
- Work in this folder. Outside it, only install system tools.
- **Never ask for a key in chat, print it, or show `.env`.** The person pastes it into `.env`.
- You can't type a `sudo` password. Give the person the line to run themselves, as `! sudo ...` in the prompt.
- Run long steps in the background: `npm ci`, the Python packages and the test. Post a one-line status about every 5
  minutes.
- If a step fails, fix the cause and go on. Change no tracked file for this machine: `docs/this-machine.md` is for that.

Start by telling the person, in these words, without waiting for a reply:

> Setting up now. I'll install what's missing (ffmpeg, Node.js, Python tools, the cut-out model) and run a test. Approve
> the installs as they come up.
>
> Have an ElevenLabs key? I'll make a `.env` file in a moment: paste the key after `ELEVENLABS_API_KEY=` and save. Never
> paste it here. No key? Nothing to do: I'll use the free route, and you can add a key later.

## 1. Check the machine
- `uname -s` must print `Linux` or `Darwin`. Anything else (MINGW, MSYS, CYGWIN, PowerShell) is native Windows, where the
  tools can't run. Stop and tell the person:
  1. In PowerShell as administrator, run `wsl --install -d Ubuntu`, then restart the PC.
  2. Open Ubuntu and install Claude Code there: `curl -fsSL https://claude.ai/install.sh | bash`.
  3. Clone the repo inside Linux, for example in `~`. Avoid `/mnt/c/...`: it's slow.
  4. Run `claude` in that folder and say "set it up" again.
- Note for step 7: the OS and its version, CPU cores, RAM in GB, and the GPU
  (`nvidia-smi --query-gpu=name,memory.total --format=csv,noheader`, or "none"). Disk: 5 GB free, or 9 GB with an NVIDIA GPU.

## 2. System tools
Check each one and install what's missing.
- **Node.js 22.9 or newer** (`node -v`); tested on 22.13.
  - macOS: `brew install node@22`, then follow brew's PATH note.
  - Linux and WSL, without sudo: `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash`, then
    `. ~/.nvm/nvm.sh && nvm install 22`. In this session, start each command with `. ~/.nvm/nvm.sh &&`.
- **ffmpeg and ffprobe with zscale**, which converts iPhone HDR to SDR. These two lines print nothing when all is there:
  ```sh
  for f in zscale tonemap loudnorm alimiter ebur128; do ffmpeg -hide_banner -filters | grep -qE "^ [A-Z.]{3} $f " || echo "missing filter: $f"; done
  for e in libx264 libvpx aac flac libmp3lame; do ffmpeg -hide_banner -encoders | grep -qE "^ [A-Z.]{6} $e " || echo "missing encoder: $e"; done
  ```
  - Ubuntu, Debian and WSL: `! sudo apt-get update && sudo apt-get install -y ffmpeg`. Their ffmpeg has zscale.
  - macOS: Homebrew's plain `ffmpeg` has **no zscale**, so `brew install ffmpeg-full`. It's keg-only: add
    `export PATH="$(brew --prefix ffmpeg-full)/bin:$PATH"` to `~/.zshrc`, and until Claude Code restarts, put the same
    export in front of every command here.
  - Other Linux: the distribution's ffmpeg if it has zscale, or a static build from johnvansickle.com/ffmpeg.
- **uv** (`uv --version`), which also installs Python 3.10.
  - macOS: `brew install uv`.
  - Linux: `curl -LsSf https://astral.sh/uv/install.sh | sh`, then use `~/.local/bin/uv` until the shell restarts.
- **Linux and WSL only, the libraries for Remotion's headless Chrome:**
  `! sudo apt-get install -y libnss3 libdbus-1-3 libatk1.0-0 libasound2t64 libxrandr2 libxkbcommon-dev libxfixes3 libxcomposite1 libxdamage1 libgbm-dev libcups2 libcairo2 libpango-1.0-0 libatk-bridge2.0-0`
  - That list is for Ubuntu 24.04 and newer. On Ubuntu 22.04 and Debian, use `libasound2` instead of `libasound2t64`.

## 3. The key file and the project
```sh
[ -e .env ] || cp .env.example .env
chmod 600 .env
npm ci
npx remotion browser ensure
npm run typecheck
```
`npm ci` installs the exact tested versions. `npx remotion browser ensure` downloads the headless Chrome that renders. The
type check must report no errors. On WSL, give the person the Windows path to `.env` (`wslpath -w .env`), so they can open
it in an editor.

## 4. Python for the cut-out
With an NVIDIA GPU (`nvidia-smi` works), the GPU package and the bigger model, which is far better on hair and arms:
```sh
uv venv .venv --python 3.10
uv pip install --python .venv/bin/python "onnxruntime-gpu[cuda,cudnn]==1.23.2" numpy==2.2.6
mkdir -p .models/rvm
curl -fSL -o .models/rvm/rvm_resnet50_fp32.onnx https://github.com/PeterL1n/RobustVideoMatting/releases/download/v1.0.0/rvm_resnet50_fp32.onnx
curl -fSL -o .models/rvm/rvm_mobilenetv3_fp32.onnx https://github.com/PeterL1n/RobustVideoMatting/releases/download/v1.0.0/rvm_mobilenetv3_fp32.onnx
```
Without one (macOS, AMD, no GPU), `onnxruntime` and the smaller model only:
```sh
uv venv .venv --python 3.10
uv pip install --python .venv/bin/python onnxruntime==1.23.2 numpy==2.2.6
mkdir -p .models/rvm
curl -fSL -o .models/rvm/rvm_mobilenetv3_fp32.onnx https://github.com/PeterL1n/RobustVideoMatting/releases/download/v1.0.0/rvm_mobilenetv3_fp32.onnx
```
Check each download (`sha256sum`; `shasum -a 256` on macOS), and stop if one differs:
- `rvm_mobilenetv3_fp32.onnx`: 14975696 bytes, SHA-256 `88d4531297118f595bf2fd60f6f566aec2e559393802d1f436c380f0cbbd2828`.
- `rvm_resnet50_fp32.onnx`: 107479165 bytes, SHA-256 `25db300fcb6ee27f941a1b52c97856e8d1f13c7f35817f81a612f89af0e8a85c`.

Then check the runtime. With the GPU package, it must list `CUDAExecutionProvider`:
```sh
.venv/bin/python -I -c "import onnxruntime as o; getattr(o, 'preload_dlls', lambda: None)(); print(o.__version__, o.get_available_providers())"
```
- If a pinned version has no build for this machine, drop the pin. onnxruntime 1.23.2 has builds for Linux with glibc 2.27
  or newer (x86_64 and arm64) and macOS 13 or newer; the GPU build is Linux x86_64 only.
- With the CPU build, `cutout.py` warns that onnxruntime "is not built with CUDA 12.x support". That's harmless.

## 5. ElevenLabs, or the free route
Check for a key, without printing it: `grep -cE '^ELEVENLABS_API_KEY=.+' .env` prints 1 if there is one.

**With a key,** test it:
```sh
ffmpeg -v error -y -f lavfi -i sine=f=300:d=2 -ac 1 -c:a flac keytest.flac
node --env-file=.env --input-type=module -e 'import { transcribe } from "./tools/lib/eleven.mjs"; await transcribe("keytest.flac"); console.log("speech-to-text: ok")'
rm -f keytest.flac
```
An HTTP 401 that names a missing permission means the person has to allow it on the key: **Speech to Text**, **Sound
Effects**, **Music Generation**, and **Voice Isolator** for `--isolate` (elevenlabs.io → Developers → API Keys).

**With no key,** install the free route. It has its own environment, because it pulls in a package that would replace the
GPU one in `.venv`. Then a test transcribes silence, which downloads the model (about 480 MB) to `.models/whisper`:
```sh
uv venv .venv-whisper --python 3.10
uv pip install --python .venv-whisper/bin/python faster-whisper==1.2.1
ffmpeg -v error -y -f lavfi -i anullsrc=r=48000:cl=mono -t 2 -c:a pcm_s16le whispertest.wav
.venv-whisper/bin/python -I tools/whisper.py whispertest.wav whispertest.json && rm -f whispertest.wav whispertest.json
```
If they add a key later, the tools use it by themselves.

## 6. Test everything (no key needed, no credits)
This runs a 6 s test clip, tagged as HDR like an iPhone's and with a made-up transcript, through every tool. Time each step.
```sh
mkdir -p reels/0-setup-test/work
ffmpeg -v error -y -f lavfi -i testsrc2=s=1080x1920:r=30:d=6 -f lavfi -i sine=f=220:d=6 -shortest -c:v libx264 -pix_fmt yuv420p -color_primaries bt2020 -color_trc arib-std-b67 -colorspace bt2020nc -c:a aac reels/0-setup-test/take.mp4
node -e 'const say="This is a quick test of the whole pipeline before the first real reel".split(" "),words=[];say.forEach((text,i)=>{const s=0.4+i*0.38;words.push({text,start:+s.toFixed(2),end:+(s+0.3).toFixed(2),type:"word",logprob:0});if(i<say.length-1)words.push({text:" ",start:+(s+0.3).toFixed(2),end:+(s+0.38).toFixed(2),type:"spacing"})});require("fs").writeFileSync("reels/0-setup-test/work/take.words.json",JSON.stringify({language_code:"en",text:say.join(" "),words}))'
npm run ingest -- 0-setup-test
npm run cut -- 0-setup-test
npm run still -- 0-setup-test 1,4
npm run render -- 0-setup-test
npm run check -- 0-setup-test
```
Then check:
- **ingest** prints `HDR -> SDR`. It reuses the made-up transcript, so it transcribes nothing.
- **cut** prints `cutout: ... frames on CUDA` (or `on CPU`) and `Cut ready`.
- **still** writes `reels/0-setup-test/renders/stills/sheet.jpg`. Look at it. You should see a white title card, a black
  caption with the test words, and a rounded card at the bottom showing the colour test pattern. A few coloured streaks
  above the card are expected: the cut-out takes the pattern's moving lines for a person.
- **render** prints a loudness near -14 LUFS and a true peak at or under -1.5 dBTP. It also warns "Version mismatch" about
  zod. That's expected (`docs/learning.md` § Render and stills): leave it.
- **check** prints the frames, the duration and the mix without an error. The test has no music, so the level between
  lines reads very low and the end reads as quiet. That's expected.

Then delete `reels/0-setup-test`.

## 7. Write the setup down
Write `docs/this-machine.md` (git ignores it; its being there means setup is done):
- the OS, CPU cores, RAM and GPU;
- node, ffmpeg and onnxruntime versions;
- ElevenLabs key or free route;
- each step's time from the test, as this machine's speeds;
- anything that differed from these steps.

## 8. Hand over
Tell the person, in these words, with anything that isn't done added on top. Fill in the Windows path on WSL
(`wslpath -w reels`), and leave that line out elsewhere.

> Set up. I'm using {ElevenLabs | the free route: transcripts on this machine, and your own sound files}.
>
> To make a reel:
> 1. Make a folder inside `reels/`, named for the video: `reels/<video-name>/`.
>    (From Windows, that's `{windows path}`.)
> 2. Put your raw footage in `reels/<video-name>/raw/`.
> 3. Put any logos, screenshots or photos in `reels/<video-name>/assets/`.
> 4. Start a new Claude Code session in this folder and say "go".
>
> I'll ask for anything else the video needs, like a company's logo or a photo of someone you mention.
