import os
import re
import time
from collections import deque

import requests
import serial

ESP32_PORT = os.getenv("ESP32_PORT", "COM5")
BAUD = int(os.getenv("ESP32_BAUD", "115200"))
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5000/api/vitals/live")
AVG_WINDOW = int(os.getenv("SENSOR_AVG_WINDOW", "8"))

HR_RANGE = (40, 190)
SPO2_RANGE = (80, 100)
NO_FINGER_COOLDOWN_SEC = 3
MIN_VALID_STREAK_FOR_OK = int(os.getenv("MIN_VALID_STREAK_FOR_OK", "3"))
INVALID_STREAK_FOR_STATUS = int(os.getenv("INVALID_STREAK_FOR_STATUS", "4"))

hr_samples = deque(maxlen=AVG_WINDOW)
spo2_samples = deque(maxlen=AVG_WINDOW)
last_no_finger_log = 0
last_status_post = 0
valid_streak = 0
invalid_streak = 0

NO_FINGER_MARKERS = (
    "no finger",
    "place finger",
    "finger not detected",
)

BOOT_NOISE_PREFIXES = (
    "ets ",
    "rst:",
    "configsip:",
    "clk_drv:",
    "mode:",
    "load:",
    "entry ",
)

BOOT_NOISE_CONTAINS = (
    "starting",
    "max30102",
)


def parse_data_line(line):
    # Preferred format from our Arduino sketch: DATA,78,97
    parts = line.split(",")
    if len(parts) == 3 and parts[0].strip().upper() == "DATA":
        try:
            hr = float(parts[1])
            spo2 = float(parts[2])
            return hr, spo2
        except ValueError:
            return None

    # Also accept common debug formats:
    # "HR: 78, SpO2: 97" or "Heart Rate=78 SpO2=97"
    hr_match = re.search(r"(?:HR|Heart\s*Rate)\s*[:=]\s*([0-9]+(?:\.[0-9]+)?)", line, re.IGNORECASE)
    spo2_match = re.search(r"(?:SpO2|SPO2)\s*[:=]\s*([0-9]+(?:\.[0-9]+)?)", line, re.IGNORECASE)
    if hr_match and spo2_match:
        return float(hr_match.group(1)), float(spo2_match.group(1))

    # Fallback format: "78,97"
    if len(parts) == 2:
        try:
            return float(parts[0]), float(parts[1])
        except ValueError:
            return None

    return None


def is_no_finger_line(line):
    low = line.lower()
    return any(marker in low for marker in NO_FINGER_MARKERS)


def is_boot_noise(line):
    low = line.lower()
    if any(low.startswith(prefix) for prefix in BOOT_NOISE_PREFIXES):
        return True
    return any(token in low for token in BOOT_NOISE_CONTAINS)


def in_range(hr, spo2):
    return HR_RANGE[0] <= hr <= HR_RANGE[1] and SPO2_RANGE[0] <= spo2 <= SPO2_RANGE[1]


def avg(values):
    return sum(values) / len(values)


def post_status(session, status, message):
    global last_status_post
    now = time.time()
    if now - last_status_post < 1.5:
        return
    last_status_post = now
    try:
        session.post(
            BACKEND_URL,
            json={"status": status, "message": message, "timestamp": now},
            timeout=1.5,
        )
    except requests.RequestException:
        pass


print(f"Listening to ESP32 on {ESP32_PORT} @ {BAUD}...")
print(f"Posting to {BACKEND_URL} with window={AVG_WINDOW}")

ser = serial.Serial(ESP32_PORT, BAUD, timeout=1)
session = requests.Session()

while True:
    try:
        line = ser.readline().decode("utf-8", errors="ignore").strip()
        if not line:
            continue

        now = time.time()

        if line.upper() == "NO_FINGER" or is_no_finger_line(line):
            hr_samples.clear()
            spo2_samples.clear()
            valid_streak = 0
            invalid_streak = 0
            if now - last_no_finger_log > NO_FINGER_COOLDOWN_SEC:
                print("No finger detected. Place finger on sensor and keep still.")
                last_no_finger_log = now
            post_status(session, "no_finger", "Place finger on sensor")
            continue

        if is_boot_noise(line):
            continue

        parsed = parse_data_line(line)
        if not parsed:
            if "invalid" in line.lower():
                invalid_streak += 1
                valid_streak = 0
                if invalid_streak >= INVALID_STREAK_FOR_STATUS:
                    post_status(session, "invalid", "Invalid/unstable reading")
            continue

        hr, spo2 = parsed
        if not in_range(hr, spo2):
            invalid_streak += 1
            valid_streak = 0
            if invalid_streak >= INVALID_STREAK_FOR_STATUS:
                post_status(session, "invalid", "Reading out of valid range")
            continue

        invalid_streak = 0
        valid_streak += 1
        hr_samples.append(hr)
        spo2_samples.append(spo2)

        if valid_streak < MIN_VALID_STREAK_FOR_OK:
            post_status(session, "waiting", "Calibrating signal. Keep finger steady.")
            continue

        heart_rate = round(avg(hr_samples), 1)
        oxygen = round(avg(spo2_samples), 1)

        payload = {
            "heartRate": heart_rate,
            "spo2": oxygen,
            "timestamp": now,
            "status": "ok",
            "message": "Live data",
        }

        print("Live vitals:", payload)

        try:
            session.post(BACKEND_URL, json=payload, timeout=1.5)
        except requests.RequestException as post_err:
            print("Backend post failed:", post_err)

    except Exception as e:
        print("Reader error:", e)
        time.sleep(0.5)
