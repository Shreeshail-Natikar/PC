import { Server } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt.js';
import prisma from '../config/db.js';

const onlineUsers = new Map();

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: true,
      credentials: true,
    },
    maxHttpBufferSize: 1e7,
    transports: ['websocket', 'polling'],
    allowEIO3: true,
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required.'));
      const payload = verifyAccessToken(token);
      socket.userId = payload.sub;
      next();
    } catch {
      next(new Error('Invalid or expired token.'));
    }
  });

  io.on('connection', async (socket) => {
    const { userId } = socket;

    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);

    if (onlineUsers.get(userId).size === 1) {
      await prisma.user.update({ where: { id: userId }, data: { isOnline: true } });
      socket.broadcast.emit('presence:update', { userId, isOnline: true });
    }

    socket.join(userId);

    // ---- Messaging Events ----
    socket.on('message:send', ({ toUserId, message }) => {
      io.to(toUserId).emit('message:new', { message });
    });

    socket.on('message:read', ({ toUserId, readAt }) => {
      io.to(toUserId).emit('message:read_update', { byUserId: userId, readAt });
    });

    socket.on('message:reaction', ({ toUserId, message }) => {
      io.to(toUserId).emit('message:reaction_update', { message });
      io.to(userId).emit('message:reaction_update', { message });
    });

    socket.on('message:edit', ({ toUserId, message }) => {
      io.to(toUserId).emit('message:edit_update', { message });
    });

    socket.on('message:delete', ({ toUserId, message }) => {
      io.to(toUserId).emit('message:delete_update', { message });
    });

    // ---- Typing Indicators ----
    socket.on('typing:start', ({ toUserId }) => {
      io.to(toUserId).emit('typing:start', { fromUserId: userId });
    });

    socket.on('typing:stop', ({ toUserId }) => {
      io.to(toUserId).emit('typing:stop', { fromUserId: userId });
    });

    // ---- Profile Updates ----
    socket.on('profile:update', ({ toUserId, user }) => {
      io.to(toUserId).emit('profile:updated', { user });
    });

    // ---- WebRTC Calling Events ----
    socket.on('call:invite', ({ toUserId, type, callerName }) => {
      io.to(toUserId).emit('call:incoming', { fromUserId: userId, type, callerName });
    });

    socket.on('call:answer', ({ toUserId }) => {
      io.to(toUserId).emit('call:accepted', { fromUserId: userId });
    });

    socket.on('call:reject', ({ toUserId }) => {
      io.to(toUserId).emit('call:rejected', { fromUserId: userId });
    });

    socket.on('call:end', ({ toUserId }) => {
      io.to(toUserId).emit('call:ended', { fromUserId: userId });
    });

    socket.on('call:signal', ({ toUserId, signal }) => {
      io.to(toUserId).emit('call:signal', { fromUserId: userId, signal });
    });

    socket.on('disconnect', async () => {
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(userId);
          const lastSeen = new Date();
          await prisma.user.update({
            where: { id: userId },
            data: { isOnline: false, lastSeen },
          });
          socket.broadcast.emit('presence:update', { userId, isOnline: false, lastSeen });
        }
      }
    });
  });

  return io;
}

export function isUserOnline(userId) {
  return onlineUsers.has(userId);
}
