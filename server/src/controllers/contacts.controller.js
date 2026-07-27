import prisma from '../config/db.js';

// Search for users by email or name (excluding self)
export async function searchUsers(req, res, next) {
  try {
    const currentUserId = req.user.id;
    const { query } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters.' });
    }

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: currentUserId } },
          {
            OR: [
              { email: { contains: query.toLowerCase(), mode: 'insensitive' } },
              { name: { contains: query, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        about: true,
        avatarUrl: true,
        isOnline: true,
        lastSeen: true,
      },
      take: 10,
    });

    res.json({ users });
  } catch (err) {
    next(err);
  }
}

// Get all contacts for the current user
export async function getContacts(req, res, next) {
  try {
    const currentUserId = req.user.id;

    const contacts = await prisma.contact.findMany({
      where: { userId: currentUserId },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
            about: true,
            avatarUrl: true,
            isOnline: true,
            lastSeen: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedContacts = contacts.map((c) => ({
      id: c.id,
      nickname: c.nickname,
      isBlocked: c.isBlocked,
      createdAt: c.createdAt,
      user: c.contact,
    }));

    res.json({ contacts: formattedContacts });
  } catch (err) {
    next(err);
  }
}

// Add a new contact
export async function addContact(req, res, next) {
  try {
    const currentUserId = req.user.id;
    const { contactId, nickname } = req.body;

    if (!contactId) {
      return res.status(400).json({ error: 'Contact ID is required.' });
    }

    // Check if user exists
    const contactUser = await prisma.user.findUnique({
      where: { id: contactId },
      select: { id: true, name: true, email: true },
    });

    if (!contactUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Check if already a contact
    const existing = await prisma.contact.findUnique({
      where: {
        userId_contactId: { userId: currentUserId, contactId },
      },
    });

    if (existing) {
      return res.status(409).json({ error: 'User is already in your contacts.' });
    }

    // Create contact
    const contact = await prisma.contact.create({
      data: {
        userId: currentUserId,
        contactId,
        nickname: nickname || null,
      },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
            about: true,
            avatarUrl: true,
            isOnline: true,
            lastSeen: true,
          },
        },
      },
    });

    res.status(201).json({
      contact: {
        id: contact.id,
        nickname: contact.nickname,
        isBlocked: contact.isBlocked,
        createdAt: contact.createdAt,
        user: contact.contact,
      },
    });
  } catch (err) {
    next(err);
  }
}

// Update a contact (nickname, block/unblock)
export async function updateContact(req, res, next) {
  try {
    const currentUserId = req.user.id;
    const { contactId } = req.params;
    const { nickname, isBlocked } = req.body;

    const contact = await prisma.contact.findFirst({
      where: { id: contactId, userId: currentUserId },
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found.' });
    }

    const updated = await prisma.contact.update({
      where: { id: contactId },
      data: {
        ...(nickname !== undefined && { nickname }),
        ...(isBlocked !== undefined && { isBlocked }),
      },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
            about: true,
            avatarUrl: true,
            isOnline: true,
            lastSeen: true,
          },
        },
      },
    });

    res.json({
      contact: {
        id: updated.id,
        nickname: updated.nickname,
        isBlocked: updated.isBlocked,
        createdAt: updated.createdAt,
        user: updated.contact,
      },
    });
  } catch (err) {
    next(err);
  }
}

// Remove a contact
export async function removeContact(req, res, next) {
  try {
    const currentUserId = req.user.id;
    const { contactId } = req.params;

    const contact = await prisma.contact.findFirst({
      where: { id: contactId, userId: currentUserId },
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found.' });
    }

    await prisma.contact.delete({
      where: { id: contactId },
    });

    res.json({ message: 'Contact removed successfully.' });
  } catch (err) {
    next(err);
  }
}
