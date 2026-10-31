"""A track's level per video frame, for a graphic that moves with the music.

    .venv/bin/python -I tools/level.py <reels/x/audio/music/song.mp3> <reels/x/audio/level.json>

Writes a JSON list, one number per frame at 30 fps, from the track's start: RMS read through ffmpeg, scaled so the 98th
percentile is 1. Run it again when the track changes.
"""
import json
import subprocess
import sys

import numpy as np

RATE = 6000
FPS = 30

src, out = sys.argv[1], sys.argv[2]
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-ac", "1", "-ar", str(RATE), "-f", "f32le", "-"],
                     capture_output=True, check=True).stdout
samples = np.frombuffer(raw, np.float32)
per_frame = RATE // FPS
frames = len(samples) // per_frame
rms = np.sqrt(np.mean(samples[:frames * per_frame].reshape(frames, -1) ** 2, axis=1))
level = np.clip(rms / np.percentile(rms, 98), 0, 1)
with open(out, "w") as f:
    json.dump([round(float(v), 3) for v in level], f)
print(f"{out}: {frames} frames")
