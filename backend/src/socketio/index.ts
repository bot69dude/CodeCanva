import { Server as SocketIOServer } from 'socket.io';
import { Server } from 'http';
import { setupCodeEditorHandlers } from './codeEditor';
import { setupChatHandlers } from './chatHandlers';
import { setupDrawingHandlers } from './drawingHandlers';
import UserModel from '../models/Users.Model';
import jwt from 'jsonwebtoken';

const activeConnections = new Map();

export function setupSocketIO(server: Server) {
  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' ? false : '*',
      methods: ['GET', 'POST']
    }
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || 
                    socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };
      const user = await UserModel.findById(decoded.id);
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }
      
      socket.data.userId = user._id.toString();
      socket.data.username = user.username;
      
      activeConnections.set(socket.id, {
        userId: user._id.toString(),
        username: user.username,
        socketId: socket.id,
        isOnline: true
      });
      
      return next();
    } catch (error) {
      return next(new Error('Authentication error'));
    }
  });
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    setupCodeEditorHandlers(io, socket, activeConnections);
    setupChatHandlers(io, socket, activeConnections);
    setupDrawingHandlers(io, socket, activeConnections);
    
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
      activeConnections.delete(socket.id);
    });
  });

  return io;
}
