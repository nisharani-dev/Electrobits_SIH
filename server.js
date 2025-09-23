// PowerLine AI - Backend System for Real Arduino Data Only

const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline'); // v10+ parser

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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// -------------------------------------------------------
// REAL ARDUINO INTEGRATION (Replace 'COM7' with your port)
// -------------------------------------------------------
const arduinoPort = new SerialPort({
  path: 'COM7',   // <- adjust to your Arduino port
  baudRate: 9600,
});

// Use the new parser class
const parser = arduinoPort.pipe(new ReadlineParser({ delimiter: '\n' }));

let latestArduino = {
  current: null,
  fallDetected: null,
  irVoltage: null,
  irDetected: null,
  timestamp: new Date(),
};

// Parse incoming data from Arduino
parser.on('data', (line) => {
  console.log('Line from Arduino:', line);
  try {
    const currentMatch = /Current:\s*([\d.]+)\s*A/.exec(line);
    const fallMatch = /Fall=(true|false)/.exec(line);
    const irVMatch = /IR V=([\d.]+)/.exec(line);
    const irDetectedMatch = /Detected=(true|false)/.exec(line);

    latestArduino.current = currentMatch ? parseFloat(currentMatch[1]) : null;
    latestArduino.fallDetected = fallMatch ? fallMatch[1] === 'true' : null;
    latestArduino.irVoltage = irVMatch ? parseFloat(irVMatch[1]) : null;
    latestArduino.irDetected = irDetectedMatch ? irDetectedMatch[1] === 'true' : null;
    latestArduino.timestamp = new Date();
  } catch (err) {
    console.log('Error parsing Arduino data:', err, line);
  }
});

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
🚀 PowerLine AI Backend Server Running!
📡 Port: ${PORT}
🌐 API: http://localhost:${PORT}/api/arduino/live
📊 Dashboard: http://localhost:${PORT}
⚡ WebSocket: Connected for real-time updates
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});