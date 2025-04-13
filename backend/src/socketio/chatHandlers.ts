import { Server, Socket } from 'socket.io';
import redis from '../utils/redis';
import { SocketEvent, UserConnection } from '../types/socket';

const getRoomId = (socketId: string, connections: Map<string, UserConnection>): string | null => {
  const connection = connections.get(socketId);
  if (!connection || !connection.projectId) return null;
  
  return `project:${connection.projectId}`;
};

export function setupChatHandlers(
  io: Server,
  socket: Socket,
  activeConnections: Map<string, UserConnection>
) {
  socket.on(SocketEvent.SEND_MESSAGE, async ({ projectId, message }) => {
    const roomId = getRoomId(socket.id, activeConnections);
    if (!roomId) return;
    
    const messageData = {
      userId: socket.data.userId,
      username: socket.data.username,
      message,
      timestamp: new Date().toISOString()
    };
    
    const chatKey = `chat:${projectId}`;
    await redis.lpush(chatKey, JSON.stringify(messageData));
    await redis.expire(chatKey, 60 * 60 * 24 * 30); // 30 days
    
    socket.to(roomId).emit(SocketEvent.RECEIVE_MESSAGE, messageData);
  });
  
  socket.on(SocketEvent.TYPING_START, ({ projectId, cursorPosition }) => {
    const roomId = getRoomId(socket.id, activeConnections);
    if (!roomId) return;
    
    const connection = activeConnections.get(socket.id);
    if (connection) {
      connection.typing = true;
      if (cursorPosition) connection.cursorPosition = cursorPosition;
      activeConnections.set(socket.id, connection);
    }
    
    socket.to(roomId).emit(SocketEvent.TYPING_START, {
      userId: socket.data.userId,
      username: socket.data.username,
      cursorPosition
    });
  });
  
  socket.on(SocketEvent.TYPING_PAUSE, ({ projectId }) => {
    const roomId = getRoomId(socket.id, activeConnections);
    if (!roomId) return;
    
    const connection = activeConnections.get(socket.id);
    if (connection) {
      connection.typing = false;
      activeConnections.set(socket.id, connection);
    }
    
    socket.to(roomId).emit(SocketEvent.TYPING_PAUSE, {
      userId: socket.data.userId,
      username: socket.data.username
    });
  });
  
  socket.on('chat:history', async ({ projectId, limit = 50 }) => {
    const chatKey = `chat:${projectId}`;
    const messages = await redis.lrange(chatKey, 0, limit - 1);
    
    socket.emit('chat:history', { messages: messages.map(msg => JSON.parse(msg)) });
  });
  
  socket.on(SocketEvent.USER_ONLINE, ({ socketId }) => {
    const userConnections = Array.from(activeConnections.values());
    
    const connection = activeConnections.get(socketId);
    if (connection) {
      connection.isOnline = true;
      activeConnections.set(socketId, connection);
    }
    const roomId = getRoomId(socketId, activeConnections);
    if (!roomId) return;
    
    socket.to(roomId).emit(SocketEvent.USER_ONLINE, { socketId });
  });
}
