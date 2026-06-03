import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let ioInstance = null;

export function getUserRoom(userId) {
  return `user:${userId}`;
}

export function getArenaMatchRoom(matchId) {
  return `arena:match:${matchId}`;
}

export function initSocket(server) {
  if (ioInstance) return ioInstance;
  ioInstance = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true
    }
  });

  ioInstance.on('connection', (socket) => {
    socket.emit('chat:message', { text: 'Connected to Crypto Simulator live room.' });

    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded?.id) {
          socket.data.userId = String(decoded.id);
          socket.join(getUserRoom(decoded.id));
        }
      } catch {
        // ignore invalid socket auth and continue with anonymous access
      }
    }

    socket.on('user:join', ({ userId }) => {
      if (userId) {
        socket.join(getUserRoom(userId));
      }
    });

    socket.on('arena:join', ({ matchId }) => {
      if (matchId) {
        socket.join(getArenaMatchRoom(matchId));
      }
    });

    socket.on('arena:leave', ({ matchId }) => {
      if (matchId) {
        socket.leave(getArenaMatchRoom(matchId));
      }
    });

    socket.on('chat:message', (message) => {
      ioInstance.emit('chat:message', message);
    });

    socket.on('learning:complete', (payload) => {
      ioInstance.emit('learning:complete', payload);
    });
  });

  return ioInstance;
}

export function getIo() {
  return ioInstance;
}