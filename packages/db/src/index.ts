import { PrismaClient } from '@prisma/client';

export * from '@prisma/client';

// one client per process; dev servers that reload modules would otherwise open a pool each time
const g = globalThis as unknown as { __perroundPrisma?: PrismaClient };
export const prisma = g.__perroundPrisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') g.__perroundPrisma = prisma;
