import { Request, Response } from 'express';
import { prisma } from '../config/database';

export const getAdminStats = async (req: Request, res: Response) => {
    try {
        const [
            totalUsers,
            totalHabits,
            totalCompletedHabitSnapshots,
            totalTasks,
            totalCompletedTasks
        ] = await Promise.all([
            prisma.user.count(),
            prisma.habit.count(),
            prisma.habitDailySnapshot.count({ where: { completed: true } }),
            prisma.task.count(),
            prisma.task.count({ where: { status: 'DONE' } })
        ]);

        // Consider online users as users who have a log or snapshot created updated today
        // For simplicity, maybe users registered today or just recent activity.
        // Or we can just get active habits?
        // Let's get number of users created in last 7 days as new users maybe.
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const newUsersLastWeek = await prisma.user.count({
            where: { createdAt: { gte: oneWeekAgo } }
        });

        res.json({
            totalUsers,
            newUsersLastWeek,
            totalHabits,
            totalCompletedHabitSnapshots,
            totalTasks,
            totalCompletedTasks
        });
    } catch (error) {
        console.error('Error in getAdminStats:', error);
        res.status(500).json({ error: 'Error del servidor al obtener estadísticas' });
    }
};
