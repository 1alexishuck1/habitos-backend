import { PrismaClient } from '@prisma/client';

// Singleton Prisma instance
export const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

// Enforcing type reload
export type PrismaInstanceType = typeof prisma;
