import sounddevice as sd
import soundfile as sf
import os
from datetime import datetime

RECORD_DIR = "recordings"
os.makedirs(RECORD_DIR, exist_ok=True)

def record_audio(seconds=5, fs=2000):
    filename = datetime.now().strftime("%Y%m%d_%H%M%S.wav")
    filepath = os.path.join(RECORD_DIR, filename)

    audio, fs = sf.read("sample_heartbeat.wav")

    sf.write(filepath, audio, fs)
    return filepath, audio.flatten(), fs