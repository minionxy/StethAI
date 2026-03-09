# StethAI Sensor Run Guide (ESP32 + MAX30102)

## 1) Upload ESP32 code
- Open `arduino/esp32_max30102_avg.ino` in Arduino IDE.
- Install SparkFun MAX3010x library (includes `MAX30105.h` and `spo2_algorithm.h`).
- Select your ESP32 board and correct COM port.
- Upload sketch.

## 2) Start backend and frontend
- Backend:
  - `cd backend`
  - `node server.js`
- Frontend:
  - `cd frontend`
  - `npm start`

## 3) Start ESP32 reader bridge
- Close Arduino Serial Monitor first (it locks COM port).
- Run:
  - `cd python_service`
  - `python esp32_reader.py`
- If your board is not COM5, set env first:
  - PowerShell: `$env:ESP32_PORT="COM7"`

## 4) Finger placement (important)
- Place finger only after ESP32 boots and prints `READY`.
- Keep finger still with gentle pressure over sensor LEDs.
- Wait 8-12 seconds for stable average values.
- Avoid bright ambient light directly on sensor.

## 5) In app
- Open patient dashboard.
- Confirm status changes to `connected` and live heart rate / SpO2 update.
- You can click `Start Analysis`.
  - With default config, system runs in **sensor-only mode** if stethoscope AI is unavailable.

## 6) Enable stethoscope AI later
- In Python service terminal before running `app.py`:
  - PowerShell: `$env:SENSOR_ONLY_MODE="false"`
- Then run:
  - `python app.py`

## Notes to reduce invalid/noisy readings
- Keep sensor wires short and stable (3.3V, GND, SDA, SCL correct).
- Keep finger warm and still.
- Increase average window by setting:
  - PowerShell: `$env:SENSOR_AVG_WINDOW="10"`
- If "No finger" triggers too often, lower threshold in Arduino sketch:
  - `FINGER_THRESHOLD` from `50000` to around `30000-45000`.
