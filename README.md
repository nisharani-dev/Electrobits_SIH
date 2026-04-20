# ElectroBits — Intelligent Power Line Monitoring

An IoT-based real-time monitoring system for overhead low-voltage conductors. ElectroBits uses Arduino sensors to detect current anomalies, wire movement, and physical obstacles — streaming live data to a web dashboard via WebSocket.

**Live Demo:** [https://electrobits-sih.onrender.com](https://electrobits-sih.onrender.com)  
**GitHub:** [https://github.com/nisharani-dev/Electrobits_SIH](https://github.com/nisharani-dev/Electrobits_SIH)

---

## Features

- **Real-time Current Monitoring** — Tracks power flow through overhead conductors using an SCT013 100A non-invasive current transformer with 16-bit ADC precision
- **Wire Movement Detection** — MPU-6050 accelerometer/gyroscope detects excessive vibration or structural stress
- **Obstacle Detection** — Active IR sensor identifies vegetation, debris, or animal contact on power lines
- **Live Dashboard** — WebSocket-powered telemetry with Chart.js visualizations updating every 500ms
- **Auto Simulation Mode** — When no Arduino is connected, the backend automatically generates realistic sensor data so the dashboard stays functional
- **Wireless Communication** — HC-05 Bluetooth module for cable-free data transmission from the sensor node

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express.js |
| Real-time | Socket.IO (WebSocket) |
| Hardware | SerialPort (Arduino via COM port) |
| Frontend | Vanilla JS, Chart.js |
| Deployment | Render |

---

## Hardware Components

| Component | Purpose |
|-----------|---------|
| Arduino Uno (ATmega328P) | Microcontroller |
| SCT013 100A:50mA | Non-invasive current transformer |
| ADS-1115 16-bit ADC | Analog-to-digital conversion |
| MPU-6050 | 6-axis accelerometer/gyroscope for movement detection |
| Active IR Sensor | Obstacle detection |
| HC-05 Bluetooth Module | Wireless data transmission |

---

## Project Structure

```
electrobits/
├── server.js          # Backend — Arduino integration, simulation fallback, WebSocket, REST API
├── package.json       # Dependencies and scripts
├── public/
│   └── index.html     # Single-page frontend dashboard
└── README.md
```

---

## Getting Started

### Prerequisites
- Node.js v18+
- npm

### Installation

```bash
git clone https://github.com/nisharani-dev/Electrobits_SIH.git
cd Electrobits_SIH
npm install
```

### Run

```bash
npm start
```

Server starts at `http://localhost:3000`

### With Arduino

Connect your Arduino to a COM port and set the environment variable before starting:

```bash
ARDUINO_PORT=COM3 npm start
```

If the port is unavailable or no Arduino is connected, the server automatically falls back to simulation mode.

---

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Serves the frontend dashboard |
| `/api/arduino/live` | GET | Returns latest sensor reading as JSON |

### Sample Response

```json
{
  "current": 24.731,
  "fallDetected": false,
  "irVoltage": 0.143,
  "irDetected": false,
  "timestamp": "2025-04-21T10:30:00.000Z",
  "source": "simulation"
}
```

---

## WebSocket Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `arduino-live` | Server → Client | Latest sensor data (emitted every 500ms) |

---

## Deployment

Deployed on **Render** (free tier).

- Build command: `npm install`
- Start command: `npm start`
- WebSockets supported natively

---

## Team

Built for **Smart India Hackathon (SIH)** by:

| Name | Role |
|------|------|
| Pragya Aggarwal | Team Lead & Hardware Specialist |
| Priya Prakash | Software — Dashboard & Backend |
| Ritika Maan | Software — Dashboard & Backend |
| Sanchita Yadav | Software — Dashboard & Backend |
| Rishita Kashnia | Hardware — Sensors & Communication |
| Nisha Rani | Hardware — Sensors & Communication |

---

## License

ISC
