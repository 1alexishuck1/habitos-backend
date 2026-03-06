import { prisma } from '../config/database';
import { createError } from '../middlewares/errorHandler';
import { Prisma } from '@prisma/client';

export async function getProfile(userId: string) {
    return prisma.smokeProfile.findUnique({
        where: { userId }
    });
}

export async function createProfile(userId: string, data: {
    cigarettesPerDay: number;
    yearsSmoking: number;
    pricePerPack: number;
    cigPerPack: number;
    strategy: 'COLD_TURKEY' | 'GRADUAL';
    mainMotivation: string;
}) {
    // Si la estrategia es GRADUAL, creamos un plan simple a 6 semanas.
    // Ej: Bajar 1/6 cada semana (o similar, acá hacemos algo básico: 15, 10, 5, 0)
    let gradualPlan = null;
    let currentDailyLimit = null;

    if (data.strategy === 'GRADUAL') {
        const step = Math.ceil(data.cigarettesPerDay / 4); // Reducción en 4 pasos
        gradualPlan = [
            { week: 1, limit: Math.max(0, data.cigarettesPerDay - step) },
            { week: 2, limit: Math.max(0, data.cigarettesPerDay - step * 2) },
            { week: 3, limit: Math.max(0, data.cigarettesPerDay - step * 3) },
            { week: 4, limit: 0 }
        ];
        currentDailyLimit = gradualPlan[0].limit;
    }

    return prisma.smokeProfile.upsert({
        where: { userId },
        update: {
            ...data,
            currentDailyLimit,
            gradualPlan: gradualPlan ? (gradualPlan as any) : Prisma.JsonNull,
            startDate: new Date(), // Reiniciar el conteo
        },
        create: {
            userId,
            ...data,
            currentDailyLimit,
            gradualPlan: gradualPlan ? (gradualPlan as any) : Prisma.JsonNull,
        }
    });
}

export async function registerLog(userId: string, data: {
    quantity: number;
    trigger?: string;
    comment?: string;
}) {
    const profile = await prisma.smokeProfile.findUnique({ where: { userId } });
    if (!profile) throw createError('Perfil de humo no encontrado', 404);

    return prisma.smokeLog.create({
        data: {
            userId,
            quantity: data.quantity,
            trigger: data.trigger as any,
            comment: data.comment,
        }
    });
}

export async function registerCraving(userId: string, data: {
    resisted: boolean;
    trigger?: string;
}) {
    const profile = await prisma.smokeProfile.findUnique({ where: { userId } });
    if (!profile) throw createError('Perfil de humo no encontrado', 404);

    return prisma.smokeCraving.create({
        data: {
            userId,
            resisted: data.resisted,
            trigger: data.trigger as any,
        }
    });
}

export async function getDashboardStats(userId: string) {
    const profile = await prisma.smokeProfile.findUnique({ where: { userId } });
    if (!profile) return null; // No configurado aún

    const logs = await prisma.smokeLog.findMany({ where: { userId } });
    const cravings = await prisma.smokeCraving.findMany({ where: { userId } });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const logsToday = logs.filter(l => l.registeredAt >= todayStart);
    const smokedToday = logsToday.reduce((sum, l) => sum + l.quantity, 0);

    const avoidedTodayCravings = cravings.filter(c => c.registeredAt >= todayStart && c.resisted).length;

    // Calcular días desde inicio
    const msSinceStart = new Date().getTime() - profile.startDate.getTime();
    const daysSinceStart = Math.floor(msSinceStart / (1000 * 60 * 60 * 24));

    // Si es COLD_TURKEY, contamos los días sin fumar desde el ÚLTIMO log
    let smokeFreeDays = daysSinceStart;
    if (logs.length > 0) {
        const lastLogDate = logs[logs.length - 1].registeredAt;
        const msSinceLastLog = new Date().getTime() - lastLogDate.getTime();
        smokeFreeDays = Math.floor(msSinceLastLog / (1000 * 60 * 60 * 24));
    }

    // Cigarrillos evitados en total: (Días * Promedio Diario) - Fumados
    const expectedSmoked = (daysSinceStart + 1) * profile.cigarettesPerDay; // +1 para incluir el día de hoy
    const actualSmoked = logs.reduce((sum, l) => sum + l.quantity, 0);
    const avoidedTotal = Math.max(0, expectedSmoked - actualSmoked);

    // Dinero ahorrado
    const moneySaved = avoidedTotal * (profile.pricePerPack / profile.cigPerPack);

    return {
        profile,
        stats: {
            daysSinceStart,
            smokeFreeDays, // Racha actual
            avoidedTotal,
            moneySaved: Math.round(moneySaved * 100) / 100, // 2 decimales
            smokedToday,
            avoidedTodayCravings,
            totalLogs: logs.length,
            totalCravingsResisted: cravings.filter(c => c.resisted).length,
        }
    };
}
