import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface AccessTokenPayload {
    userId: string;
    email: string;
}

/** Signs a short-lived access token */
export function signAccessToken(payload: AccessTokenPayload): string {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
        expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    } as jwt.SignOptions);
}

/** Signs a long-lived refresh token */
export function signRefreshToken(payload: { userId: string }): string {
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
        expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    } as jwt.SignOptions);
}

/** Verifies access token; throws on invalid/expired */
export function verifyAccessToken(token: string): AccessTokenPayload {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

/** Verifies refresh token; throws on invalid/expired */
export function verifyRefreshToken(token: string): { userId: string } {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as { userId: string };
}
