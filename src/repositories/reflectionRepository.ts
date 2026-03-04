import { prisma } from '../config/database';

export async function findByDate(userId: string, date: Date) {
    return prisma.dailyReflection.findUnique({
        where: { userId_date: { userId, date } }
    });
}

export async function findAll(userId: string) {
    return prisma.dailyReflection.findMany({
        where: { userId },
        orderBy: { date: 'desc' }
    });
}

export async function upsert(data: {
    userId: string;
    date: Date;
    content: string;
    mood?: string;
}) {
    return prisma.dailyReflection.upsert({
        where: { userId_date: { userId: data.userId, date: data.date } },
        update: {
            content: data.content,
            mood: data.mood,
        },
        create: data,
    });
}
