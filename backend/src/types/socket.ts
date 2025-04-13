import { Socket } from 'socket.io';

export enum SocketEvent {
  JOIN_REQUEST = "join-request",
  JOIN_ACCEPTED = "join-accepted",
  USER_JOINED = "user-joined",
  USER_DISCONNECTED = "user-disconnected",
  SYNC_FILE_STRUCTURE = "sync-file-structure",
  DIRECTORY_CREATED = "directory-created",
  DIRECTORY_UPDATED = "directory-updated",
  DIRECTORY_RENAMED = "directory-renamed",
  DIRECTORY_DELETED = "directory-deleted",
  FILE_CREATED = "file-created",
  FILE_UPDATED = "file-updated",
  FILE_RENAMED = "file-renamed",
  FILE_DELETED = "file-deleted",
  USER_OFFLINE = "offline",
  USER_ONLINE = "online",
  SEND_MESSAGE = "send-message",
  RECEIVE_MESSAGE = "receive-message",
  TYPING_START = "typing-start",
  TYPING_PAUSE = "typing-pause",
  USERNAME_EXISTS = "username-exists",
  REQUEST_DRAWING = "request-drawing",
  SYNC_DRAWING = "sync-drawing",
  DRAWING_UPDATE = "drawing-update",
  JOIN_DRAWING_ROOM = "join-drawing-room",
  LEAVE_DRAWING_ROOM = "leave-drawing-room"
}

export interface CursorPosition {
  line: number;
  ch: number;
}

export interface UserConnection {
  userId: string;
  username: string;
  socketId: string;
  projectId?: string;
  fileId?: string;
  cursorPosition?: CursorPosition;
  isOnline?: boolean;
  typing?: boolean;  // Add this property for typing indicator
}

export interface SocketContext {
  socket: Socket;
}

export type SocketId = string;
