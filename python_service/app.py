import os
from flask import Flask, jsonify

# Default to real AI mode. Set SENSOR_ONLY_MODE=true only if you explicitly want fallback behavior.
SENSOR_ONLY_MODE = os.getenv("SENSOR_ONLY_MODE", "false").lower() == "true"

if not SENSOR_ONLY_MODE:
    from yamnet_infer import predict_live
    from audio_capture import record_audio
    from signal_processor import generate_waveform

app = Flask(__name__)


@app.route("/analyze/<userId>", methods=["POST"])
def analyze(userId):
    if SENSOR_ONLY_MODE:
        return jsonify(
            {
                "userId": userId,
                "diagnosis": "Sensor-Only",
                "confidence": 0.0,
                "audioPath": "",
                "waveform": [],
            }
        )

    try:
        filepath, signal, fs = record_audio(seconds=5)
        result = predict_live(signal, fs)
        waveform = generate_waveform(signal)

        ai_report = {
            "userId": userId,
            "diagnosis": result["diagnosis"],
            "confidence": result["confidence"],
            "audioPath": filepath,
            "waveform": waveform,
        }

        return jsonify(ai_report)
    except Exception as e:
        return jsonify({"error": f"AI analysis failed: {e}"}), 500


if __name__ == "__main__":
    app.run(port=6000)
