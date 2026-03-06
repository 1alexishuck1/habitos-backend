import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as smokeService from '../services/smokeService';

const profileSchema = z.object({
    cigarettesPerDay: z.number().min(1),
    yearsSmoking: z.number().min(1),
    pricePerPack: z.number().min(1),
    cigPerPack: z.number().min(1),
    strategy: z.enum(['COLD_TURKEY', 'GRADUAL']),
    mainMotivation: z.string().min(1)
});

const logSchema = z.object({
    quantity: z.number().min(1).default(1),
    trigger: z.string().optional(),
    comment: z.string().optional()
});

const cravingSchema = z.object({
    resisted: z.boolean(),
    trigger: z.string().optional()
});

export async function createProfile(req: Request, res: Response, next: NextFunction) {
    try {
        const data = profileSchema.parse(req.body);
        const profile = await smokeService.createProfile(req.user!.userId, data);
        res.json(profile);
    } catch (error) {
        next(error);
    }
}

export async function getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
        const stats = await smokeService.getDashboardStats(req.user!.userId);
        res.json(stats);
    } catch (error) {
        next(error);
    }
}

export async function logSmoke(req: Request, res: Response, next: NextFunction) {
    try {
        const data = logSchema.parse(req.body);
        const log = await smokeService.registerLog(req.user!.userId, data);
        res.json(log);
    } catch (error) {
        next(error);
    }
}

export async function logCraving(req: Request, res: Response, next: NextFunction) {
    try {
        const data = cravingSchema.parse(req.body);
        const craving = await smokeService.registerCraving(req.user!.userId, data);
        res.json(craving);
    } catch (error) {
        next(error);
    }
}

export async function deleteProfile(req: Request, res: Response, next: NextFunction) {
    try {
        await smokeService.deleteProfile(req.user!.userId);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
}
