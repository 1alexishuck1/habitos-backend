import * as taskRepo from '../repositories/taskRepository';
import { createError } from '../middlewares/errorHandler';
import { todayInArg, argDateToUtc, weekStart, weekEnd, toArgDate, toArgString } from '../utils/date';
import { RecurrenceRule, TaskStatus } from '../types';
import { getISODay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const TZ = 'America/Argentina/Buenos_Aires';

// Task service — business logic for tasks and recurrence expansion

export async function getUserTasks(userId: string, filters?: { status?: TaskStatus; category?: string }) {
    return taskRepo.getUserTasks(userId, filters);
}

export async function getTodayTasks(userId: string, targetDateStr?: string) {
    const todayStr = targetDateStr || todayInArg();
    const targetDate = argDateToUtc(todayStr);
    const endDate = new Date(targetDate);
    endDate.setDate(endDate.getDate() + 1);

    const allTasks = await taskRepo.getTasksForDateRange(userId, targetDate, endDate);
    const isoDay = getISODay(new Date(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate()));

    return allTasks.filter(task => {
        // If it's done, only show it if it was finished today
        if (task.status === 'DONE') {
            return task.doneAt && todayStr === toArgString(task.doneAt);
        }

        // Non-recurring: show if dueDate is today (or past and not done, but user asked for 'today')
        if (!task.isRecurring) {
            return task.dueDate && todayStr === toArgDate(task.dueDate);
        }

        // Recurring: check if rule applies today
        return isRecurringDueToday(task.recurrenceRule as any, isoDay);
    });
}

function isRecurringDueToday(rule: RecurrenceRule | null, isoDay: number): boolean {
    if (!rule) return true; // no rule = every day
    if (rule.type === 'daily') return true;
    if (rule.type === 'weekly') return rule.days?.includes(isoDay) ?? false;
    if (rule.type === 'monthly') {
        // monthly recurrence: check if today is the day of month (stored in days[0])
        const now = toZonedTime(new Date(), TZ);
        return rule.days?.includes(now.getDate()) ?? false;
    }
    return false;
}

export async function createTask(userId: string, data: {
    title: string;
    description?: string;
    category?: string;
    isRecurring?: boolean;
    recurrenceRule?: RecurrenceRule;
    dueDate?: string;
}) {
    return taskRepo.createTask({
        userId,
        title: data.title,
        description: data.description,
        category: data.category ?? 'general',
        isRecurring: data.isRecurring ?? false,
        recurrenceRule: data.recurrenceRule,
        dueDate: data.dueDate ? argDateToUtc(data.dueDate) : undefined,
    });
}

export async function updateTask(taskId: string, userId: string, data: {
    title?: string;
    description?: string;
    category?: string;
    isRecurring?: boolean;
    recurrenceRule?: RecurrenceRule;
    dueDate?: string;
}) {
    const task = await taskRepo.findTaskById(taskId, userId);
    if (!task) throw createError('Tarea no encontrada', 404);

    return taskRepo.updateTask(taskId, {
        ...data,
        dueDate: data.dueDate ? argDateToUtc(data.dueDate) : undefined,
    });
}

export async function changeStatus(taskId: string, userId: string, status: TaskStatus) {
    const task = await taskRepo.findTaskById(taskId, userId);
    if (!task) throw createError('Tarea no encontrada', 404);

    const doneAt = status === 'DONE' ? new Date() : undefined;
    return taskRepo.updateTask(taskId, { status, doneAt });
}

export async function deleteTask(taskId: string, userId: string) {
    const task = await taskRepo.findTaskById(taskId, userId);
    if (!task) throw createError('Tarea no encontrada', 404);
    return taskRepo.deleteTask(taskId);
}
