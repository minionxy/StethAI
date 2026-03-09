import os
from datetime import datetime

import sounddevice as sd
import soundfile as sf

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RECORD_DIR = os.path.join(BASE_DIR, "recordings")
os.makedirs(RECORD_DIR, exist_ok=True)


def record_audio(seconds=5, fs=16000):
    filename = datetime.now().strftime("%Y%m%d_%H%M%S.wav")
    filepath = os.path.join(RECORD_DIR, filename)

    print(f"Recording {seconds}s audio...", flush=True)
    audio = sd.rec(int(seconds * fs), samplerate=fs, channels=1, dtype="float32")
    sd.wait()

    audio = audio.flatten()
    if audio.size == 0:
        raise RuntimeError("No audio captured from input device")

    sf.write(filepath, audio, fs)
    print(f"Saved recording: {filepath}", flush=True)
    return filepath, audio, fs
