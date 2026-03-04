import { Response } from 'express';

// ─── SSE connection manager ───────────────────────────────────────────────────
// Keeps one active SSE response per user. If a user opens multiple tabs,
// the newest connection replaces the previous one.

const connections = new Map<string, Response>();

export function register(userId: string, res: Response) {
    // Close any existing connection for this user
    const existing = connections.get(userId);
    if (existing && !existing.writableEnded) {
        existing.end();
    }
    connections.set(userId, res);
}

export function unregister(userId: string) {
    connections.delete(userId);
}

export function pushToUser(userId: string, event: string, data: unknown) {
    const res = connections.get(userId);
    if (res && !res.writableEnded) {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
}

export function isConnected(userId: string): boolean {
    const res = connections.get(userId);
    return !!res && !res.writableEnded;
}
