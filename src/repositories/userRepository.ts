import { prisma } from '../config/database';

// User repository — only DB queries, no business logic

export async function findUserByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
}

export async function findUserById(id: string) {
    return prisma.user.findUnique({ where: { id } });
}

export async function createUser(data: {
    email: string;
    passwordHash: string;
    name: string;
}) {
    return prisma.user.create({ data });
}

export async function saveRefreshToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
}) {
    return prisma.refreshToken.create({ data });
}

export async function findRefreshToken(tokenHash: string) {
    return prisma.refreshToken.findFirst({
        where: { tokenHash, revoked: false },
    });
}

export async function revokeRefreshToken(id: string) {
    return prisma.refreshToken.update({
        where: { id },
        data: { revoked: true },
    });
}

export async function revokeAllUserTokens(userId: string) {
    return prisma.refreshToken.updateMany({
        where: { userId, revoked: false },
        data: { revoked: true },
    });
}
