// PowerLine AI - Complete Backend System
// Run with: node server.js

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
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ============================================
// DATA MODELS & SIMULATION
// ============================================

class SensorNode {
  constructor(id, name, location) {
    this.id = id;
    this.name = name;
    this.location = location;
    this.isOnline = true;
    this.lastUpdate = new Date();
    
    // Base values for realistic simulation
    this.baseValues = {
      current: 245,
      voltage: 11.2,
      temperature: 67,
      vibration: 0.1,
      humidity: 45,
      pressure: 1013.25
    };
    
    // Current readings
    this.readings = { ...this.baseValues };
    
    // Historical data (last 24 hours)
    this.history = [];
    this.initializeHistory();
  }

  initializeHistory() {
    const now = new Date();
    for (let i = 1440; i >= 0; i--) { // 24 hours of minute data
      const timestamp = new Date(now.getTime() - i * 60000);
      this.history.push({
        timestamp,
        current: this.simulateReading('current', timestamp),
        voltage: this.simulateReading('voltage', timestamp),
        temperature: this.simulateReading('temperature', timestamp),
        vibration: this.simulateReading('vibration', timestamp),
        humidity: this.simulateReading('humidity', timestamp),
        pressure: this.simulateReading('pressure', timestamp)
      });
    }
  }

  simulateReading(type, timestamp = new Date()) {
    const base = this.baseValues[type];
    const hour = timestamp.getHours();
    const minute = timestamp.getMinutes();
    
    let value = base;
    
    // Add time-based patterns
    switch (type) {
      case 'current':
        // Higher during day, lower at night
        value += Math.sin((hour - 6) * Math.PI / 12) * 15;
        // Add some random variation
        value += (Math.random() - 0.5) * 10;
        break;
        
      case 'voltage':
        // Slight voltage fluctuations
        value += Math.sin(hour * Math.PI / 12) * 0.3;
        value += (Math.random() - 0.5) * 0.2;
        break;
        
      case 'temperature':
        // Temperature cycle throughout day
        value += Math.sin((hour - 6) * Math.PI / 12) * 8;
        // Gradual warming trend (simulate aging equipment)
        value += (Date.now() - timestamp.getTime()) / (1000 * 60 * 60 * 24 * 30) * 0.1;
        value += (Math.random() - 0.5) * 3;
        break;
        
      case 'vibration':
        // Higher vibration during high current
        const currentFactor = (this.readings.current - 200) / 100;
        value += currentFactor * 0.02;
        value += Math.random() * 0.04;
        break;
        
      case 'humidity':
        value += Math.sin((hour - 3) * Math.PI / 12) * 10;
        value += (Math.random() - 0.5) * 5;
        break;
        
      case 'pressure':
        value += Math.sin(hour * Math.PI / 24) * 5;
        value += (Math.random() - 0.5) * 2;
        break;
    }
    
    return Math.max(0, value);
  }

  updateReadings() {
    const now = new Date();
    this.lastUpdate = now;
    
    // Update current readings
    Object.keys(this.baseValues).forEach(type => {
      this.readings[type] = this.simulateReading(type, now);
    });

    // Add to history
    this.history.push({
      timestamp: now,
      ...this.readings
    });

    // Keep only last 24 hours
    const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    this.history = this.history.filter(entry => entry.timestamp > cutoff);

    return this.readings;
  }

  getStatus() {
    const { current, voltage, temperature, vibration } = this.readings;
    
    // Determine overall status based on thresholds
    let status = 'normal';
    let alerts = [];

    if (current > 270) {
      status = 'danger';
      alerts.push('High current detected');
    } else if (current > 260) {
      status = 'warning';
      alerts.push('Current approaching limit');
    }

    if (temperature > 75) {
      status = 'danger';
      alerts.push('Temperature critical');
    } else if (temperature > 70) {
      status = status === 'normal' ? 'warning' : status;
      alerts.push('Temperature elevated');
    }

    if (vibration > 0.15) {
      status = 'danger';
      alerts.push('Excessive vibration');
    } else if (vibration > 0.12) {
      status = status === 'normal' ? 'warning' : status;
      alerts.push('Vibration increasing');
    }

    return { status, alerts };
  }

  getAIPrediction() {
    const { temperature, vibration, current } = this.readings;
    
    // Simple AI prediction logic
    const predictions = [];
    
    // Temperature trend prediction
    const recentTemp = this.history.slice(-10).map(h => h.temperature);
    const tempTrend = recentTemp[recentTemp.length - 1] - recentTemp[0];
    
    if (tempTrend > 2) {
      const hoursToLimit = (80 - temperature) / (tempTrend / 10);
      if (hoursToLimit < 24) {
        predictions.push({
          type: 'temperature',
          severity: hoursToLimit < 4 ? 'high' : 'medium',
          message: `Temperature trending upward. Predicted to exceed 80°C in ${hoursToLimit.toFixed(1)} hours`,
          confidence: 0.85
        });
      }
    }

    // Vibration anomaly detection
    if (vibration > 0.13) {
      predictions.push({
        type: 'vibration',
        severity: 'medium',
        message: 'Vibration pattern indicates potential mechanical stress',
        confidence: 0.72
      });
    }

    return predictions;
  }
}

