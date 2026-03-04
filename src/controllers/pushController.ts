import { Request, Response, NextFunction } from 'express';
import * as pushService from '../services/pushService';

/** GET /push/vapid-public-key */
export function getVapidPublicKey(_req: Request, res: Response) {
    res.json({ publicKey: pushService.getVapidPublicKey() });
}

/** POST /push/subscribe */
export async function subscribe(req: Request, res: Response, next: NextFunction) {
    try {
        const { endpoint, keys } = req.body as {
            endpoint: string;
            keys: { p256dh: string; auth: string };
        };
        if (!endpoint || !keys?.p256dh || !keys?.auth) {
            res.status(400).json({ error: 'Suscripción inválida' });
            return;
        }
        await pushService.saveSubscription(req.user!.userId, { endpoint, keys });
        res.status(201).json({ ok: true });
    } catch (err) { next(err); }
}

/** DELETE /push/subscribe */
export async function unsubscribe(req: Request, res: Response, next: NextFunction) {
    try {
        const { endpoint } = req.body as { endpoint: string };
        if (endpoint) await pushService.deleteSubscription(endpoint);
        res.status(204).send();
    } catch (err) { next(err); }
}
