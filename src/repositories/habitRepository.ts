import { prisma } from '../config/database';

// Habit repository — only DB queries, no business logic

export async function getHabitTemplates() {
    return prisma.habitTemplate.findMany({ orderBy: { category: 'asc' } });
}

export async function getUserHabits(userId: string) {
    return prisma.habit.findMany({
        where: { userId, isArchived: false },
        include: { template: true },
        orderBy: { createdAt: 'asc' },
    });
}

export async function findHabitById(id: string, userId: string) {
    return prisma.habit.findFirst({ where: { id, userId } });
}

export async function createHabit(data: {
    userId: string;
    templateId?: string;
    name: string;
    description?: string;
    type: string;
    goalValue?: number;
    frequencyType: string;
    frequencyDays: number[];
    category?: string;
}) {
    return prisma.habit.create({ data: data as any });
}

export async function updateHabit(id: string, data: Partial<{
    name: string;
    description: string;
    goalValue: number;
    frequencyType: string;
    frequencyDays: number[];
    isPaused: boolean;
    isArchived: boolean;
    maxStreak: number;
    category: string;
}>) {
    return prisma.habit.update({ where: { id }, data: data as any });
}

export async function createHabitLog(data: {
    habitId: string;
    userId: string;
    date: Date;
    value: number;
    comment?: string;
}) {
    return prisma.habitLog.create({ data });
}

export async function getLogsForHabitOnDate(habitId: string, date: Date) {
    return prisma.habitLog.findMany({ where: { habitId, date } });
}

export async function getHabitLogs(habitId: string, from?: Date, to?: Date) {
    return prisma.habitLog.findMany({
        where: {
            habitId,
            ...(from && to ? { date: { gte: from, lte: to } } : {}),
        },
        orderBy: { date: 'desc' },
    });
}

export async function upsertDailySnapshot(data: {
    habitId: string;
    userId: string;
    date: Date;
    totalValue: number;
    completed: boolean;
    comment?: string;
}) {
    return prisma.habitDailySnapshot.upsert({
        where: { habitId_date: { habitId: data.habitId, date: data.date } },
        update: {
            totalValue: data.totalValue,
            completed: data.completed,
            comment: data.comment,
        },
        create: data,
    });
}

export async function getSnapshotsInRange(habitId: string, from: Date, to: Date) {
    return prisma.habitDailySnapshot.findMany({
        where: { habitId, date: { gte: from, lte: to } },
        orderBy: { date: 'asc' },
    });
}

export async function getSnapshot(habitId: string, date: Date) {
    return prisma.habitDailySnapshot.findUnique({
        where: { habitId_date: { habitId, date } },
    });
}

export async function getTodaySnapshot(habitId: string, date: Date) {
    return prisma.habitDailySnapshot.findUnique({
        where: { habitId_date: { habitId, date } },
    });
}

export async function getAllSnapshotsForStreak(habitId: string) {
    return prisma.habitDailySnapshot.findMany({
        where: { habitId },
        orderBy: { date: 'desc' },
    });
}

export async function deleteHabit(id: string) {
    return prisma.habit.delete({ where: { id } });
}

export async function deleteLog(habitId: string, date: Date) {
    return prisma.habitLog.deleteMany({ where: { habitId, date } });
}

export async function deleteSnapshot(habitId: string, date: Date) {
    return prisma.habitDailySnapshot.delete({ where: { habitId_date: { habitId, date } } });
}