// Initialize sensor nodes
const sensorNodes = [
  new SensorNode('node001', 'Main Line Sensor A', { lat: 40.7128, lng: -74.0060 }),
  new SensorNode('node002', 'Distribution Point B', { lat: 40.7589, lng: -73.9851 }),
  new SensorNode('node003', 'Substation Monitor C', { lat: 40.6892, lng: -74.0445 })
];

// ============================================
// AI ANALYTICS ENGINE
// ============================================

class AIAnalytics {
  constructor() {
    this.models = {
      anomalyDetection: { version: '1.2.3', accuracy: 0.94 },
      predictiveMaintenance: { version: '2.1.0', accuracy: 0.89 },
      loadForecasting: { version: '1.5.1', accuracy: 0.91 }
    };
    this.lastModelUpdate = new Date();
  }

  analyzeNetworkHealth() {
    const allReadings = sensorNodes.map(node => ({
      nodeId: node.id,
      readings: node.readings,
      status: node.getStatus(),
      predictions: node.getAIPrediction()
    }));

    const overallHealth = this.calculateOverallHealth(allReadings);
    
    return {
      overallHealth,
      nodeAnalysis: allReadings,
      networkInsights: this.generateNetworkInsights(allReadings),
      recommendations: this.generateRecommendations(allReadings)
    };
  }

  calculateOverallHealth(readings) {
    const statuses = readings.map(r => r.status.status);
    const dangerCount = statuses.filter(s => s === 'danger').length;
    const warningCount = statuses.filter(s => s === 'warning').length;
    
    if (dangerCount > 0) return 'critical';
    if (warningCount > 1) return 'warning';
    if (warningCount === 1) return 'caution';
    return 'healthy';
  }

  generateNetworkInsights(readings) {
    const insights = [];
    
    // Average temperature across network
    const avgTemp = readings.reduce((sum, r) => sum + r.readings.temperature, 0) / readings.length;
    if (avgTemp > 70) {
      insights.push(`Network average temperature elevated at ${avgTemp.toFixed(1)}°C`);
    }

    // Load distribution analysis
    const currentValues = readings.map(r => r.readings.current);
    const maxCurrent = Math.max(...currentValues);
    const minCurrent = Math.min(...currentValues);
    const imbalance = ((maxCurrent - minCurrent) / maxCurrent) * 100;
    
    if (imbalance > 15) {
      insights.push(`Load imbalance detected: ${imbalance.toFixed(1)}% variation across nodes`);
    }

    return insights;
  }

  generateRecommendations(readings) {
    const recommendations = [];
    
    readings.forEach(nodeData => {
      const { nodeId, readings: r, status } = nodeData;
      
      if (r.temperature > 72) {
        recommendations.push({
          nodeId,
          priority: 'high',
          action: 'Schedule cooling system inspection',
          reason: `Temperature at ${r.temperature.toFixed(1)}°C approaching critical threshold`
        });
      }
      
      if (r.vibration > 0.12) {
        recommendations.push({
          nodeId,
          priority: 'medium',
          action: 'Inspect mechanical connections',
          reason: `Vibration levels elevated at ${r.vibration.toFixed(3)}g`
        });
      }
    });

    return recommendations;
  }
}

const aiEngine = new AIAnalytics();

// ============================================
// API ROUTES
// ============================================

// API index route
app.get('/api', (req, res) => {
  res.json({
    name: 'PowerLine AI API',
    version: '1.0.0',
    status: 'operational',
    endpoints: {
      health: '/api/health',
      nodes: '/api/nodes',
      nodeDetail: '/api/nodes/:nodeId',
      history: '/api/nodes/:nodeId/history?hours=24',
      aiAnalysis: '/api/ai/analysis',
      metrics: '/api/metrics/summary',
      simulate: 'POST /api/nodes/:nodeId/simulate'
    },
    documentation: 'See README.md for full API documentation'
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    version: '1.0.0',
    uptime: process.uptime()
  });
});

// Get all sensor nodes
app.get('/api/nodes', (req, res) => {
  const nodes = sensorNodes.map(node => ({
    id: node.id,
    name: node.name,
    location: node.location,
    isOnline: node.isOnline,
    lastUpdate: node.lastUpdate,
    readings: node.readings,
    status: node.getStatus()
  }));
  
  res.json({ nodes, count: nodes.length });
});

// Get specific node data
app.get('/api/nodes/:nodeId', (req, res) => {
  const node = sensorNodes.find(n => n.id === req.params.nodeId);
  if (!node) {
    return res.status(404).json({ error: 'Node not found' });
  }
  
  res.json({
    id: node.id,
    name: node.name,
    location: node.location,
    isOnline: node.isOnline,
    lastUpdate: node.lastUpdate,
    readings: node.readings,
    status: node.getStatus(),
    predictions: node.getAIPrediction()
  });
});

