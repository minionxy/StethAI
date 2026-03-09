import os
import numpy as np
import librosa
import tensorflow as tf
import tensorflow_hub as hub

TARGET_SR = 16000
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CLASSIFIER_PATH = os.path.join(BASE_DIR, "yamnet_heart_classifier.h5")

print("Loading YamNet...")
yamnet_model = hub.load("https://tfhub.dev/google/yamnet/1")

print("Loading classifier...")
classifier = tf.keras.models.load_model(CLASSIFIER_PATH)

print("Models loaded")


def predict_live(signal, fs):
    audio = np.asarray(signal, dtype=np.float32)

    if fs != TARGET_SR:
        audio = librosa.resample(audio, orig_sr=fs, target_sr=TARGET_SR)

    audio = audio / (np.max(np.abs(audio)) + 1e-6)
    scores, embeddings, spectrogram = yamnet_model(audio)

    embedding = np.mean(embeddings.numpy(), axis=0)
    pred = classifier.predict(embedding.reshape(1, -1), verbose=0)
    cls = int(np.argmax(pred))

    diagnosis = "Normal" if cls == 1 else "Abnormal"

    return {
        "diagnosis": diagnosis,
        "confidence": float(np.max(pred))
    }
