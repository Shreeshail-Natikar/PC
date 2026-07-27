import { PrismaClient } from '@prisma/client';

// Reuse a single PrismaClient instance across the app (avoids exhausting
// Postgres connections in dev with hot-reload).
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

export default prisma;
