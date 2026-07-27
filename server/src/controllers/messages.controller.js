import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../..');

export async function getMessages(req, res, next) {
  try {
    const currentUserId = req.user.id;
    const receiverId = req.query.receiverId || req.query.contactId;

    const [user, partner] = await Promise.all([
      prisma.user.findUnique({ where: { id: currentUserId }, select: { chatClearedAt: true } }),
      receiverId
        ? prisma.user.findUnique({ where: { id: receiverId } })
        : prisma.user.findFirst({ where: { id: { not: currentUserId } } }),
    ]);

    if (!partner) {
      return res.json({ messages: [], chatClearedAt: user?.chatClearedAt || null });
    }

    const where = {
      OR: [
        { senderId: currentUserId, receiverId: partner.id },
        { senderId: partner.id, receiverId: currentUserId },
      ],
    };

    if (user?.chatClearedAt) {
      where.createdAt = { gt: user.chatClearedAt };
    }

    const messages = await prisma.message.findMany({
      where,
      include: {
        replyTo: {
          select: {
            id: true,
            content: true,
            type: true,
            senderId: true,
          },
        },
        reactions: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ messages, chatClearedAt: user?.chatClearedAt || null });
  } catch (err) {
    next(err);
  }
}

export async function sendMessage(req, res, next) {
  try {
    const senderId = req.user.id;
    const {
      receiverId,
      content,
      type = 'TEXT',
      mediaUrl,
      mediaMimeType,
      mediaSize,
      waveform,
      replyToId,
      forwardedFrom,
    } = req.body;

    let targetReceiverId = receiverId;

    if (!targetReceiverId) {
      const partner = await prisma.user.findFirst({
        where: { id: { not: senderId } },
      });
      if (!partner) {
        return res.status(400).json({ error: 'No recipient registered yet.' });
      }
      targetReceiverId = partner.id;
    }

    const message = await prisma.message.create({
      data: {
        senderId,
        receiverId: targetReceiverId,
        type,
        content,
        mediaUrl,
        mediaMimeType,
        mediaSize,
        waveform: waveform ? JSON.stringify(waveform) : null,
        replyToId,
        forwardedFrom,
        status: 'SENT',
      },
      include: {
        replyTo: {
          select: {
            id: true,
            content: true,
            type: true,
            senderId: true,
          },
        },
        reactions: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
    });

    res.status(201).json({ message });
  } catch (err) {
    next(err);
  }
}

export async function updateMessage(req, res, next) {
  try {
    const currentUserId = req.user.id;
    const { id } = req.params;
    const { content } = req.body;

    const message = await prisma.message.findUnique({ where: { id } });
    if (!message) {
      return res.status(404).json({ error: 'Message not found.' });
    }

    if (message.senderId !== currentUserId) {
      return res.status(403).json({ error: 'You can only edit your own messages.' });
    }

    const updated = await prisma.message.update({
      where: { id },
      data: { content, isEdited: true },
      include: {
        replyTo: {
          select: { id: true, content: true, type: true, senderId: true },
        },
        reactions: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });

    res.json({ message: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteMessage(req, res, next) {
  try {
    const currentUserId = req.user.id;
    const { id } = req.params;

    const message = await prisma.message.findUnique({ where: { id } });
    if (!message) {
      return res.status(404).json({ error: 'Message not found.' });
    }

    if (message.senderId !== currentUserId) {
      return res.status(403).json({ error: 'You can only delete your own messages.' });
    }

    if (message.mediaUrl) {
      const filePath = path.join(PROJECT_ROOT, 'server', message.mediaUrl);
      fs.unlink(filePath, (err) => {
        if (err) console.warn('Could not delete media file:', message.mediaUrl, err);
      });
    }

    const updated = await prisma.message.update({
      where: { id },
      data: {
        isDeleted: true,
        content: 'This message was deleted',
        mediaUrl: null,
        mediaMimeType: null,
        mediaSize: null,
        waveform: null,
      },
      include: {
        replyTo: {
          select: { id: true, content: true, type: true, senderId: true },
        },
        reactions: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });

    res.json({ message: updated });
  } catch (err) {
    next(err);
  }
}

export async function toggleReaction(req, res, next) {
  try {
    const userId = req.user.id;
    const { id: messageId } = req.params;
    const { emoji } = req.body;

    const existing = await prisma.reaction.findUnique({
      where: {
        messageId_userId: { messageId, userId },
      },
    });

    if (existing) {
      if (existing.emoji === emoji) {
        // Remove reaction if same emoji toggled
        await prisma.reaction.delete({
          where: { id: existing.id },
        });
      } else {
        // Change emoji
        await prisma.reaction.update({
          where: { id: existing.id },
          data: { emoji },
        });
      }
    } else {
      // Create reaction
      await prisma.reaction.create({
        data: { messageId, userId, emoji },
      });
    }

    const updatedMessage = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        replyTo: {
          select: { id: true, content: true, type: true, senderId: true },
        },
        reactions: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });

    res.json({ message: updatedMessage });
  } catch (err) {
    next(err);
  }
}

export async function markAsRead(req, res, next) {
  try {
    const currentUserId = req.user.id;

    const now = new Date();
    await prisma.message.updateMany({
      where: {
        receiverId: currentUserId,
        status: { in: ['SENT', 'DELIVERED'] },
      },
      data: {
        status: 'READ',
        readAt: now,
      },
    });

    res.json({ message: 'Marked as read.', readAt: now });
  } catch (err) {
    next(err);
  }
}

export async function clearChat(req, res, next) {
  try {
    const currentUserId = req.user.id;
    const now = new Date();

    await prisma.user.update({
      where: { id: currentUserId },
      data: { chatClearedAt: now },
    });

    res.json({ clearedAt: now });
  } catch (err) {
    next(err);
  }
}
