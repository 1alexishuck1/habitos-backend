import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { AuthUser } from '../types';

// Extends Express Request with the authenticated user
declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}

/** Validates Bearer token and attaches user to req.user.
 *  Also accepts ?token=... query param (needed for EventSource/SSE). */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
    const header = req.headers.authorization;
    // Extract token from Bearer header OR ?token= query param (SSE fallback)
    let token: string | undefined;
    if (header?.startsWith('Bearer ')) {
        token = header.slice(7);
    } else if (typeof req.query.token === 'string') {
        token = req.query.token;
    }

    if (!token) {
        res.status(401).json({ error: 'Token requerido' });
        return;
    }

    try {
        req.user = verifyAccessToken(token);
        next();
    } catch {
        res.status(401).json({ error: 'Token inválido o expirado' });
    }
}
