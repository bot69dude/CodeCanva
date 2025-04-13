import express from 'express';
import http from 'http';
import path from 'path';
import { setupSocketIO } from './socketio';

const app = express();
const server = http.createServer(app);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Setup Socket.io with our modular implementation
const io = setupSocketIO(server);

export { app, server };
