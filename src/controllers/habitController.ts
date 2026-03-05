import { Request, Response, NextFunction } from 'express';
import * as habitService from '../services/habitService';
import { z } from 'zod';

// Habit controller — HTTP handling only

const createHabitSchema = z.object({
    templateId: z.string().uuid().optional(),
    name: z.string().min(1).max(100),
    description: z.string().max(300).optional(),
    type: z.enum(['CHECK', 'COUNTER']),
    goalValue: z.number().int().min(1).optional(),
    frequencyType: z.enum(['DAILY', 'WEEKLY', 'SPECIFIC_DAYS']),
    frequencyDays: z.array(z.number().int().min(1).max(7)).optional().default([]),
    category: z.string().max(50).optional(),
});

const updateHabitSchema = createHabitSchema.partial().omit({ templateId: true, type: true });

const logSchema = z.object({
    value: z.number().int().min(1).default(1),
    comment: z.string().max(500).optional(),
    dateStr: z.string().optional(),
});

export async function getTemplates(req: Request, res: Response, next: NextFunction) {
    try {
        res.json(await habitService.getTemplates());
    } catch (err) { next(err); }
}

export async function getHabits(req: Request, res: Response, next: NextFunction) {
    try {
        res.json(await habitService.getUserHabits(req.user!.userId));
    } catch (err) { next(err); }
}

export async function getToday(req: Request, res: Response, next: NextFunction) {
    try {
        const date = req.query.date as string | undefined;
        res.json(await habitService.getTodayHabits(req.user!.userId, date));
    } catch (err) { next(err); }
}

export async function createHabit(req: Request, res: Response, next: NextFunction) {
    try {
        const data = createHabitSchema.parse(req.body);
        const habit = await habitService.createHabit(req.user!.userId, data);
        res.status(201).json(habit);
    } catch (err) { next(err); }
}

export async function updateHabit(req: Request, res: Response, next: NextFunction) {
    try {
        const data = updateHabitSchema.parse(req.body);
        const habit = await habitService.updateHabit(req.params.id, req.user!.userId, data);
        res.json(habit);
    } catch (err) { next(err); }
}

export async function pauseHabit(req: Request, res: Response, next: NextFunction) {
    try {
        const habit = await habitService.togglePause(req.params.id, req.user!.userId);
        res.json(habit);
    } catch (err) { next(err); }
}

export async function archiveHabit(req: Request, res: Response, next: NextFunction) {
    try {
        await habitService.archiveHabit(req.params.id, req.user!.userId);
        res.status(204).send();
    } catch (err) { next(err); }
}

export async function deleteHabit(req: Request, res: Response, next: NextFunction) {
    try {
        await habitService.deleteHabit(req.params.id, req.user!.userId);
        res.status(204).send();
    } catch (err) { next(err); }
}

export async function logHabit(req: Request, res: Response, next: NextFunction) {
    try {
        const data = logSchema.parse(req.body);
        const result = await habitService.logHabit(req.params.id, req.user!.userId, data);
        res.status(201).json(result);
    } catch (err) { next(err); }
}

export async function unlogHabit(req: Request, res: Response, next: NextFunction) {
    try {
        const date = req.query.date as string | undefined;
        await habitService.unlogHabit(req.params.id, req.user!.userId, date);
        res.status(204).send();
    } catch (err) { next(err); }
}

export async function getHabitLogs(req: Request, res: Response, next: NextFunction) {
    try {
        const logs = await habitService.getHabitLogs(req.params.id, req.user!.userId);
        res.json(logs);
    } catch (err) { next(err); }
}
