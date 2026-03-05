import { Request, Response, NextFunction } from 'express';
import * as taskService from '../services/taskService';
import { z } from 'zod';

// Task controller — HTTP handling only

const recurrenceSchema = z.object({
    type: z.enum(['daily', 'weekly', 'monthly']),
    days: z.array(z.number().int().min(1).max(31)).optional(),
});

const createTaskSchema = z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    category: z.string().max(50).optional().default('general'),
    isRecurring: z.boolean().optional().default(false),
    recurrenceRule: recurrenceSchema.optional(),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const updateTaskSchema = createTaskSchema.partial();

const statusSchema = z.object({
    status: z.enum(['PENDING', 'IN_PROGRESS', 'DONE']),
});

export async function getTasks(req: Request, res: Response, next: NextFunction) {
    try {
        const { status, category } = req.query as any;
        res.json(await taskService.getUserTasks(req.user!.userId, { status, category }));
    } catch (err) { next(err); }
}

export async function getTodayTasks(req: Request, res: Response, next: NextFunction) {
    try {
        const date = req.query.date as string | undefined;
        res.json(await taskService.getTodayTasks(req.user!.userId, date));
    } catch (err) { next(err); }
}

export async function createTask(req: Request, res: Response, next: NextFunction) {
    try {
        const data = createTaskSchema.parse(req.body);
        const task = await taskService.createTask(req.user!.userId, data);
        res.status(201).json(task);
    } catch (err) { next(err); }
}

export async function updateTask(req: Request, res: Response, next: NextFunction) {
    try {
        const data = updateTaskSchema.parse(req.body);
        const task = await taskService.updateTask(req.params.id, req.user!.userId, data);
        res.json(task);
    } catch (err) { next(err); }
}

export async function changeStatus(req: Request, res: Response, next: NextFunction) {
    try {
        const { status } = statusSchema.parse(req.body);
        const task = await taskService.changeStatus(req.params.id, req.user!.userId, status);
        res.json(task);
    } catch (err) { next(err); }
}

export async function deleteTask(req: Request, res: Response, next: NextFunction) {
    try {
        await taskService.deleteTask(req.params.id, req.user!.userId);
        res.status(204).send();
    } catch (err) { next(err); }
}
