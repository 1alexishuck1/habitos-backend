import { prisma } from '../config/database';

// ─── User search ─────────────────────────────────────────────────────────────

export async function searchUsersByName(query: string, excludeUserId: string) {
    return prisma.user.findMany({
        where: {
            id: { not: excludeUserId },
            name: { contains: query, mode: 'insensitive' },
        },
        select: { id: true, name: true, avatarUrl: true },
        take: 20,
    });
}

// ─── Friend requests ─────────────────────────────────────────────────────────

export async function findExistingRequest(senderId: string, receiverId: string) {
    return prisma.friendRequest.findFirst({
        where: {
            OR: [
                { senderId, receiverId },
                { senderId: receiverId, receiverId: senderId },
            ],
        },
    });
}

export async function createRequest(senderId: string, receiverId: string) {
    return prisma.friendRequest.create({
        data: { senderId, receiverId },
        include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
    });
}

export async function findRequestById(id: string) {
    return prisma.friendRequest.findUnique({ where: { id } });
}

export async function updateRequestStatus(id: string, status: 'PENDING' | 'ACCEPTED' | 'REJECTED') {
    return prisma.friendRequest.update({ where: { id }, data: { status } });
}

export async function listPendingRequests(userId: string) {
    return prisma.friendRequest.findMany({
        where: { receiverId: userId, status: 'PENDING' },
        include: { sender: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
    });
}

// ─── Friendships ─────────────────────────────────────────────────────────────

export async function areFriends(userId: string, friendId: string) {
    const [a, b] = [userId, friendId].sort();
    const f = await prisma.friendship.findFirst({
        where: { userAId: a, userBId: b },
    });
    return !!f;
}

export async function createFriendship(userAId: string, userBId: string) {
    // Normalize order so the @@unique constraint works correctly
    const [a, b] = [userAId, userBId].sort();
    return prisma.friendship.create({ data: { userAId: a, userBId: b } });
}

export async function deleteFriendship(userId: string, friendId: string) {
    const [a, b] = [userId, friendId].sort();
    // Delete the friendship row
    await prisma.friendship.deleteMany({
        where: { userAId: a, userBId: b },
    });
    // Also clean up any accepted/pending request between them
    await prisma.friendRequest.deleteMany({
        where: {
            OR: [
                { senderId: userId, receiverId: friendId },
                { senderId: friendId, receiverId: userId },
            ],
        },
    });
}

export async function listFriends(userId: string) {
    const rows = await prisma.friendship.findMany({
        where: { OR: [{ userAId: userId }, { userBId: userId }] },
        include: {
            userA: { select: { id: true, name: true, avatarUrl: true } },
            userB: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
    });

    return rows.map((f: typeof rows[0]) => ({
        friendshipId: f.id,
        since: f.createdAt,
        friend: f.userAId === userId ? f.userB : f.userA,
    }));
}

// ─── Friend stats ─────────────────────────────────────────────────────────────

export async function getFriendStats(friendId: string) {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const habits = await prisma.habit.findMany({
        where: { userId: friendId, isArchived: false },
        select: { maxStreak: true },
    });
    const maxStreak = habits.reduce((acc, h) => Math.max(acc, h.maxStreak), 0);

    const tasksDone7d = await prisma.task.count({
        where: {
            userId: friendId,
            status: 'DONE',
            doneAt: { gte: sevenDaysAgo },
        },
    });

    const habitsCompleted7d = await prisma.habitDailySnapshot.count({
        where: {
            userId: friendId,
            completed: true,
            date: { gte: sevenDaysAgo },
        },
    });

    return { maxStreak, tasksDone7d, habitsCompleted7d };
}

import { todayInArg, argDateToUtc } from '../utils/date';

// ─── Friend activity feed ─────────────────────────────────────────────────────

export async function getFriendActivity(friendId: string, limit = 25) {
    const todayStr = todayInArg();
    const startOfToday = argDateToUtc(todayStr); // 00:00:00 UTC
    const endOfToday = new Date(startOfToday);
    endOfToday.setUTCHours(23, 59, 59, 999);

    // Last habit logs with habit name - limited to today
    const habitLogs = await prisma.habitLog.findMany({
        where: {
            userId: friendId,
            date: { gte: startOfToday, lte: endOfToday }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: { habit: { select: { name: true, type: true } } },
    });

    // Last completed tasks - limited to today
    const tasks = await prisma.task.findMany({
        where: {
            userId: friendId,
            status: 'DONE',
            doneAt: { gte: startOfToday, lte: endOfToday }
        },
        orderBy: { doneAt: 'desc' },
        take: limit,
        select: { id: true, title: true, category: true, doneAt: true },
    });

    // Normalize into a unified shape
    type ActivityItem = {
        id: string;
        type: 'habit' | 'task';
        name: string;
        category?: string;
        habitType?: string;
        value?: number;
        timestamp: Date;
    };

    const habitItems: ActivityItem[] = habitLogs.map((log) => ({
        id: log.id,
        type: 'habit',
        name: log.habit.name,
        habitType: log.habit.type,
        value: log.value,
        timestamp: log.createdAt,
    }));

    const taskItems: ActivityItem[] = tasks.map((t) => ({
        id: t.id,
        type: 'task',
        name: t.title,
        category: t.category,
        timestamp: t.doneAt!,
    }));

    // Merge & sort descending
    return [...habitItems, ...taskItems]
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);
}

// ─── Direct Messages (Motivations) ──────────────────────────────────────────

export async function createMessage(senderId: string, receiverId: string, message: string) {
    return prisma.friendMessage.create({
        data: { senderId, receiverId, message },
        include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
    });
}

export async function getUnreadMessages(userId: string) {
    return prisma.friendMessage.findMany({
        where: { receiverId: userId, isRead: false },
        include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
    });
}

export async function markMessagesAsRead(messageIds: string[]) {
    return prisma.friendMessage.updateMany({
        where: { id: { in: messageIds } },
        data: { isRead: true },
    });
}

export async function getChatHistory(userAId: string, userBId: string, limit = 50) {
    return prisma.friendMessage.findMany({
        where: {
            OR: [
                { senderId: userAId, receiverId: userBId },
                { senderId: userBId, receiverId: userAId },
            ]
        },
        include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: 'asc' }, // older messages first for chat view
        take: limit, // in real app, might want pagination but 50 is fine for this context
    });
}
