import { prisma } from '../config/database'; // updated Types

// User repository — only DB queries, no business logic

export async function findUserByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
}

export async function findUserById(id: string) {
    return prisma.user.findUnique({ where: { id } });
}

export async function deleteUser(id: string) {
    return prisma.user.delete({ where: { id } });
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

export async function addExperience(userId: string, amount: number, reason: string, logDate?: Date) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;

    const newExp = user.experience + amount;
    const newLevel = Math.floor(newExp / 100) + 1;

    const [updatedUser] = await prisma.$transaction([
        prisma.user.update({
            where: { id: userId },
            data: { experience: newExp, level: newLevel },
        }),
        prisma.experienceLog.create({
            data: { userId, amount, reason, ...(logDate ? { createdAt: logDate } : {}) },
        }),
    ]);

    return updatedUser;
}

export async function removeExperience(userId: string, amount: number, reason: string, logDate?: Date) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;

    const newExp = Math.max(0, user.experience - amount);
    const newLevel = Math.floor(newExp / 100) + 1;

    // Find the latest experience log for this reason and amount
    const log = await prisma.experienceLog.findFirst({
        where: { userId, reason, amount, ...(logDate ? { createdAt: logDate } : {}) },
        orderBy: { createdAt: 'desc' }
    });

    const ops: any[] = [
        prisma.user.update({
            where: { id: userId },
            data: { experience: newExp, level: newLevel },
        })
    ];

    if (log) {
        ops.push(prisma.experienceLog.delete({ where: { id: log.id } }));
    }

    const [updatedUser] = await prisma.$transaction(ops);
    return updatedUser;
}

export async function updateUser(id: string, data: { name?: string }) {
    return prisma.user.update({
        where: { id },
        data,
    });
}

export async function getProfileStats(userId: string) {
    const [friendsA, friendsB, habitsTotal, tasksDone] = await Promise.all([
        prisma.friendship.count({ where: { userAId: userId } }),
        prisma.friendship.count({ where: { userBId: userId } }),
        prisma.habit.count({ where: { userId, isArchived: false } }),
        prisma.task.count({ where: { userId, status: 'DONE' } }),
    ]);

    return {
        friendsCount: friendsA + friendsB,
        habitsDoneCount: habitsTotal,
        tasksDoneCount: tasksDone,
    };
}

export async function getFriendshipStatus(userId: string, targetId: string) {
    const [friendship, requestSent, requestReceived] = await Promise.all([
        prisma.friendship.findFirst({
            where: {
                OR: [
                    { userAId: userId, userBId: targetId },
                    { userAId: targetId, userBId: userId },
                ],
            },
        }),
        prisma.friendRequest.findFirst({
            where: { senderId: userId, receiverId: targetId, status: 'PENDING' },
        }),
        prisma.friendRequest.findFirst({
            where: { senderId: targetId, receiverId: userId, status: 'PENDING' },
        }),
    ]);

    if (friendship) return 'FRIENDS';
    if (requestSent) return 'REQUEST_SENT';
    if (requestReceived) return 'REQUEST_RECEIVED';
    return 'NONE';
}

export async function getExperienceLogs(userId: string) {
    return prisma.experienceLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
    });
}
