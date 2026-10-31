"""Checks a rendered reel, since Claude can't watch or hear it: the file, its loudness, and the mix against the voice.

    npm run check -- <reel>                       reels/<reel>/renders/<id>.mp4 against work/voice.wav
    .venv/bin/python -I tools/audiocheck.py <final.mp4> <voice.wav>

Prints:
- frames, duration and size of the picture (they change only when the cut or the scenes' length does);
- integrated loudness and true peak (the master: -14 LUFS, true peak at most -1.5 dBTP);
- per 100 ms, the final mix against the voice alone: how far the mix sits over the voice while speaking (music
  plus effects; reel 1, approved: +3.0 dB), the level between lines (the music bed; reel 1: -30.4 dBFS),
  spikes where the mix is more than 6 dB over the voice (sound-effect hits; one on a word covers it), and quiet
  gaps under -40 dBFS (dead air).
"""
import json
import re
import subprocess
import sys
from pathlib import Path

import numpy as np

REELS = Path(__file__).resolve().parent.parent / "reels"


def find(reel):
    """The final render and the voice of a reel named like the other tools do ("1-my-app", or its start, "1")."""
    folder = REELS / reel
    if not folder.is_dir():
        found = sorted(p for p in REELS.iterdir() if p.is_dir() and p.name.lower().startswith(reel.lower()))
        if len(found) != 1:
            sys.exit(f"check: no single reel folder matches {reel!r} in {REELS}")
        folder = found[0]
    renders = sorted((p for p in (folder / "renders").glob("*.mp4") if not p.name.endswith(".unmastered.mp4")),
                     key=lambda p: p.stat().st_mtime)
    if not renders:
        sys.exit(f"check: nothing rendered in {folder / 'renders'} (npm run render -- {folder.name})")
    return renders[-1], folder / "work" / "voice.wav"


def picture(final):
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_packets", "-show_entries",
                          "stream=width,height,nb_read_packets:format=duration", "-of", "json", final],
                         capture_output=True, text=True, check=True).stdout
    d = json.loads(out)
    s = d["streams"][0]
    print(f"{final}: {s['nb_read_packets']} frames, {float(d['format']['duration']):.2f} s, {s['width']}x{s['height']}")


def loudness(final):
    err = subprocess.run(["ffmpeg", "-nostats", "-i", final, "-af", "ebur128=peak=true", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    summary = err[err.rfind("Summary:"):]
    i = re.search(r"I:\s+(-?[\d.]+) LUFS", summary)
    tp = re.search(r"True peak:\s+Peak:\s+(-?[\d.]+) dBFS", summary)
    print(f"loudness: {i.group(1) if i else '?'} LUFS integrated, true peak {tp.group(1) if tp else '?'} dBTP")


def pcm(f):
    out = subprocess.run(["ffmpeg", "-v", "error", "-i", f, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True).stdout
    return np.frombuffer(out, np.float32)


def mix(final, voice):
    m, v = pcm(final), pcm(voice)
    n = 1600  # 100 ms
    db = lambda x: 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
    rows = np.array([(i / 16000, db(m[i:i + n]), db(v[i:i + n]) if i + n <= len(v) else -120) for i in range(0, len(m) - n, n)])
    speaking = rows[:, 2] > -35
    print(f"mix: {len(m)/16000:.2f} s; voice: {len(v)/16000:.2f} s")
    print(f"while speaking: mix minus voice median {np.median(rows[speaking,1] - rows[speaking,2]):+.1f} dB")
    gaps = rows[~speaking]
    print(f"between lines ({len(gaps)} x 100 ms): mix median {np.median(gaps[:,1]):.1f} dBFS (music bed + sfx)")
    loud = rows[speaking & (rows[:, 1] - rows[:, 2] > 6)]
    print("spikes over the voice (> 6 dB):", ", ".join(f"{t:.1f}s {d:+.0f}" for t, d in zip(loud[:, 0], loud[:, 1] - loud[:, 2])) or "none")
    quiet = rows[rows[:, 1] < -40]
    print("quiet (< -40 dBFS):", ", ".join(f"{t:.1f}s" for t in quiet[:, 0]) or "none")


if __name__ == "__main__":
    if len(sys.argv) == 3:
        final, voice = Path(sys.argv[1]), Path(sys.argv[2])
    elif len(sys.argv) == 2:
        final, voice = find(sys.argv[1])
    else:
        sys.exit(__doc__)
    picture(final)
    loudness(final)
    mix(final, voice)
