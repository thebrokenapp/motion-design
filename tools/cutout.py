"""Cut the speaker out of a talking-head clip, for the head that pops out over the top of a face card.

    .venv/bin/python -I tools/cutout.py <in.mp4> <out.webm> [--ratio 0.5]
    .venv/bin/python -I tools/cutout.py --jobs jobs.json          (what `npm run cut` uses)

jobs.json is a list of {"src", "out", "from" (seconds), "frames", "skip"}: each job mattes `skip` + `frames`
frames of src starting at `from`, and writes the last `frames` of them. RVM settles over its first few frames,
so starting a few frames early gives every segment a settled matte from its first frame. One run does all jobs,
so the GPU starts once.

Each output is a transparent WebM (VP8 + alpha), the clip's size and frame rate, for Remotion's
<OffthreadVideo transparent>. Next to it, <out>.person.json: for each written frame, where the speaker is,
[top of the head, left, right, head centre x] in pixels (or null), so layouts can frame the face.

The matte comes from RobustVideoMatting (ONNX), which carries state from frame to frame so hair edges don't
flicker. On a GPU it's the ResNet50 model at downsample 0.5 (RTX 2050: ~6 fps at 1080x1920, 2026-10-31). MobileNetV3,
which was ~2x faster at 0.25, lost forearms and left a smudge by the hair. On a CPU it's MobileNetV3 at 0.25 (~8 fps).
Colour: inside the person (alpha ~1) the pixels are the input's own, so the cut-out lines up with the card's
video without a seam; on the soft edges RVM's foreground colour is used, so the room doesn't fringe the hair.
Edge: see firm_edge.
"""
import json
import os
import queue
import subprocess
import sys
import threading
import time
from pathlib import Path

import numpy as np

# onnxruntime warns on import that it can't read /sys/class/drm under WSL (harmless: CUDA works), so it's
# imported with stderr briefly pointed at /dev/null.
_stderr = os.dup(2)
os.dup2(os.open(os.devnull, os.O_WRONLY), 2)
try:
    import onnxruntime as ort
finally:
    os.dup2(_stderr, 2)
ort.set_default_logger_severity(3)
MODELS = Path(__file__).resolve().parent.parent / ".models" / "rvm"


def arg(name, default=None):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default


def probe(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate",
         "-of", "json", path], capture_output=True, text=True, check=True).stdout
    s = json.loads(out)["streams"][0]
    return s["width"], s["height"], s["r_frame_rate"]


def session():
    """The matting model and its downsample ratio: the big model if there's a GPU to run it, else the small one."""
    opts = ort.SessionOptions()
    opts.intra_op_num_threads = os.cpu_count() or 4
    opts.log_severity_level = 3
    try:
        ort.preload_dlls()  # the CUDA and cuDNN libraries that came with onnxruntime-gpu[cuda,cudnn]
    except Exception:
        pass
    providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
    big = MODELS / "rvm_resnet50_fp32.onnx"
    if big.exists():
        sess = ort.InferenceSession(str(big), opts, providers=providers)
        if sess.get_providers()[0] != "CPUExecutionProvider":
            return sess, 0.5
    return ort.InferenceSession(str(MODELS / "rvm_mobilenetv3_fp32.onnx"), opts, providers=providers), 0.25


def firm_edge(pha):
    """The matte (0-1) with its faint halo taken off. Hair keeps a gentle ramp, so its strands survive. From the chin down
    the edges are hard things (clothes, arms), so a firmer ramp also drops the patches of room RVM leaves by the shoulders."""
    hair = np.clip((pha - 0.2) / 0.73, 0, 1)
    rows = np.flatnonzero((pha[::4, ::4] > 0.5).any(axis=1))
    if rows.size == 0:
        return hair
    top = rows[0] * 4
    forehead = np.flatnonzero(pha[min(top + 150, pha.shape[0] - 1)] > 0.5)
    chin = top + 1.3 * (forehead[-1] - forehead[0]) if forehead.size else pha.shape[0]
    body = np.clip((pha - 0.55) / 0.41, 0, 1)
    mix = np.clip((np.arange(pha.shape[0], dtype=np.float32) - chin) / 40, 0, 1)[:, None]
    return hair * (1 - mix) + body * mix


def where_is(alpha):
    """[top of the head, left, right, head centre x] of the speaker in this frame, in pixels; None if no one."""
    small = alpha[::4, ::4] > 128  # a quarter of the size each way is plenty for framing
    rows = np.flatnonzero(small.any(axis=1))
    if rows.size == 0:
        return None
    cols = np.flatnonzero(small.any(axis=0))
    top = rows[0]
    head = small[top:top + 30]  # the top ~120 px of the person: the crown of the head
    xs = np.flatnonzero(head.any(axis=0))
    return [int(top * 4), int(cols[0] * 4), int(cols[-1] * 4), int(xs.mean() * 4) if xs.size else int(cols.mean() * 4)]


