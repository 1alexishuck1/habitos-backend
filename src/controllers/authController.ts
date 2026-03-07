import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/authService';
import { z } from 'zod';

// Auth controller — HTTP handling only, delegates to authService

const registerSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    name: z.string().min(2, 'Nombre requerido'),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

export async function register(req: Request, res: Response, next: NextFunction) {
    try {
        const { email, password, name } = registerSchema.parse(req.body);
        const tokens = await authService.register(email, password, name);
        res.status(201).json(tokens);
    } catch (err) { next(err); }
}

export async function login(req: Request, res: Response, next: NextFunction) {
    try {
        const { email, password } = loginSchema.parse(req.body);
        const { tokens, user } = await authService.login(email, password);
        const { passwordHash, ...safeUser } = user;
        res.json({ ...tokens, user: safeUser });
    } catch (err) { next(err); }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) { res.status(400).json({ error: 'refreshToken requerido' }); return; }
        const tokens = await authService.refresh(refreshToken);
        res.json(tokens);
    } catch (err) { next(err); }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
    try {
        const { refreshToken } = req.body;
        if (refreshToken) await authService.logout(refreshToken);
        res.status(204).send();
    } catch (err) { next(err); }
}

export async function me(req: Request, res: Response, next: NextFunction) {
    try {
        const user = await authService.getMe(req.user!.userId);
        res.json(user);
    } catch (err) { next(err); }
}

export async function getExperienceLogs(req: Request, res: Response, next: NextFunction) {
    try {
        const logs = await authService.getExperienceLogs(req.user!.userId);
        res.json(logs);
    } catch (err) { next(err); }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
        const { name } = req.body;
        if (!name || name.trim().length < 2) {
            res.status(400).json({ error: 'Nombre inválido' });
            return;
        }
        const user = await authService.updateProfile(req.user!.userId, name);
        res.json(user);
    } catch (err) { next(err); }
}

export async function getProfileStats(req: Request, res: Response, next: NextFunction) {
    try {
        const stats = await authService.getProfileStats(req.user!.userId);
        res.json(stats);
    } catch (err) { next(err); }
}

export async function getPublicProfile(req: Request, res: Response, next: NextFunction) {
    try {
        const profile = await authService.getPublicProfile(req.user!.userId, req.params.userId);
        if (!profile) {
            res.status(404).json({ error: 'Usuario no encontrado' });
            return;
        }
        res.json(profile);
    } catch (err) { next(err); }
}

export async function deleteAccount(req: Request, res: Response, next: NextFunction) {
    try {
        await authService.deleteAccount(req.user!.userId);
        res.status(204).send();
    } catch (err) { next(err); }
}
