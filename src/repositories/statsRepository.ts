import { prisma } from '../config/database';

// Stats repository — aggregation queries only

export async function getWeeklySnapshot(userId: string, weekStart: Date) {
    return prisma.weeklySnapshot.findUnique({
        where: { userId_weekStart: { userId, weekStart } },
    });
}

export async function upsertWeeklySnapshot(data: {
    userId: string;
    weekStart: Date;
    weekEnd: Date;
    tasksDone: number;
    tasksTotal: number;
    habitsData: any;
    bestDay?: number;
}) {
    return prisma.weeklySnapshot.upsert({
        where: { userId_weekStart: { userId: data.userId, weekStart: data.weekStart } },
        update: { ...data, generatedAt: new Date() },
        create: data,
    });
}

/** Returns count of completed tasks grouped by ISO weekday (1=Mon..7=Sun) for best-day calc */
export async function getTaskCompletionsByWeekday(userId: string) {
    // Raw query for weekday grouping — Prisma doesn't support EXTRACT natively
    const rows = await prisma.$queryRaw<{ weekday: number; count: bigint }[]>`
    SELECT EXTRACT(ISODOW FROM done_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::int AS weekday,
           COUNT(*) AS count
    FROM tasks
    WHERE user_id = ${userId}
      AND status = 'DONE'
      AND done_at IS NOT NULL
    GROUP BY weekday
    ORDER BY count DESC
  `;
    return rows.map(r => ({ weekday: r.weekday, count: Number(r.count) }));
}

/** Returns habit snapshots for a date range (for weekly summary) */
export async function getHabitSnapshotsForWeek(userId: string, from: Date, to: Date) {
    return prisma.habitDailySnapshot.findMany({
        where: { userId, date: { gte: from, lte: to } },
        include: { habit: true },
    });
}
