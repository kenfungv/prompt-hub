const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();
const apiRoutes = require('./api/routes');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded bodies

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api', apiRoutes);

// Performance Monitor Routes
try {
  const perfRoutes = require('./routes/performanceMonitorRoutes');
  app.use('/api/perf', perfRoutes);
} catch (e) {
  console.warn('Performance routes not loaded:', e.message);
}

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Prompt Hub API Server',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      prompts: '/api/prompts',
      categories: '/api/categories',
      tags: '/api/tags',
      performance: {
        health: '/api/perf/health',
        ingest: '/api/perf/ingest',
        realtime: '/api/perf/metrics/realtime',
        query: '/api/perf/metrics/query',
        aggregate: '/api/perf/metrics/aggregate',
        exportCsv: '/api/perf/metrics/export.csv'
      }
    },
    documentation: 'https://github.com/kenfungv/prompt-hub'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/prompt-hub';
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => {
    console.log('✅ Connected to MongoDB');
    console.log(`📊 Database: ${mongoose.connection.name}`);

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 API available at http://localhost:${PORT}/api`);
      console.log(`🏥 Health check at http://localhost:${PORT}/api/health`);
    });
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await mongoose.connection.close();
  console.log('✅ MongoDB connection closed');
  process.exit(0);
});

module.exports = app;
