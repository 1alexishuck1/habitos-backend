import { prisma } from '../config/database';

type DayOfWeek = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

export const gymService = {

    /** List all configured days for a user (with exercises sorted by order) */
    async listDays(userId: string) {
        return prisma.workoutDay.findMany({
            where: { userId },
            include: {
                exercises: { orderBy: { order: 'asc' } },
            },
            orderBy: { dayOfWeek: 'asc' },
        });
    },

    /** Get a single day with exercises */
    async getDay(userId: string, dayOfWeek: DayOfWeek) {
        return prisma.workoutDay.findUnique({
            where: { userId_dayOfWeek: { userId, dayOfWeek } },
            include: { exercises: { orderBy: { order: 'asc' } } },
        });
    },

    /** Create or update a day name */
    async upsertDay(userId: string, dayOfWeek: DayOfWeek, name: string) {
        return prisma.workoutDay.upsert({
            where: { userId_dayOfWeek: { userId, dayOfWeek } },
            create: { userId, dayOfWeek, name },
            update: { name },
            include: { exercises: { orderBy: { order: 'asc' } } },
        });
    },

    /** Delete a day and its exercises */
    async deleteDay(userId: string, dayOfWeek: DayOfWeek) {
        const day = await prisma.workoutDay.findUnique({
            where: { userId_dayOfWeek: { userId, dayOfWeek } },
        });
        if (!day) return null;
        return prisma.workoutDay.delete({ where: { id: day.id } });
    },

    /** Add an exercise to a day (auto-creates day if needed) */
    async addExercise(
        userId: string,
        dayOfWeek: DayOfWeek,
        data: { name: string; sets: number; reps: string; weight?: number | null; notes?: string },
    ) {
        const day = await prisma.workoutDay.upsert({
            where: { userId_dayOfWeek: { userId, dayOfWeek } },
            create: { userId, dayOfWeek, name: '' },
            update: {},
        });
        const count = await prisma.workoutExercise.count({ where: { workoutDayId: day.id } });
        return prisma.workoutExercise.create({
            data: {
                workoutDayId: day.id,
                name: data.name,
                sets: data.sets,
                reps: data.reps,
                weight: data.weight ?? null,
                notes: data.notes ?? '',
                order: count,
            },
        });
    },

    /** Update an exercise — verifies ownership via join */
    async updateExercise(
        userId: string,
        exerciseId: string,
        data: { name?: string; sets?: number; reps?: string; weight?: number | null; notes?: string; order?: number },
    ) {
        const ex = await prisma.workoutExercise.findFirst({
            where: { id: exerciseId, workoutDay: { userId } },
        });
        if (!ex) return null;
        return prisma.workoutExercise.update({ where: { id: exerciseId }, data });
    },

    /** Delete an exercise — verifies ownership */
    async deleteExercise(userId: string, exerciseId: string) {
        const ex = await prisma.workoutExercise.findFirst({
            where: { id: exerciseId, workoutDay: { userId } },
        });
        if (!ex) return null;
        return prisma.workoutExercise.delete({ where: { id: exerciseId } });
    },
};
