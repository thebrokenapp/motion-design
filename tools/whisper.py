"""A word-timed transcript made on this machine with faster-whisper: the free alternative to ElevenLabs Scribe.

    .venv-whisper/bin/python -I tools/whisper.py <voice.wav> <out.words.json> [--language en] [--keyterms "A,B"] [--model small]

`npm run ingest` runs it when .env has no ELEVENLABS_API_KEY, or with --whisper. It writes the shape Scribe answers in,
so the rest of the pipeline can't tell them apart:
{ language_code, text, words: [{ text, start, end, type: "word", logprob }, { text: " ", start, end, type: "spacing" }] }

It has its own environment, .venv-whisper, because faster-whisper pulls in the CPU onnxruntime, which would replace the
GPU one the cut-out uses in .venv. The model downloads to .models/whisper the first time (small: about 480 MB).
"""
import argparse
import json
import math
import os

from faster_whisper import WhisperModel

parser = argparse.ArgumentParser()
parser.add_argument("src")
parser.add_argument("out")
parser.add_argument("--language")
parser.add_argument("--keyterms", default="")
parser.add_argument("--model", default="small")
args = parser.parse_args()

# Whisper's word times run early: against Scribe on one reel's 10 takes, starts by 0.12 s and ends by 0.06 s (median).
EARLY_START, EARLY_END = 0.1, 0.06

model = WhisperModel(args.model, device="cpu", compute_type="int8", cpu_threads=os.cpu_count() or 4, download_root=".models/whisper")
segments, info = model.transcribe(
    args.src,
    language=args.language,
    word_timestamps=True,
    hotwords=args.keyterms.replace(",", ", ") or None,
    condition_on_previous_text=False,  # stops one misheard line repeating through the rest of the take
    # Without it a word can stretch across the silence next to it, and the cut then keeps that silence.
    vad_filter=True,
    vad_parameters={"min_silence_duration_ms": 300, "speech_pad_ms": 100},
)

words = []
for segment in segments:
    for w in segment.words:
        start = round(w.start + EARLY_START, 3)
        end = round(max(w.end + EARLY_END, start + 0.02), 3)
        if words:
            words.append({"text": " ", "start": words[-1]["end"], "end": start, "type": "spacing"})
        words.append({"text": w.word.strip(), "start": start, "end": end, "type": "word",
                      "logprob": round(math.log(max(w.probability, 1e-6)), 3)})

result = {"language_code": info.language, "text": " ".join(w["text"] for w in words if w["type"] == "word"), "words": words}
with open(args.out, "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=1)
    f.write("\n")
