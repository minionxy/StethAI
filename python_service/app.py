from flask import Flask, jsonify
import numpy as np
import tensorflow as tf
import librosa
import requests

from audio_capture import record_audio
from signal_processor import calculate_heart_rate, generate_waveform

app = Flask(__name__)
model = tf.keras.models.load_model("heart_model.h5")

NODE_BACKEND = "http://localhost:5000/api/reports"

@app.route("/analyze/<userId>", methods=["POST"])
def analyze(userId):

    # 🎙️ record and SAVE audio
    filepath, signal, fs = record_audio(seconds=5)

    hr = calculate_heart_rate(signal, fs)

    mfcc = librosa.feature.mfcc(y=signal, sr=fs, n_mfcc=40)
    features = np.mean(mfcc.T, axis=0).reshape(1, -1)

    pred = model.predict(features, verbose=0)
    diagnosis = "Normal" if pred[0][0] > 0.5 else "Abnormal"

    spo2 = 97 + (hr % 3)
    bp = f"{110 + hr//2}/{70 + hr//4}"
    waveform = generate_waveform(signal)

    report = {
        "userId": userId,
        "heartRate": hr,
        "spo2": spo2,
        "bp": bp,
        "diagnosis": diagnosis,
        "audioPath": filepath,
        "waveform": waveform
    }

    # 🔥 save to backend DB
    try:
        requests.post(NODE_BACKEND, json=report)
    except:
        print("Backend not reachable")

    return jsonify(report)

if __name__ == "__main__":
    app.run(port=6000)