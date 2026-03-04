import { prisma } from '../config/database';
import { TaskStatus } from '../types';

// Task repository — only DB queries, no business logic

export async function getUserTasks(userId: string, filters?: {
    status?: TaskStatus;
    category?: string;
}) {
    return prisma.task.findMany({
        where: { userId, ...filters },
        orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
    });
}

export async function findTaskById(id: string, userId: string) {
    return prisma.task.findFirst({ where: { id, userId } });
}

export async function createTask(data: {
    userId: string;
    title: string;
    description?: string;
    category?: string;
    isRecurring?: boolean;
    recurrenceRule?: any;
    dueDate?: Date;
}) {
    return prisma.task.create({ data });
}

export async function updateTask(id: string, data: Partial<{
    title: string;
    description: string;
    category: string;
    status: TaskStatus;
    isRecurring: boolean;
    recurrenceRule: any;
    dueDate: Date;
    doneAt: Date;
}>) {
    return prisma.task.update({ where: { id }, data: data as any });
}

export async function deleteTask(id: string) {
    return prisma.task.delete({ where: { id } });
}

export async function getTasksForDateRange(userId: string, from: Date, to: Date) {
    return prisma.task.findMany({
        where: {
            userId,
            OR: [
                { dueDate: { gte: from, lte: to } },
                { isRecurring: true },
            ],
        },
        orderBy: { createdAt: 'desc' },
    });
}

export async function getDoneTasksInRange(userId: string, from: Date, to: Date) {
    return prisma.task.findMany({
        where: {
            userId,
            status: 'DONE',
            doneAt: { gte: from, lte: to },
        },
    });
}
