import * as statsRepo from '../repositories/statsRepository';
import * as taskRepo from '../repositories/taskRepository';
import * as habitRepo from '../repositories/habitRepository';
import { todayInArg, argDateToUtc, weekStart, weekEnd, dateRange, toArgDate, isDueOnDay, getPeriodRange } from '../utils/date';
import { calculateCurrentStreak } from './habitService';
import { getISODay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const TZ = 'America/Argentina/Buenos_Aires';

const DAY_NAMES: Record<number, string> = {
    1: 'Lunes', 2: 'Martes', 3: 'Miércoles',
    4: 'Jueves', 5: 'Viernes', 6: 'Sábado', 7: 'Domingo',
};

// Stats service — aggregation and weekly summary generation

export async function getHabitStreaks(userId: string) {
    const habits = await habitRepo.getUserHabits(userId);

    return Promise.all(habits.map(async (h) => {
        const currentStreak = await calculateCurrentStreak(
            h.id, h.frequencyType, h.frequencyDays, h.isPaused, h.createdAt
        );
        return {
            id: h.id,
            name: h.name,
            icon: h.template?.icon ?? null,
            currentStreak,
            maxStreak: h.maxStreak,
            isPaused: h.isPaused,
        };
    }));
}

export async function getBestDay(userId: string) {
    const rows = await statsRepo.getTaskCompletionsByWeekday(userId);
    if (!rows.length) return null;
    const best = rows[0];
    return { weekday: best.weekday, label: DAY_NAMES[best.weekday], count: best.count };
}

export async function getWeeklyStats(userId: string, weekDateStr?: string) {
    const ref = weekDateStr ?? todayInArg();
    const wStart = weekStart(ref);
    const wEnd = weekEnd(ref);
    const from = argDateToUtc(wStart);
    const to = argDateToUtc(wEnd);

    // Lazy-generate weekly snapshot if missing
    let snapshot = await statsRepo.getWeeklySnapshot(userId, from);
    if (!snapshot) {
        snapshot = await generateWeeklySnapshot(userId, wStart, wEnd);
    }

    return {
        weekStart: wStart,
        weekEnd: wEnd,
        tasksDone: snapshot.tasksDone,
        tasksTotal: snapshot.tasksTotal,
        completionRate: snapshot.tasksTotal > 0
            ? Math.round((snapshot.tasksDone / snapshot.tasksTotal) * 100)
            : 0,
        habitsData: snapshot.habitsData,
        bestDay: snapshot.bestDay ? { weekday: snapshot.bestDay, label: DAY_NAMES[snapshot.bestDay] } : null,
    };
}

export async function getSummary(userId: string, period: string, refDate?: string) {
    const { from: fStr, to: tStr } = getPeriodRange(period, refDate ?? todayInArg());
    const from = argDateToUtc(fStr);
    const to = argDateToUtc(tStr);

    // Get data
    const doneTasks = await taskRepo.getDoneTasksInRange(userId, from, to);
    const allTasksInRange = await taskRepo.getTasksForDateRange(userId, from, to);

    const habits = await habitRepo.getUserHabits(userId);
    const habitSnapshots = await statsRepo.getHabitSnapshotsForWeek(userId, from, to);
    const days = dateRange(fStr, tStr);

    const habitsData = habits.map(h => {
        const daysRequired = days.filter(d => {
            const isoDay = getISODay(toZonedTime(argDateToUtc(d), TZ));
            return isDueOnDay(h.frequencyType, h.frequencyDays, isoDay);
        }).length;
        const daysCompleted = habitSnapshots.filter(s => s.habitId === h.id && s.completed).length;
        return { habitId: h.id, name: h.name, daysCompleted, daysRequired };
    });

    const tasksDone = doneTasks.length;
    // For weekly, we have a clear definition of 'tasks total' in that week.
    // For month/year, calculating 'tasks total' is complex because a recurring task 
    // counts as 1 per day. To keep it consistent with weekly:
    const tasksTotal = allTasksInRange.length;

    const completionRate = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0;

    // Task categories breakdown
    const categoryStats: Record<string, { done: number; total: number }> = {};
    allTasksInRange.forEach(t => {
        const cat = t.category || 'general';
        if (!categoryStats[cat]) categoryStats[cat] = { done: 0, total: 0 };
        categoryStats[cat].total++;
    });
    doneTasks.forEach(t => {
        const cat = t.category || 'general';
        if (categoryStats[cat]) categoryStats[cat].done++;
    });

    const tasksByCategory = Object.entries(categoryStats).map(([name, stats]) => ({
        name,
        done: stats.done,
        total: stats.total,
        pct: stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0
    })).sort((a, b) => b.pct - a.pct);

    // Best day calculation (if period > daily)
    let bestDay = null;
    if (period !== 'DAILY') {
        const dayCompletions: Record<number, number> = {};
        doneTasks.forEach(t => {
            if (t.doneAt) {
                const wd = getISODay(toZonedTime(t.doneAt, TZ));
                dayCompletions[wd] = (dayCompletions[wd] ?? 0) + 1;
            }
        });
        const bestEntry = Object.entries(dayCompletions).sort((a, b) => b[1] - a[1])[0];
        if (bestEntry) bestDay = { weekday: Number(bestEntry[0]), label: DAY_NAMES[Number(bestEntry[0])] };
    }

    const stats = {
        period, from: fStr, to: tStr,
        tasksDone, tasksTotal, completionRate,
        habitsData, tasksByCategory, bestDay
    };

    return { ...stats, highlights: buildHighlights(stats, period) };
}

export async function getWeeklySummary(userId: string, weekDateStr?: string) {
    return getSummary(userId, 'WEEKLY', weekDateStr);
}

export async function getSummaryToday(userId: string) {
    const today = todayInArg();
    const todayDate = argDateToUtc(today);
    const isoDay = getISODay(toZonedTime(new Date(), TZ));

    // ─── Habits ───────────────────────────────────────────────────────────────
    const habits = await habitRepo.getUserHabits(userId);
    const dueHabits = habits
        .filter(h => !h.isArchived)
        .filter(h => isDueOnDay(h.frequencyType, h.frequencyDays, isoDay) || h.isPaused);

    // Fetch today snapshots for all due habits
    const habitSnapshots = await statsRepo.getHabitSnapshotsForWeek(userId, todayDate, todayDate);
    const snapshotMap = new Map(habitSnapshots.map(s => [s.habitId, s]));

    const habitsTotal = dueHabits.length;
    const habitsDone = dueHabits.filter(h => snapshotMap.get(h.id)?.completed ?? false).length;

    const habitsData = dueHabits.map(h => ({
        habitId: h.id,
        name: h.name,
        daysCompleted: snapshotMap.get(h.id)?.completed ? 1 : 0,
        daysRequired: 1,
    }));

    // ─── Tasks ────────────────────────────────────────────────────────────────
    // "Today's tasks" = tasks due today OR recurring tasks, that are not archived.
    // We count pending + in_progress + done tasks scoped to today.
    const todayEnd = new Date(todayDate);
    todayEnd.setUTCHours(23, 59, 59, 999);

    const allTodayTasks = await taskRepo.getTasksForDateRange(userId, todayDate, todayEnd);
    const doneTodayTasks = allTodayTasks.filter(t => t.status === 'DONE');

    const tasksTotal = allTodayTasks.length;
    const tasksDone = doneTodayTasks.length;

    // Category breakdown
    const categoryStats: Record<string, { done: number; total: number }> = {};
    allTodayTasks.forEach(t => {
        const cat = t.category || 'general';
        if (!categoryStats[cat]) categoryStats[cat] = { done: 0, total: 0 };
        categoryStats[cat].total++;
        if (t.status === 'DONE') categoryStats[cat].done++;
    });
    const tasksByCategory = Object.entries(categoryStats).map(([name, s]) => ({
        name, done: s.done, total: s.total,
        pct: s.total > 0 ? Math.round((s.done / s.total) * 100) : 0,
    })).sort((a, b) => b.pct - a.pct);

    // ─── Combined completion rate ─────────────────────────────────────────────
    const totalItems = habitsTotal + tasksTotal;
    const totalDone = habitsDone + tasksDone;
    const completionRate = totalItems > 0 ? Math.round((totalDone / totalItems) * 100) : 0;

    // ─── Highlights ───────────────────────────────────────────────────────────
    const highlights: string[] = [];
    if (completionRate >= 100 && totalItems > 0) highlights.push('¡Día perfecto! Completaste todo lo de hoy 🎉');
    else if (completionRate >= 80) highlights.push(`¡Excelente! Completaste el ${completionRate}% de tus objetivos de hoy.`);
    else if (completionRate >= 50) highlights.push(`Vas por la mitad (${completionRate}%). ¡Un último esfuerzo!`);

    if (habitsDone === habitsTotal && habitsTotal > 0) highlights.push('Hiciste todos tus hábitos de hoy.');
    if (tasksDone === tasksTotal && tasksTotal > 0) highlights.push('Completaste todas las tareas del día.');

    return {
        period: 'DAILY',
        from: today,
        to: today,
        habitsTotal,
        habitsDone,
        tasksTotal,
        tasksDone,
        completionRate,
        habitsData,
        tasksByCategory,
        bestDay: null,
        highlights,
    };
}


// ─── Internal ─────────────────────────────────────────────────────────────────

async function generateWeeklySnapshot(userId: string, wStart: string, wEnd: string) {
    const from = argDateToUtc(wStart);
    const to = argDateToUtc(wEnd);

    // Task stats
    const doneTasks = await taskRepo.getDoneTasksInRange(userId, from, to);
    const allTasks = await taskRepo.getTasksForDateRange(userId, from, to);
    const tasksDone = doneTasks.length;
    const tasksTotal = allTasks.length;

    // Habit data per habit
    const habits = await habitRepo.getUserHabits(userId);
    const habitSnapshots = await statsRepo.getHabitSnapshotsForWeek(userId, from, to);
    const days = dateRange(wStart, wEnd);

    const habitsData = habits.map(h => {
        const daysRequired = days.filter(d => {
            const isoDay = getISODay(toZonedTime(argDateToUtc(d), TZ));
            return isDueOnDay(h.frequencyType, h.frequencyDays, isoDay);
        }).length;

        const daysCompleted = habitSnapshots.filter(
            s => s.habitId === h.id && s.completed
        ).length;

        return { habitId: h.id, name: h.name, daysCompleted, daysRequired };
    });

    // Best day of this week
    const dayCompletions: Record<number, number> = {};
    doneTasks.forEach(t => {
        if (t.doneAt) {
            const wd = getISODay(toZonedTime(t.doneAt, TZ));
            dayCompletions[wd] = (dayCompletions[wd] ?? 0) + 1;
        }
    });
    const bestDay = Object.entries(dayCompletions).sort((a, b) => b[1] - a[1])[0];

    return statsRepo.upsertWeeklySnapshot({
        userId,
        weekStart: from,
        weekEnd: to,
        tasksDone,
        tasksTotal,
        habitsData,
        bestDay: bestDay ? Number(bestDay[0]) : undefined,
    });
}

function buildHighlights(stats: any, period: string): string[] {
    const h: string[] = [];
    const pLabel = period === 'DAILY' ? 'hoy' : period === 'WEEKLY' ? 'esta semana' : period === 'MONTHLY' ? 'este mes' : 'este año';

    if (stats.completionRate >= 80) h.push(`¡Excelente! Completaste el ${stats.completionRate}% de tus objetivos ${pLabel}.`);
    else if (stats.completionRate >= 50) h.push(`Vas por la mitad (${stats.completionRate}%). ¡Un último esfuerzo!`);

    const habitsData = stats.habitsData as Array<{ name: string; daysCompleted: number; daysRequired: number }>;
    const perfect = habitsData.filter(h => h.daysRequired > 0 && h.daysCompleted >= h.daysRequired);
    if (perfect.length > 0) {
        if (period === 'DAILY') h.push(`Hiciste todos tus hábitos de hoy.`);
        else h.push(`Hábitos impecables ${pLabel}: ${perfect.map(p => p.name).join(', ')}`);
    }

    if (stats.bestDay && period !== 'DAILY') h.push(`Tu día más productivo fue el ${stats.bestDay.label}`);

    return h;
}
