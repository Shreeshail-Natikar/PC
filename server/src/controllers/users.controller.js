import prisma from '../config/db.js';

export async function getPartner(req, res, next) {
  try {
    const currentUserId = req.user.id;

    // In a 2-user private chat, find the user that is not the requester
    const partner = await prisma.user.findFirst({
      where: {
        id: { not: currentUserId },
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
    });

    res.json({ partner });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const currentUserId = req.user.id;
    const { name, about, avatarUrl } = req.body;

    const updated = await prisma.user.update({
      where: { id: currentUserId },
      data: {
        ...(name && { name }),
        ...(about !== undefined && { about }),
        ...(avatarUrl !== undefined && { avatarUrl }),
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
    });

    res.json({ user: updated });
  } catch (err) {
    next(err);
  }
}
