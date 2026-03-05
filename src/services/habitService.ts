import * as habitRepo from '../repositories/habitRepository';
import { createError } from '../middlewares/errorHandler';
import { todayInArg, argDateToUtc, isDueOnDay, toArgDate, toArgString } from '../utils/date';
import { getISODay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const TZ = 'America/Argentina/Buenos_Aires';

// ─── Streak calculation ───────────────────────────────────────────────────────
// Rules:
// - Frequency change does NOT affect past streak data (max_streak only ever increases).
// - currentStreak: consecutive days from today back, using CURRENT frequency.
// - Paused days are skipped (not counted as failure).
// - WEEKLY frequency: at least one completed day in the week counts.

export async function calculateCurrentStreak(
    habitId: string,
    frequencyType: string,
    frequencyDays: number[],
    isPaused: boolean,
    createdAt: Date
): Promise<number> {
    if (isPaused) return 0;

    // Load all snapshots sorted desc
    const snapshots = await habitRepo.getAllSnapshotsForStreak(habitId);
    const snapshotMap = new Map<string, boolean>(
        snapshots.map(s => [toArgDate(s.date), s.completed])
    );

    const today = todayInArg();
    let streak = 0;
    let current = new Date();

    // Walk back day by day from today
    for (let i = 0; i < 365; i++) {
        const dateStr = toArgString(current);
        const isoDay = getISODay(toZonedTime(current, TZ));

        if (dateStr < toArgDate(createdAt)) break; // don't go before habit creation

        const isDue = isDueOnDay(frequencyType, frequencyDays, isoDay);

        if (!isDue) {
            // Not expected on this day — skip without breaking streak
            current.setDate(current.getDate() - 1);
            continue;
        }

        const completed = snapshotMap.get(dateStr) ?? false;

        if (completed) {
            streak++;
        } else if (dateStr === today) {
            // Today hasn't been completed yet — don't break streak, just skip
        } else {
            // Past due day not completed → streak broken
            break;
        }

        current.setDate(current.getDate() - 1);
    }

    return streak;
}

/** Updates max_streak on habit if current streak exceeds stored max */
async function maybeUpdateMaxStreak(habitId: string, currentStreak: number, storedMax: number) {
    if (currentStreak > storedMax) {
        await habitRepo.updateHabit(habitId, { maxStreak: currentStreak });
    }
}

// ─── Habit CRUD ───────────────────────────────────────────────────────────────

export async function getTemplates() {
    return habitRepo.getHabitTemplates();
}

export async function getUserHabits(userId: string) {
    const habits = await habitRepo.getUserHabits(userId);
    const today = todayInArg();
    const todayDate = argDateToUtc(today);
    const isoDay = getISODay(toZonedTime(new Date(), TZ));

    return Promise.all(habits.map(async (h) => {
        const snapshot = await habitRepo.getTodaySnapshot(h.id, todayDate);
        const currentStreak = await calculateCurrentStreak(
            h.id, h.frequencyType, h.frequencyDays, h.isPaused, h.createdAt
        );
        return {
            ...h,
            todayValue: snapshot?.totalValue ?? 0,
            todayCompleted: snapshot?.completed ?? false,
            currentStreak,
            maxStreak: h.maxStreak,
            isDue: isDueOnDay(h.frequencyType, h.frequencyDays, isoDay),
        };
    }));
}

export async function createHabit(userId: string, data: {
    templateId?: string;
    name: string;
    description?: string;
    type: string;
    frequencyType: string;
    frequencyDays?: number[];
    category?: string;
}) {
    let category = data.category;
    // If created from a template and no category given, copy from template
    if (data.templateId && !category) {
        const templates = await habitRepo.getHabitTemplates();
        const tpl = templates.find(t => t.id === data.templateId);
        if (tpl?.category) category = tpl.category;
    }
    return habitRepo.createHabit({
        userId,
        templateId: data.templateId,
        name: data.name,
        description: data.description,
        type: data.type,
        frequencyType: data.frequencyType,
        frequencyDays: data.frequencyDays ?? [],
        category,
    });
}

export async function updateHabit(habitId: string, userId: string, data: {
    name?: string;
    description?: string;
    frequencyType?: string;
    frequencyDays?: number[];
    isPaused?: boolean;
}) {
    const habit = await habitRepo.findHabitById(habitId, userId);
    if (!habit) throw createError('Hábito no encontrado', 404);

    // Frequency change: update forward only — past snapshots are NOT recalculated
    await habitRepo.updateHabit(habitId, data);
    return habitRepo.findHabitById(habitId, userId);
}

export async function archiveHabit(habitId: string, userId: string) {
    const habit = await habitRepo.findHabitById(habitId, userId);
    if (!habit) throw createError('Hábito no encontrado', 404);
    return habitRepo.updateHabit(habitId, { isArchived: true });
}

export async function deleteHabit(habitId: string, userId: string) {
    const habit = await habitRepo.findHabitById(habitId, userId);
    if (!habit) throw createError('Hábito no encontrado', 404);
    return habitRepo.deleteHabit(habitId);
}

export async function togglePause(habitId: string, userId: string) {
    const habit = await habitRepo.findHabitById(habitId, userId);
    if (!habit) throw createError('Hábito no encontrado', 404);
    return habitRepo.updateHabit(habitId, { isPaused: !habit.isPaused });
}

// ─── Logging & Snapshots ──────────────────────────────────────────────────────

export async function logHabit(habitId: string, userId: string, data: {
    value: number;
    comment?: string;
}) {
    const habit = await habitRepo.findHabitById(habitId, userId);
    if (!habit) throw createError('Hábito no encontrado', 404);
    if (habit.isArchived) throw createError('El hábito está archivado', 400);

    const today = todayInArg();
    const todayDate = argDateToUtc(today);

    // CHECK type: only one log per day allowed
    if (habit.type === 'CHECK') {
        const existing = await habitRepo.getLogsForHabitOnDate(habitId, todayDate);
        if (existing.length > 0) throw createError('Este hábito ya fue marcado hoy', 409);
    }

    // Create event log (append-only)
    await habitRepo.createHabitLog({
        habitId,
        userId,
        date: todayDate,
        value: data.value,
        comment: data.comment,
    });

    // Recalculate and upsert daily snapshot
    const allLogsToday = await habitRepo.getLogsForHabitOnDate(habitId, todayDate);
    const totalValue = allLogsToday.reduce((sum, l) => sum + l.value, 0);
    const completed = habit.type === 'CHECK' ? totalValue >= 1 : totalValue >= 1;

    await habitRepo.upsertDailySnapshot({
        habitId,
        userId,
        date: todayDate,
        totalValue,
        completed,
        comment: data.comment,
    });

    // Update max streak if needed
    const currentStreak = await calculateCurrentStreak(
        habitId, habit.frequencyType, habit.frequencyDays, habit.isPaused, habit.createdAt
    );
    await maybeUpdateMaxStreak(habitId, currentStreak, habit.maxStreak);

    return { totalValue, completed, currentStreak, maxStreak: Math.max(habit.maxStreak, currentStreak) };
}

export async function unlogHabit(habitId: string, userId: string): Promise<void> {
    const habit = await habitRepo.findHabitById(habitId, userId);
    if (!habit) throw createError('Hábito no encontrado', 404);

    const today = todayInArg();
    const todayDate = argDateToUtc(today);

    // Delete logs and snapshot for today
    await habitRepo.deleteLog(habitId, todayDate);
    try {
        await habitRepo.deleteSnapshot(habitId, todayDate);
    } catch { /* if no snapshot yet, it's fine */ }
}

export async function getHabitLogs(habitId: string, userId: string) {
    const habit = await habitRepo.findHabitById(habitId, userId);
    if (!habit) throw createError('Hábito no encontrado', 404);
    return habitRepo.getHabitLogs(habitId);
}

// ─── Today view ───────────────────────────────────────────────────────────────

export async function getTodayHabits(userId: string) {
    const habits = await habitRepo.getUserHabits(userId);
    const today = todayInArg();
    const todayDate = argDateToUtc(today);
    const isoDay = getISODay(toZonedTime(new Date(), TZ));

    const result = await Promise.all(
        habits
            .filter(h => !h.isArchived)
            .filter(h => isDueOnDay(h.frequencyType, h.frequencyDays, isoDay) || h.isPaused)
            .map(async (h) => {
                const snapshot = await habitRepo.getTodaySnapshot(h.id, todayDate);
                const currentStreak = await calculateCurrentStreak(
                    h.id, h.frequencyType, h.frequencyDays, h.isPaused, h.createdAt
                );
                return {
                    ...h,
                    todayValue: snapshot?.totalValue ?? 0,
                    todayCompleted: snapshot?.completed ?? false,
                    todayComment: snapshot?.comment ?? null,
                    currentStreak,
                    maxStreak: h.maxStreak,
                    isDue: isDueOnDay(h.frequencyType, h.frequencyDays, isoDay),
                };
            })
    );

    return result;
}
