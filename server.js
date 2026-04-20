// PowerLine AI - Backend with Arduino + Auto Simulation Fallback

const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 3000;
const ARDUINO_PORT = process.env.ARDUINO_PORT || 'COM7';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

let latestArduino = {
  current: null,
  fallDetected: null,
  irVoltage: null,
  irDetected: null,
  timestamp: new Date(),
  source: 'simulation', // 'arduino' or 'simulation'
};

let simulatorInterval = null;

// -------------------------------------------------------
// SIMULATION MODE - realistic sensor data generator
// -------------------------------------------------------
function startSimulation() {
  console.log('⚠️  Arduino not connected — starting simulation mode');

  // Simulation state for smooth, realistic data
  let simCurrent = 15;
  let simMovement = false;
  let simIrVoltage = 0.15;
  let simIrDetected = false;
  let tick = 0;

  simulatorInterval = setInterval(() => {
    tick++;

    // Simulate gradual current fluctuation (5–80A range)
    simCurrent += (Math.random() - 0.5) * 4;
    simCurrent = Math.max(5, Math.min(80, simCurrent));

    // Occasionally simulate a fall/movement event (~5% chance)
    simMovement = Math.random() < 0.05;

    // IR voltage: normally ~0.15V, drops below 0.05V when object detected
    simIrDetected = Math.random() < 0.08; // ~8% chance of obstacle
    simIrVoltage = simIrDetected
      ? parseFloat((Math.random() * 0.04).toFixed(3))       // 0.00–0.04V (detected)
      : parseFloat((Math.random() * 0.1 + 0.1).toFixed(3)); // 0.10–0.20V (clear)

    latestArduino = {
      current: parseFloat(simCurrent.toFixed(3)),
      fallDetected: simMovement,
      irVoltage: simIrVoltage,
      irDetected: simIrDetected,
      timestamp: new Date(),
      source: 'simulation',
    };
  }, 500);
}

// -------------------------------------------------------
// REAL ARDUINO INTEGRATION
// -------------------------------------------------------
function startArduino() {
  const arduinoPort = new SerialPort({
    path: ARDUINO_PORT,
    baudRate: 9600,
    autoOpen: false,
  });

  arduinoPort.open((err) => {
    if (err) {
      console.log(`⚠️  Could not open ${ARDUINO_PORT}: ${err.message}`);
      startSimulation();
      return;
    }

    console.log(`✅ Arduino connected on ${ARDUINO_PORT}`);

    // If simulation was running, stop it
    if (simulatorInterval) {
      clearInterval(simulatorInterval);
      simulatorInterval = null;
    }

    const parser = arduinoPort.pipe(new ReadlineParser({ delimiter: '\n' }));

    parser.on('data', (line) => {
      console.log('Arduino:', line.trim());
      try {
        const currentMatch = /Current:\s*([\d.]+)\s*A/.exec(line);
        const fallMatch = /Fall=(true|false)/.exec(line);
        const irVMatch = /IR V=([\d.]+)/.exec(line);
        const irDetectedMatch = /Detected=(true|false)/.exec(line);

        latestArduino = {
          current: currentMatch ? parseFloat(currentMatch[1]) : latestArduino.current,
          fallDetected: fallMatch ? fallMatch[1] === 'true' : latestArduino.fallDetected,
          irVoltage: irVMatch ? parseFloat(irVMatch[1]) : latestArduino.irVoltage,
          irDetected: irDetectedMatch ? irDetectedMatch[1] === 'true' : latestArduino.irDetected,
          timestamp: new Date(),
          source: 'arduino',
        };
      } catch (err) {
        console.log('Error parsing Arduino data:', err.message);
      }
    });

    arduinoPort.on('close', () => {
      console.log('Arduino disconnected — switching to simulation mode');
      startSimulation();
    });

    arduinoPort.on('error', (err) => {
      console.log('Arduino error:', err.message, '— switching to simulation mode');
      startSimulation();
    });
  });
}

// Start Arduino (falls back to simulation automatically)
startArduino();

// -------------------------------------------------------
// API Endpoint for Arduino Live Data
// -------------------------------------------------------
app.get('/api/arduino/live', (req, res) => {
  res.json({ ...latestArduino });
});

// -------------------------------------------------------
// WEBSOCKET REAL-TIME UPDATES
// -------------------------------------------------------
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send latest Arduino data immediately
  socket.emit('arduino-live', latestArduino);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// -------------------------------------------------------
// REAL-TIME ARDUINO DATA BROADCAST (every 2 seconds)
// -------------------------------------------------------
setInterval(() => {
  io.emit('arduino-live', latestArduino);
}, 500);

// -------------------------------------------------------
// SERVE FRONTEND, API Index
// -------------------------------------------------------
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, () => {
  console.log(`
🚀 ElectroBits Backend Server Running!
📡 Port: ${PORT}
🌐 API: http://localhost:${PORT}/api/arduino/live
📊 Dashboard: http://localhost:${PORT}
⚡ WebSocket: Connected for real-time updates
🔌 Arduino port: ${ARDUINO_PORT} (falls back to simulation if not connected)
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});