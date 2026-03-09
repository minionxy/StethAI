const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");

let latestVitals = {
  heartRate: 0,
  spo2: 0,
  bp: "0/0",
};

function estimateBP(hr) {
  const sys = 110 + Math.floor(hr / 2);
  const dia = 70 + Math.floor(hr / 4);
  return `${sys}/${dia}`;
}

function startSerial() {
  const port = new SerialPort({
    path: "COM5", // 🔴 CHANGE THIS
    baudRate: 115200,
  });

  port.on("error", function (err) {
    console.log("⚠️ Serial Port Error: ", err.message);
  });

  const parser = port.pipe(new ReadlineParser({ delimiter: "\n" }));

  parser.on("data", (line) => {
    try {
      // expected: HR:72,SpO2:98
      const hr = parseInt(line.split(",")[0].split(":")[1]);
      const spo2 = parseInt(line.split(",")[1].split(":")[1]);

      latestVitals.heartRate = hr;
      latestVitals.spo2 = spo2;
      latestVitals.bp = estimateBP(hr);

      console.log("Vitals:", latestVitals);
    } catch (err) { }
  });
}

function getVitals() {
  return latestVitals;
}

module.exports = { startSerial, getVitals };