#include <Wire.h>
#include "MAX30105.h"
#include "spo2_algorithm.h"

MAX30105 sensor;

const int SAMPLE_COUNT = 100;
uint32_t irBuffer[SAMPLE_COUNT];
uint32_t redBuffer[SAMPLE_COUNT];

const uint32_t FINGER_THRESHOLD_FALLBACK = 8000;
const int FINGER_CHECK_WINDOW = 20;
const int AVG_WINDOW = 10;
uint32_t fingerThreshold = FINGER_THRESHOLD_FALLBACK;

float hrWindow[AVG_WINDOW];
float spo2Window[AVG_WINDOW];

int winIndex = 0;
int winCount = 0;

int stableCount = 0;


// Moving average filter
bool pushAndAverage(float hr, float spo2, float &hrAvg, float &spo2Avg)
{
  hrWindow[winIndex] = hr;
  spo2Window[winIndex] = spo2;

  winIndex = (winIndex + 1) % AVG_WINDOW;

  if (winCount < AVG_WINDOW)
    winCount++;

  float hrSum = 0;
  float spo2Sum = 0;

  for (int i = 0; i < winCount; i++)
  {
    hrSum += hrWindow[i];
    spo2Sum += spo2Window[i];
  }

  hrAvg = hrSum / winCount;
  spo2Avg = spo2Sum / winCount;

  return true;
}


// Calculate mean IR value
uint32_t meanTailIR()
{
  uint64_t sum = 0;
  int start = SAMPLE_COUNT - FINGER_CHECK_WINDOW;

  if (start < 0)
    start = 0;

  int n = 0;

  for (int i = start; i < SAMPLE_COUNT; i++)
  {
    sum += irBuffer[i];
    n++;
  }

  if (n == 0)
    return 0;

  return (uint32_t)(sum / n);
}

uint32_t calibrateNoFingerBaseline() {
  // Read a short baseline at boot to adapt for sensor/module variation.
  uint64_t sum = 0;
  const int n = 40;
  for (int i = 0; i < n; i++) {
    while (!sensor.available()) {
      sensor.check();
    }
    sum += sensor.getIR();
    sensor.nextSample();
    delay(10);
  }
  return (uint32_t)(sum / n);
}


void setup()
{
  Serial.begin(115200);
  delay(500);

  Wire.begin();

  if (!sensor.begin(Wire, I2C_SPEED_FAST))
  {
    Serial.println("NO_SENSOR");
    while (1);
  }

  // Stable configuration
  sensor.setup(
    0x3F,   // LED brightness
    8,      // sample average
    2,      // LED mode (Red + IR)
    100,    // sample rate
    411,    // pulse width
    16384   // ADC range
  );

  sensor.setPulseAmplitudeRed(0x3F);
  sensor.setPulseAmplitudeIR(0x3F);

  delay(300);
  uint32_t baseline = calibrateNoFingerBaseline();
  uint32_t adaptive = baseline + 2500;
  if (adaptive < 2500) adaptive = 2500;
  if (adaptive > 12000) adaptive = 12000;
  fingerThreshold = adaptive;

  Serial.print("THRESHOLD,");
  Serial.print(fingerThreshold);
  Serial.print(",BASELINE,");
  Serial.println(baseline);
  Serial.println("READY");
}


void loop()
{

  // Collect samples
  for (int i = 0; i < SAMPLE_COUNT; i++)
  {
    while (!sensor.available())
    {
      sensor.check();
    }

    redBuffer[i] = sensor.getRed();
    irBuffer[i] = sensor.getIR();

    sensor.nextSample();
  }


  uint32_t irMean = meanTailIR();

  // Finger detection
  if (irMean < fingerThreshold)
  {
    stableCount = 0;
    Serial.println("NO_FINGER");
    delay(200);
    return;
  }


  // Stabilization
  stableCount++;

  if (stableCount < 3)
  {
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


  // Ignore invalid readings
  if (!validHeartRate || !validSPO2)
  {
    delay(200);
    return;
  }


  // Filter unrealistic values
  if (heartRate < 50 || heartRate > 140)
  {
    delay(200);
    return;
  }

  if (spo2 < 90 || spo2 > 100)
  {
    delay(200);
    return;
  }


  float hrAvg = 0;
  float spo2Avg = 0;

  pushAndAverage((float)heartRate, (float)spo2, hrAvg, spo2Avg);


  // Output clean data
  Serial.print("DATA,");
  Serial.print((int)(hrAvg + 0.5f));
  Serial.print(",");
  Serial.println((int)(spo2Avg + 0.5f));


  delay(300);
}
