import { Server as SocketIOServer, Socket } from 'socket.io';
import { SocketEvent, UserConnection } from '../types/socket';

const socketRooms = new Map<string, string>();

const getRoomId = (socketId: string): string | undefined => {
  return socketRooms.get(socketId);
};

export function setupDrawingHandlers(
  io: SocketIOServer,
  socket: Socket,
  activeConnections: Map<string, UserConnection>
) {
  socket.on('JOIN_DRAWING_ROOM', (roomId: string) => {
    const previousRoom = socketRooms.get(socket.id);
    if (previousRoom) {
      socket.leave(previousRoom);
    }
    socket.join(roomId);
    socketRooms.set(socket.id, roomId);
    
    console.log(`User ${socket.data.username} joined drawing room: ${roomId}`);
  });
  
  socket.on('LEAVE_DRAWING_ROOM', () => {
    const roomId = getRoomId(socket.id);
    if (roomId) {
      socket.leave(roomId);
      socketRooms.delete(socket.id);
      console.log(`User ${socket.data.username} left drawing room: ${roomId}`);
    }
  });

  socket.on(SocketEvent.REQUEST_DRAWING, () => {
    const roomId = getRoomId(socket.id);
    if (!roomId) return;
    socket.broadcast
      .to(roomId)
      .emit(SocketEvent.REQUEST_DRAWING, { socketId: socket.id });
  });

  socket.on(SocketEvent.SYNC_DRAWING, ({ drawingData, socketId }) => {
    socket.broadcast
      .to(socketId)
      .emit(SocketEvent.SYNC_DRAWING, { drawingData });
  });

  socket.on(SocketEvent.DRAWING_UPDATE, ({ snapshot }) => {
    const roomId = getRoomId(socket.id);
    if (!roomId) return;
    socket.broadcast.to(roomId).emit(SocketEvent.DRAWING_UPDATE, {
      snapshot,
    });
  });

  socket.on('disconnect', () => {
    socketRooms.delete(socket.id);
  });
}
