import numpy as np
from scipy.signal import find_peaks

def calculate_heart_rate(signal, fs):
    peaks, _ = find_peaks(signal, distance=fs * 0.4)
    hr = (len(peaks) / (len(signal) / fs)) * 60
    return int(hr)

def generate_waveform(signal, points=200):
    idx = np.linspace(0, len(signal) - 1, points).astype(int)
    return signal[idx].tolist()