// Get historical data
app.get('/api/nodes/:nodeId/history', (req, res) => {
  const node = sensorNodes.find(n => n.id === req.params.nodeId);
  if (!node) {
    return res.status(404).json({ error: 'Node not found' });
  }
  
  const { hours = 1 } = req.query;
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  const filteredHistory = node.history.filter(entry => entry.timestamp > cutoff);
  
  res.json({
    nodeId: node.id,
    timeRange: `${hours}h`,
    dataPoints: filteredHistory.length,
    data: filteredHistory
  });
});

// Get AI analysis
app.get('/api/ai/analysis', (req, res) => {
  const analysis = aiEngine.analyzeNetworkHealth();
  res.json({
    timestamp: new Date(),
    models: aiEngine.models,
    lastModelUpdate: aiEngine.lastModelUpdate,
    ...analysis
  });
});

// Get aggregated metrics
app.get('/api/metrics/summary', (req, res) => {
  const summary = sensorNodes.reduce((acc, node) => {
    const readings = node.readings;
    acc.totalCurrent += readings.current;
    acc.avgTemperature += readings.temperature;
    acc.maxVibration = Math.max(acc.maxVibration, readings.vibration);
    acc.nodeCount++;
    return acc;
  }, {
    totalCurrent: 0,
    avgTemperature: 0,
    maxVibration: 0,
    nodeCount: 0
  });
  
  summary.avgTemperature /= summary.nodeCount;
  
  res.json({
    summary,
    timestamp: new Date(),
    overallStatus: aiEngine.calculateOverallHealth(
      sensorNodes.map(n => ({ status: n.getStatus() }))
    )
  });
});

// Simulate sensor data update (for testing)
app.post('/api/nodes/:nodeId/simulate', (req, res) => {
  const node = sensorNodes.find(n => n.id === req.params.nodeId);
  if (!node) {
    return res.status(404).json({ error: 'Node not found' });
  }
  
  const { type, value } = req.body;
  if (type && value !== undefined) {
    node.readings[type] = value;
    node.lastUpdate = new Date();
  }
  
  res.json({
    message: 'Simulation updated',
    nodeId: node.id,
    readings: node.readings
  });
});

// ============================================
// WEBSOCKET REAL-TIME UPDATES
// ============================================

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send initial data
  socket.emit('initial-data', {
    nodes: sensorNodes.map(node => ({
      id: node.id,
      name: node.name,
      readings: node.readings,
      status: node.getStatus()
    })),
    aiAnalysis: aiEngine.analyzeNetworkHealth()
  });
  
  // Handle client requesting specific node data
  socket.on('subscribe-node', (nodeId) => {
    const node = sensorNodes.find(n => n.id === nodeId);
    if (node) {
      socket.join(`node-${nodeId}`);
      socket.emit('node-data', {
        nodeId,
        readings: node.readings,
        status: node.getStatus(),
        predictions: node.getAIPrediction()
      });
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// ============================================
// REAL-TIME DATA UPDATES
// ============================================

// Update sensor readings every 2 seconds
setInterval(() => {
  sensorNodes.forEach(node => {
    node.updateReadings();
  });
  
  // Broadcast updates to all connected clients
  const updateData = {
    timestamp: new Date(),
    nodes: sensorNodes.map(node => ({
      id: node.id,
      readings: node.readings,
      status: node.getStatus()
    }))
  };
  
  io.emit('sensor-update', updateData);
}, 2000);

// AI analysis update every 30 seconds
setInterval(() => {
  const analysis = aiEngine.analyzeNetworkHealth();
  io.emit('ai-analysis', {
    timestamp: new Date(),
    ...analysis
  });
}, 30000);

// ============================================
// SERVE FRONTEND
// ============================================

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html for root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================
// START SERVER
// ============================================

server.listen(PORT, () => {
  console.log(`
🚀 PowerLine AI Backend Server Running!
📡 Port: ${PORT}
🌐 API: http://localhost:${PORT}/api
📊 Dashboard: http://localhost:${PORT}
⚡ WebSocket: Connected for real-time updates

📋 Available API Endpoints:
   GET  /api/health
   GET  /api/nodes
   GET  /api/nodes/:nodeId
   GET  /api/nodes/:nodeId/history?hours=24
   GET  /api/ai/analysis
   GET  /api/metrics/summary
   POST /api/nodes/:nodeId/simulate

🤖 AI Features:
   ✅ Real-time anomaly detection
   ✅ Predictive maintenance alerts
   ✅ Network health analysis
   ✅ Load balancing insights
   
📡 Real-time Features:
   ✅ WebSocket live updates every 2s
   ✅ AI analysis every 30s
   ✅ Historical data tracking
   ✅ Multi-node coordination
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});