import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

export function apiGuard(req: Request, res: Response, next: NextFunction) {
    if (req.path === '/health') return next();
    if (req.path === '/friends/events') return next();

    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== env.API_SECRET) {
        return res.status(403).json({ error: 'Forbidden: Acceso denegado (API Key faltante o inválida)' });
    }

    next();
}
