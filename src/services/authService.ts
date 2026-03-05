import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import * as userRepo from '../repositories/userRepository';
import { createError } from '../middlewares/errorHandler';
import { env } from '../config/env';

// Auth service — handles registration, login, token rotation, and logout

export async function register(email: string, password: string, name: string) {
    const existing = await userRepo.findUserByEmail(email);
    if (existing) throw createError('El email ya está registrado', 409);

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await userRepo.createUser({ email, passwordHash, name });
    const tokens = await issueTokens(user.id, user.email);

    const { passwordHash: _, ...safeUser } = user;
    return { ...tokens, user: safeUser };
}

export async function login(email: string, password: string) {
    const user = await userRepo.findUserByEmail(email);
    if (!user) throw createError('Credenciales inválidas', 401);

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw createError('Credenciales inválidas', 401);

    return { tokens: await issueTokens(user.id, user.email), user };
}

export async function refresh(rawRefreshToken: string) {
    let payload: { userId: string };
    try {
        payload = verifyRefreshToken(rawRefreshToken);
    } catch {
        throw createError('Refresh token inválido', 401);
    }

    const tokenHash = hashToken(rawRefreshToken);
    const stored = await userRepo.findRefreshToken(tokenHash);
    if (!stored || stored.userId !== payload.userId) {
        throw createError('Refresh token no encontrado o revocado', 401);
    }

    // Rotate: revoke old, issue new pair
    await userRepo.revokeRefreshToken(stored.id);
    const user = await userRepo.findUserById(payload.userId);
    if (!user) throw createError('Usuario no encontrado', 404);

    return issueTokens(user.id, user.email);
}

export async function logout(rawRefreshToken: string) {
    const tokenHash = hashToken(rawRefreshToken);
    const stored = await userRepo.findRefreshToken(tokenHash);
    if (stored) await userRepo.revokeRefreshToken(stored.id);
}

export async function getMe(userId: string) {
    const user = await userRepo.findUserById(userId);
    if (!user) throw createError('Usuario no encontrado', 404);
    const { passwordHash, ...safe } = user;
    return safe;
}

export async function getExperienceLogs(userId: string) {
    return userRepo.getExperienceLogs(userId);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function issueTokens(userId: string, email: string) {
    const accessToken = signAccessToken({ userId, email });
    const rawRefresh = signRefreshToken({ userId });
    const tokenHash = hashToken(rawRefresh);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // matches JWT_REFRESH_EXPIRES_IN=7d

    await userRepo.saveRefreshToken({ userId, tokenHash, expiresAt });

    return { accessToken, refreshToken: rawRefresh };
}

function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}
