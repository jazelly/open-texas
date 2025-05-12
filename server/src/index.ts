import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { gameSocket } from './socket.js';
import { apiRoutes } from './routes/index.js';

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
    origin: process.env.NODE_ENV === 'production' 
      ? false 
      : process.env.CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? true 
    : process.env.CLIENT_URL,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api', apiRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  });
}

// Initialize socket.io
gameSocket(io);

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.io is accepting connections from: ${process.env.NODE_ENV === 'production' ? 'same-origin only' : process.env.CLIENT_URL}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  server.close(() => {
    console.log('Server shut down.');
    process.exit(0);
  });
}); 