def matte(sess, src, dst, start=0.0, frames=None, skip=0, ratio=0.5):
    w, h, rate = probe(src)
    take = ["-frames:v", str(frames + skip)] if frames is not None else []
    dec = subprocess.Popen(["ffmpeg", "-v", "error", "-ss", f"{max(0.0, start):.6f}", "-i", src, *take, "-f", "rawvideo",
                            "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE, bufsize=w * h * 3 * 2)
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{w}x{h}",
                            "-r", rate, "-i", "-", "-c:v", "libvpx", "-pix_fmt", "yuva420p", "-b:v", "16M", "-crf", "4",
                            "-deadline", "good", "-cpu-used", "4", "-threads", "8", "-auto-alt-ref", "0", dst],
                           stdin=subprocess.PIPE)
    # VP8, not VP9: VP9 with alpha encoded at 7.7 fps here, VP8 at 24 fps, and the visible pixels came out as
    # close (50.5 dB against the VP9 file, alpha 58 dB; 2026-10-23). The encoder has time to spare now that the model
    # runs at ~6 fps, so it's on good rather than realtime.
    # Four stages at once, so the GPU doesn't wait: decode and convert (a thread), the model (here), combine (a
    # thread), encode (a thread). numpy lets go of the GIL for the big array work, so the threads really overlap.
    to_model, to_combine, to_encoder = queue.Queue(6), queue.Queue(6), queue.Queue(6)
    person = []

    def read():
        size = w * h * 3
        while len(buf := dec.stdout.read(size)) == size:
            rgb = np.frombuffer(buf, np.uint8).reshape(h, w, 3)
            to_model.put((rgb, rgb.transpose(2, 0, 1)[None].astype(np.float32) * (1 / 255)))
        to_model.put(None)

    def combine():
        while (got := to_combine.get()) is not None:
            rgb, fgr, pha = got
            alpha = (firm_edge(pha[0, 0]) * 255 + 0.5).astype(np.uint8)
            rgba = np.empty((h, w, 4), np.uint8)
            rgba[..., :3] = rgb
            rgba[..., 3] = alpha
            ys, xs = np.nonzero((alpha > 0) & (alpha <= 250))  # the soft edge: a few % of the frame
            rgba[ys, xs, :3] = (fgr[0][:, ys, xs].T * 255 + 0.5).astype(np.uint8)
            to_encoder.put(rgba)
            person.append(where_is(alpha))
        to_encoder.put(None)

    def write():
        while (rgba := to_encoder.get()) is not None:
            enc.stdin.write(rgba.data)
        enc.stdin.close()

    threads = [threading.Thread(target=f, daemon=True) for f in (read, combine, write)]
    for t in threads:
        t.start()
    rec = [np.zeros((1, 1, 1, 1), np.float32)] * 4  # RVM's memory, fresh for every clip
    ds = np.array([ratio], np.float32)
    n = 0
    while (got := to_model.get()) is not None:
        rgb, x = got
        fgr, pha, *rec = sess.run(None, {"src": x, "r1i": rec[0], "r2i": rec[1], "r3i": rec[2], "r4i": rec[3],
                                         "downsample_ratio": ds})
        n += 1
        if n > skip:
            to_combine.put((rgb, fgr, pha))
    to_combine.put(None)
    threads[2].join()
    if enc.wait() != 0 or dec.wait() != 0:
        sys.exit(f"cutout: ffmpeg failed on {src}")
    if frames is not None and len(person) != frames:
        sys.exit(f"cutout: {dst} got {len(person)} frames, wanted {frames}")
    Path(dst + ".person.json").write_text(json.dumps({"width": w, "height": h, "frames": person}) + "\n")
    return len(person)


def main():
    sess, ratio = session()
    device = sess.get_providers()[0].replace("ExecutionProvider", "")
    t0 = time.time()
    if "--jobs" in sys.argv:
        jobs = json.loads(Path(arg("--jobs")).read_text())
    else:
        jobs = [{"src": sys.argv[1], "out": sys.argv[2]}]
    total = 0
    for job in jobs:
        total += matte(sess, job["src"], job["out"], job.get("from", 0.0), job.get("frames"), job.get("skip", 0),
                       float(arg("--ratio", ratio)))
    secs = time.time() - t0
    print(f"cutout: {total} frames on {device} in {secs:.0f} s ({total / max(secs, 1e-6):.1f} fps)")


if __name__ == "__main__":
    main()
