import { Server, Socket } from 'socket.io';
import redis from '../utils/redis';
import { SocketEvent, UserConnection, CursorPosition, SocketId } from '../types/socket';

const getRoomId = (socketId: string, connections: Map<string, UserConnection>): string | null => {
  const connection = connections.get(socketId);
  if (!connection || !connection.projectId) return null;
  
  if (connection.fileId) {
    return `project:${connection.projectId}:file:${connection.fileId}`;
  }
  
  return `project:${connection.projectId}`;
};

export function setupCodeEditorHandlers(
  io: Server,
  socket: Socket,
  activeConnections: Map<string, UserConnection>
) {
  socket.emit(SocketEvent.USER_ONLINE, { userId: socket.data.userId });
  
  socket.on(SocketEvent.JOIN_REQUEST, ({ projectId, username }) => {
    const projectRoom = `project:${projectId}`;
    const existingUsernames = Array.from(activeConnections.values())
      .filter(conn => conn.projectId === projectId && conn.username === username);
      
    if (existingUsernames.length > 0) {
      socket.emit(SocketEvent.USERNAME_EXISTS);
      return;
    }
    socket.join(projectRoom);
    socket.emit(SocketEvent.JOIN_ACCEPTED, { projectId });
    
    socket.to(projectRoom).emit(SocketEvent.USER_JOINED, {
      userId: socket.data.userId,
      username: socket.data.username
    });
  });
  
  socket.on('code:join', async ({ projectId, fileId }) => {
    const roomId = `project:${projectId}:file:${fileId}`;
    socket.join(roomId);
    const connection = activeConnections.get(socket.id);
    if (connection) {
      connection.projectId = projectId;
      connection.fileId = fileId;
      activeConnections.set(socket.id, connection);
    }
    
    const fileContent = await redis.get(`file:${fileId}:content`);
    
    socket.emit('code:init', {
      content: fileContent || '',
      fileId,
      projectId
    });
    
    socket.to(roomId).emit('user:joined', {
      userId: socket.data.userId,
      username: socket.data.username,
      timestamp: new Date()
    });
    const sockets = await io.in(roomId).fetchSockets();
    const users = sockets.map(s => ({
      userId: s.data.userId,
      username: s.data.username,
      cursorPosition: activeConnections.get(s.id)?.cursorPosition
    })).filter(u => u.userId !== socket.data.userId);
    
    socket.emit('room:users', { users });
  });
  
  socket.on('code:change', async ({ projectId, fileId, content, delta, version }) => {
    const roomId = `project:${projectId}:file:${fileId}`;
    
    await redis.set(`file:${fileId}:content`, content, { ex: 86400 });
    
    socket.to(roomId).emit('code:update', {
      delta,
      version,
      userId: socket.data.userId,
      username: socket.data.username
    });
  });
  
  socket.on('cursor:update', ({ projectId, fileId, position }) => {
    const roomId = `project:${projectId}:file:${fileId}`;
    
    const connection = activeConnections.get(socket.id);
    if (connection) {
      connection.cursorPosition = position;
      activeConnections.set(socket.id, connection);
    }
    
    socket.to(roomId).emit('cursor:update', {
      userId: socket.data.userId,
      username: socket.data.username,
      position
    });
  });
  
  socket.on('code:leave', ({ projectId, fileId }) => {
    const roomId = `project:${projectId}:file:${fileId}`;
    socket.leave(roomId);
    
    socket.to(roomId).emit('user:left', {
      userId: socket.data.userId,
      username: socket.data.username
    });
  });

  socket.on(SocketEvent.SYNC_FILE_STRUCTURE, ({ fileStructure, openFiles, activeFile, socketId }) => {
    io.to(socketId).emit(SocketEvent.SYNC_FILE_STRUCTURE, {
      fileStructure,
      openFiles,
      activeFile,
    });
  });
  
  socket.on(SocketEvent.DIRECTORY_CREATED, ({ parentDirId, newDirectory }) => {
    const roomId = getRoomId(socket.id, activeConnections);
    if (!roomId) return;
    socket.to(roomId).emit(SocketEvent.DIRECTORY_CREATED, {
      parentDirId,
      newDirectory,
    });
  });

  socket.on(SocketEvent.DIRECTORY_UPDATED, ({ dirId, children }) => {
    const roomId = getRoomId(socket.id, activeConnections);
    if (!roomId) return;
    socket.to(roomId).emit(SocketEvent.DIRECTORY_UPDATED, {
      dirId,
      children,
    });
  });

  socket.on(SocketEvent.DIRECTORY_RENAMED, ({ dirId, newName }) => {
    const roomId = getRoomId(socket.id, activeConnections);
    if (!roomId) return;
    socket.to(roomId).emit(SocketEvent.DIRECTORY_RENAMED, {
      dirId,
      newName,
    });
  });

  socket.on(SocketEvent.DIRECTORY_DELETED, ({ dirId }) => {
    const roomId = getRoomId(socket.id, activeConnections);
    if (!roomId) return;
    socket.to(roomId).emit(SocketEvent.DIRECTORY_DELETED, { dirId });
  });

  socket.on(SocketEvent.FILE_CREATED, ({ parentDirId, newFile }) => {
    const roomId = getRoomId(socket.id, activeConnections);
    if (!roomId) return;
    socket.to(roomId).emit(SocketEvent.FILE_CREATED, { parentDirId, newFile });
  });

  socket.on(SocketEvent.FILE_UPDATED, async ({ fileId, newContent }) => {
    const roomId = getRoomId(socket.id, activeConnections);
    if (!roomId) return;
    await redis.set(`file:${fileId}:content`, newContent, { ex: 86400 });
    
    socket.to(roomId).emit(SocketEvent.FILE_UPDATED, {
      fileId,
      newContent,
    });
  });

  socket.on(SocketEvent.FILE_RENAMED, ({ fileId, newName }) => {
    const roomId = getRoomId(socket.id, activeConnections);
    if (!roomId) return;
    socket.to(roomId).emit(SocketEvent.FILE_RENAMED, {
      fileId,
      newName,
    });
  });

  socket.on(SocketEvent.FILE_DELETED, ({ fileId }) => {
    const roomId = getRoomId(socket.id, activeConnections);
    if (!roomId) return;
    socket.to(roomId).emit(SocketEvent.FILE_DELETED, { fileId });
  });

}