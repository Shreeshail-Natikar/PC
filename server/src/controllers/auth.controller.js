import bcrypt from 'bcrypt';
import prisma from '../config/db.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt.js';

const SALT_ROUNDS = 12;
const MAX_USERS = Number(process.env.MAX_USERS || 2);

function sanitizeUser(user) {
  const { password, refreshToken, ...safe } = user;
  return safe;
}

function refreshCookieOptions(rememberMe) {
  const maxAgeMs = rememberMe
    ? 90 * 24 * 60 * 60 * 1000 // 90 days
    : 30 * 24 * 60 * 60 * 1000; // 30 days
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: maxAgeMs,
    path: '/api/auth',
  };
}

export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    const userCount = await prisma.user.count();
    if (userCount >= MAX_USERS) {
      return res.status(403).json({
        error: 'Registration is closed. This app is limited to two accounts.',
      });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: { name, email, password: hashed },
    });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user, false);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    res.cookie('refreshToken', refreshToken, refreshCookieOptions(false));
    res.status(201).json({ user: sanitizeUser(user), accessToken });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password, rememberMe } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user, !!rememberMe);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken, isOnline: true },
    });

    res.cookie('refreshToken', refreshToken, refreshCookieOptions(!!rememberMe));
    res.json({ user: sanitizeUser(user), accessToken });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ error: 'No refresh token provided.' });
    }

    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      return res.status(401).json({ error: 'Refresh token invalid or expired.' });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.refreshToken !== token) {
      return res.status(401).json({ error: 'Refresh token invalid or expired.' });
    }

    const accessToken = signAccessToken(user);
    res.json({ accessToken, user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      try {
        const payload = verifyRefreshToken(token);
        await prisma.user.update({
          where: { id: payload.sub },
          data: { refreshToken: null, isOnline: false, lastSeen: new Date() },
        });
      } catch {
        // token already invalid/expired — nothing to clean up server-side
      }
    }
    res.clearCookie('refreshToken', { path: '/api/auth' });
    res.json({ message: 'Logged out.' });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res) {
  res.json({ user: req.user });
}
