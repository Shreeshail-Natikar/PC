import jwt from 'jsonwebtoken';

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
  );
}

export function signRefreshToken(user, rememberMe = false) {
  const expiresIn = rememberMe
    ? process.env.JWT_REFRESH_EXPIRES_REMEMBER || '90d'
    : process.env.JWT_REFRESH_EXPIRES || '30d';
  return jwt.sign({ sub: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}
