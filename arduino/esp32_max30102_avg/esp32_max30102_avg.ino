#include <Wire.h>
#include "MAX30105.h"
#include "spo2_algorithm.h"

// Libraries from SparkFun MAX3010x sensor library:
// - MAX30105.h
// - spo2_algorithm.h / spo2_algorithm.cpp

MAX30105 sensor;

const int SAMPLE_COUNT = 100;
uint32_t irBuffer[SAMPLE_COUNT];
uint32_t redBuffer[SAMPLE_COUNT];

const uint32_t FINGER_THRESHOLD = 8000;  // Robust default; tune if needed.
const int FINGER_CHECK_WINDOW = 20;
const int AVG_WINDOW = 5;

float hrWindow[AVG_WINDOW];
float spo2Window[AVG_WINDOW];
int winIndex = 0;
int winCount = 0;

bool pushAndAverage(float hr, float spo2, float &hrAvg, float &spo2Avg) {
  hrWindow[winIndex] = hr;
  spo2Window[winIndex] = spo2;

  winIndex = (winIndex + 1) % AVG_WINDOW;
  if (winCount < AVG_WINDOW) {
    winCount++;
  }

  float hrSum = 0;
  float spo2Sum = 0;
  for (int i = 0; i < winCount; i++) {
    hrSum += hrWindow[i];
    spo2Sum += spo2Window[i];
  }

  hrAvg = hrSum / winCount;
  spo2Avg = spo2Sum / winCount;
  return true;
}

uint32_t meanTailIR() {
  uint64_t sum = 0;
  int start = SAMPLE_COUNT - FINGER_CHECK_WINDOW;
  if (start < 0) start = 0;

  int n = 0;
  for (int i = start; i < SAMPLE_COUNT; i++) {
    sum += irBuffer[i];
    n++;
  }
  if (n <= 0) return 0;
  return (uint32_t)(sum / (uint64_t)n);
}

void setup() {
  Serial.begin(115200);
  delay(500);

  Wire.begin();
  if (!sensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("NO_SENSOR");
    while (1) {
      delay(1000);
    }
  }

  // sensor.setup(brightness, sampleAverage, ledMode, sampleRate, pulseWidth, adcRange)
  sensor.setup(60, 4, 2, 100, 411, 4096);
  sensor.setPulseAmplitudeRed(0x3F);
  sensor.setPulseAmplitudeIR(0x3F);


  Serial.println("READY");
}

void loop() {
  for (int i = 0; i < SAMPLE_COUNT; i++) {
    while (sensor.available() == false) {
      sensor.check();
    }

    redBuffer[i] = sensor.getRed();
    irBuffer[i] = sensor.getIR();
    sensor.nextSample();
  }

  uint32_t irMean = meanTailIR();
  if (irMean < FINGER_THRESHOLD) {
    Serial.println("NO_FINGER");
    delay(200);
    return;
  }

  int32_t spo2 = 0;
  int8_t validSPO2 = 0;
  int32_t heartRate = 0;
  int8_t validHeartRate = 0;

  maxim_heart_rate_and_oxygen_saturation(
    irBuffer,
    SAMPLE_COUNT,
    redBuffer,
    &spo2,
    &validSPO2,
    &heartRate,
    &validHeartRate
  );

  // Ignore invalid values silently to avoid noisy spam.
  if (!validHeartRate || !validSPO2) {
    delay(200);
    return;
  }

  if (heartRate < 40 || heartRate > 190 || spo2 < 80 || spo2 > 100) {
    delay(200);
    return;
  }

  float hrAvg = 0;
  float spo2Avg = 0;
  pushAndAverage((float)heartRate, (float)spo2, hrAvg, spo2Avg);

  Serial.print("DATA,");
  Serial.print((int)(hrAvg + 0.5f));
  Serial.print(",");
  Serial.println((int)(spo2Avg + 0.5f));

  delay(200);
}
