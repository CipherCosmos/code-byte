import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { AppDataSource } from './database/dataSource.js';
import authRoutes from './routes/auth.js';
import gameRoutes from './routes/games.js';
import participantRoutes from './routes/participants.js';
import analyticsRoutes from './routes/analytics.js';
import { setupSocketHandlers } from './socket/socketHandlers.js';

// Configure logging level globally before any logs
const envLogLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'error' : 'info');
if (envLogLevel === 'error') {
  console.debug = () => {};
  console.info = () => {};
  console.log = () => {};
} else if (envLogLevel === 'silent') {
  console.debug = () => {};
  console.info = () => {};
  console.log = () => {};
  console.warn = () => {};
}

const __dirname = path.dirname(new URL(import.meta.url).pathname);

// Load environment variables with diagnostic logging
const dotenvResult = dotenv.config();
if (dotenvResult.error) {
  console.error('❌ dotenv config error:', dotenvResult.error);
}

// Diagnostic logging for environment variables

// Socket.IO Setup with CORS logging
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: true, // Allow all origins
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
// CORS middleware with detailed logging
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Session-Token"]
}));
app.use(express.json());

// Note: Static file serving removed as we're now using Cloudinary for file storage

// Initialize Database with detailed logging
async function initializeDatabase() {
  try {
    await AppDataSource.initialize();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('❌ Connection details:');
    console.error('  - Host:', 'pg-2e6b7563-svm-aac5.f.aivencloud.com');
    console.error('  - Port:', 14244);
    console.error('  - Database:', 'defaultdb');
    console.error('  - SSL enabled:', true);
    console.error('  - Connection timeout:', '10 seconds');
    throw error;
  }
}
initializeDatabase();
// Add preflight request logging middleware
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
  }
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/participants', participantRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Code Byte Backend is running' });
});

// Socket.IO Setup
setupSocketHandlers(io);

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
});

export { io };