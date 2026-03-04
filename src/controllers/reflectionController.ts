import { Request, Response, NextFunction } from 'express';
import * as reflectionService from '../services/reflectionService';
import { z } from 'zod';

const reflectionSchema = z.object({
    content: z.string().min(1).max(2000),
    mood: z.string().max(50).optional(),
});

export async function getToday(req: Request, res: Response, next: NextFunction) {
    try {
        const reflection = await reflectionService.getTodayReflection(req.user!.userId);
        res.json(reflection);
    } catch (err) { next(err); }
}

export async function getAll(req: Request, res: Response, next: NextFunction) {
    try {
        const list = await reflectionService.getAllReflections(req.user!.userId);
        res.json(list);
    } catch (err) { next(err); }
}

export async function upsert(req: Request, res: Response, next: NextFunction) {
    try {
        const data = reflectionSchema.parse(req.body);
        const reflection = await reflectionService.upsertReflection(req.user!.userId, data);
        res.json(reflection);
    } catch (err) { next(err); }
}
