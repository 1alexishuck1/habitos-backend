import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as friendService from '../services/friendService';
import * as sseManager from '../utils/sseManager';
import * as pushService from '../services/pushService';

// ─── Schemas ─────────────────────────────────────────────────────────────────

const sendRequestSchema = z.object({
    receiverId: z.string().uuid('receiverId debe ser un UUID válido'),
});

const respondSchema = z.object({
    accept: z.boolean(),
});

const sendMessageSchema = z.object({
    message: z.string().min(1, 'El mensaje no puede estar vacío').max(500, 'El mensaje es muy largo'),
});

// ─── Handlers ────────────────────────────────────────────────────────────────

/** GET /friends/search?q= */
export async function search(req: Request, res: Response, next: NextFunction) {
    try {
        const q = String(req.query.q ?? '');
        const users = await friendService.searchUsers(q, req.user!.userId);
        res.json(users);
    } catch (err) { next(err); }
}

/** POST /friends/request */
export async function sendRequest(req: Request, res: Response, next: NextFunction) {
    try {
        const { receiverId } = sendRequestSchema.parse(req.body);
        const result = await friendService.sendRequest(req.user!.userId, receiverId);
        const senderName = (result as any).sender?.name ?? 'Alguien';

        // 1. SSE (real-time if the app tab is open)
        sseManager.pushToUser(receiverId, 'friend_request', {
            id: result.id, senderId: result.senderId, createdAt: result.createdAt,
            sender: (result as any).sender,
        });

        // 2. Web Push (works even if the app is closed / in background)
        pushService.sendToUser(receiverId, {
            title: '👥 Nueva solicitud de amistad',
            body: `${senderName} quiere ser tu amigo`,
            tag: 'friend-request',
            url: '/friends',
        }).catch(() => { }); // fire-and-forget — don't fail the request

        res.status(201).json(result);
    } catch (err) { next(err); }
}

/** GET /friends/requests */
export async function listRequests(req: Request, res: Response, next: NextFunction) {
    try {
        const requests = await friendService.listPending(req.user!.userId);
        res.json(requests);
    } catch (err) { next(err); }
}

/** PATCH /friends/requests/:id */
export async function respondRequest(req: Request, res: Response, next: NextFunction) {
    try {
        const { accept } = respondSchema.parse(req.body);
        const updated = await friendService.respondToRequest(req.params.id, req.user!.userId, accept);
        res.json(updated);
    } catch (err) { next(err); }
}

/** GET /friends */
export async function listFriends(req: Request, res: Response, next: NextFunction) {
    try {
        const friends = await friendService.listFriends(req.user!.userId);
        res.json(friends);
    } catch (err) { next(err); }
}

/** GET /friends/:friendId/activity */
export async function getActivity(req: Request, res: Response, next: NextFunction) {
    try {
        const activity = await friendService.getActivity(req.user!.userId, req.params.friendId);
        res.json(activity);
    } catch (err) { next(err); }
}

/** DELETE /friends/:friendId */
export async function removeFriend(req: Request, res: Response, next: NextFunction) {
    try {
        await friendService.removeFriend(req.user!.userId, req.params.friendId);
        res.status(204).send();
    } catch (err) { next(err); }
}

/** GET /friends/events  — Server-Sent Events stream */
export function subscribe(req: Request, res: Response) {
    const userId = req.user!.userId;

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering if applicable
    res.flushHeaders();

    // Send an initial comment to confirm the stream is open
    res.write(':connected\n\n');

    // Register this connection
    sseManager.register(userId, res);

    // Keep-alive ping every 20s to prevent proxy timeouts
    const ping = setInterval(() => {
        if (!res.writableEnded) res.write(':ping\n\n');
    }, 20000);

    req.on('close', () => {
        clearInterval(ping);
        sseManager.unregister(userId);
    });
}

// ─── Direct Messages (Motivations) ──────────────────────────────────────────

/** POST /friends/:friendId/messages */
export async function sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
        const { message } = sendMessageSchema.parse(req.body);
        const result = await friendService.sendMessage(req.user!.userId, req.params.friendId, message);

        // 1. SSE for immediate update if online
        sseManager.pushToUser(req.params.friendId, 'new_message', {
            id: result.id,
            senderId: result.senderId,
            senderName: result.sender.name,
            message: result.message,
            createdAt: result.createdAt,
        });

        // 2. Web Push for offline notification
        pushService.sendToUser(req.params.friendId, {
            title: `💬 Mensaje de ${result.sender.name}`,
            body: result.message,
            tag: 'friend-message',
            url: '/friends',
        }).catch(() => { });

        res.status(201).json(result);
    } catch (err) { next(err); }
}

/** GET /friends/messages/unread */
export async function getUnreadMessages(req: Request, res: Response, next: NextFunction) {
    try {
        const messages = await friendService.getUnreadMessages(req.user!.userId);
        res.json(messages);
    } catch (err) { next(err); }
}

/** PATCH /friends/messages/read */
export async function markMessagesAsRead(req: Request, res: Response, next: NextFunction) {
    try {
        const ids = z.array(z.string()).parse(req.body.ids);
        await friendService.markMessagesAsRead(ids);
        res.status(204).send();
    } catch (err) { next(err); }
}

/** GET /friends/:friendId/messages */
export async function getChatHistory(req: Request, res: Response, next: NextFunction) {
    try {
        const history = await friendService.getChatHistory(req.user!.userId, req.params.friendId);
        res.json(history);
    } catch (err) { next(err); }
}
