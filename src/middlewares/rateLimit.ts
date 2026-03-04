import rateLimit from 'express-rate-limit';

const isDev = process.env.NODE_ENV !== 'production';

/** Strict rate limit for auth endpoints (5 requests / 15 min per IP) */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDev ? 0 : 5, // 0 = unlimited in dev
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiados intentos. Intentá en 15 minutos.' },
    skip: () => isDev, // skip middleware entirely in dev
});

/** Standard rate limit for write endpoints (60 req / min per IP) */
export const writeLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: isDev ? 0 : 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiadas solicitudes. Por favor esperá.' },
    skip: () => isDev,
});
