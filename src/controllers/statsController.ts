import { Request, Response, NextFunction } from 'express';
import * as statsService from '../services/statsService';

// Stats controller — HTTP handling only

export async function getStreaks(req: Request, res: Response, next: NextFunction) {
    try {
        res.json(await statsService.getHabitStreaks(req.user!.userId));
    } catch (err) { next(err); }
}

export async function getBestDay(req: Request, res: Response, next: NextFunction) {
    try {
        res.json(await statsService.getBestDay(req.user!.userId));
    } catch (err) { next(err); }
}

export async function getWeeklyStats(req: Request, res: Response, next: NextFunction) {
    try {
        const week = req.query.week as string | undefined;
        res.json(await statsService.getWeeklyStats(req.user!.userId, week));
    } catch (err) { next(err); }
}

export async function getWeeklySummary(req: Request, res: Response, next: NextFunction) {
    try {
        const week = req.query.week as string | undefined;
        res.json(await statsService.getWeeklySummary(req.user!.userId, week));
    } catch (err) { next(err); }
}

export async function getSummary(req: Request, res: Response, next: NextFunction) {
    try {
        const { period, date } = req.query;
        res.json(await statsService.getSummary(req.user!.userId, period as string, date as string));
    } catch (err) { next(err); }
}

export async function getSummaryToday(req: Request, res: Response, next: NextFunction) {
    try {
        res.json(await statsService.getSummaryToday(req.user!.userId));
    } catch (err) { next(err); }
}
