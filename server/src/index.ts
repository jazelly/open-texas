import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { gameSocket } from './socket.js';
import { apiRoutes } from './routes/index.js';
import { xssProtection } from './middleware/securityMiddleware.js';
import { adaptiveSecurityMiddleware } from './middleware/securityMiddleware.js';
import { generateRequestId } from './middleware/requestIdMiddleware.js';
import logger from './utils/logger.js';

// Load environment variables
dotenv.config();

// Create dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Configure Socket.IO with CORS options
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(adaptiveSecurityMiddleware);
app.use(xssProtection);

// Generate requestId for all requests
app.use(generateRequestId);

app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  logger.info({
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection.remoteAddress,
  }, 'Incoming request');

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    }, 'Request completed');
  });

  next();
});

app.use('/api', apiRoutes);

gameSocket(io);

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  logger.info({ port: PORT, env: process.env.NODE_ENV }, 'Server started');
});

process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down server...');
  server.close(() => {
    logger.info('Server shut down gracefully');
    process.exit(0);
  });
});

process.on('uncaughtException', (error) => {
  logger.fatal({ error: error.message, stack: error.stack }, 'Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.fatal({ reason, promise }, 'Unhandled promise rejection');
  process.exit(1);
}); 