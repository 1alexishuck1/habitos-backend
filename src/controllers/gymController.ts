import { Request, Response } from 'express';
import { gymService } from '../services/gymService';
import { z } from 'zod';

type DayOfWeek = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';
const VALID_DAYS: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

function parseDayParam(day: string): DayOfWeek | null {
    return VALID_DAYS.includes(day as DayOfWeek) ? (day as DayOfWeek) : null;
}

const exerciseSchema = z.object({
    name: z.string().min(1).max(120),
    sets: z.number().int().min(1).max(100).default(3),
    reps: z.string().min(1).max(30).default('10'),
    weight: z.number().positive().nullable().optional(),
    notes: z.string().max(300).optional().default(''),
});

export const gymController = {

    async listDays(req: Request, res: Response) {
        const userId = req.user!.userId;
        res.json(await gymService.listDays(userId));
    },

    async getDay(req: Request, res: Response) {
        const userId = req.user!.userId;
        const dayOfWeek = parseDayParam(req.params.day?.toUpperCase());
        if (!dayOfWeek) return res.status(400).json({ error: 'Día inválido' });
        const day = await gymService.getDay(userId, dayOfWeek);
        if (!day) return res.json({ dayOfWeek, name: '', exercises: [] });
        res.json(day);
    },

    async upsertDay(req: Request, res: Response) {
        const userId = req.user!.userId;
        const dayOfWeek = parseDayParam(req.params.day?.toUpperCase());
        if (!dayOfWeek) return res.status(400).json({ error: 'Día inválido' });
        const { name = '' } = req.body;
        res.json(await gymService.upsertDay(userId, dayOfWeek, String(name).slice(0, 60)));
    },

    async deleteDay(req: Request, res: Response) {
        const userId = req.user!.userId;
        const dayOfWeek = parseDayParam(req.params.day?.toUpperCase());
        if (!dayOfWeek) return res.status(400).json({ error: 'Día inválido' });
        await gymService.deleteDay(userId, dayOfWeek);
        res.json({ ok: true });
    },

    async addExercise(req: Request, res: Response) {
        const userId = req.user!.userId;
        const dayOfWeek = parseDayParam(req.params.day?.toUpperCase());
        if (!dayOfWeek) return res.status(400).json({ error: 'Día inválido' });
        const parsed = exerciseSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
        res.status(201).json(await gymService.addExercise(userId, dayOfWeek, parsed.data));
    },

    async updateExercise(req: Request, res: Response) {
        const userId = req.user!.userId;
        const parsed = exerciseSchema.partial().safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
        const ex = await gymService.updateExercise(userId, req.params.id, parsed.data);
        if (!ex) return res.status(404).json({ error: 'Ejercicio no encontrado' });
        res.json(ex);
    },

    async deleteExercise(req: Request, res: Response) {
        const userId = req.user!.userId;
        const ex = await gymService.deleteExercise(userId, req.params.id);
        if (!ex) return res.status(404).json({ error: 'Ejercicio no encontrado' });
        res.json({ ok: true });
    },
};
