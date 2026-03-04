import * as repo from '../repositories/friendRepository';
import * as pushService from './pushService';
import { findUserById } from '../repositories/userRepository';

// ─── Search ───────────────────────────────────────────────────────────────────

export async function searchUsers(query: string, currentUserId: string) {
    if (!query || query.trim().length < 2) return [];
    return repo.searchUsersByName(query.trim(), currentUserId);
}

// ─── Send request ─────────────────────────────────────────────────────────────

export async function sendRequest(senderId: string, receiverId: string) {
    if (senderId === receiverId) {
        throw Object.assign(new Error('No podés enviarte una solicitud a vos mismo.'), { statusCode: 400 });
    }

    const alreadyFriends = await repo.areFriends(senderId, receiverId);
    if (alreadyFriends) {
        throw Object.assign(new Error('Ya son amigos.'), { statusCode: 409 });
    }

    const existing = await repo.findExistingRequest(senderId, receiverId);
    if (existing) {
        if (existing.status === 'PENDING') {
            throw Object.assign(new Error('Ya existe una solicitud pendiente.'), { statusCode: 409 });
        }
        if (existing.status === 'ACCEPTED') {
            throw Object.assign(new Error('Ya son amigos.'), { statusCode: 409 });
        }
        // If REJECTED, allow re-sending by updating status back to PENDING
        return repo.updateRequestStatus(existing.id, 'PENDING');
    }

    const result = await repo.createRequest(senderId, receiverId);

    // Send push notification to the receiver
    const sender = await findUserById(senderId);
    const senderName = sender?.name ?? 'Alguien';
    pushService.sendToUser(receiverId, {
        title: 'Nueva solicitud de amistad',
        body: `${senderName} te envió una solicitud de amistad.`,
        url: '/friends',
        tag: 'friend-request',
    });

    return result;
}

// ─── Respond to request ───────────────────────────────────────────────────────

export async function respondToRequest(
    requestId: string,
    actingUserId: string,
    accept: boolean
) {
    const request = await repo.findRequestById(requestId);
    if (!request) {
        throw Object.assign(new Error('Solicitud no encontrada.'), { statusCode: 404 });
    }
    if (request.receiverId !== actingUserId) {
        throw Object.assign(new Error('No tenés permiso para responder esta solicitud.'), { statusCode: 403 });
    }
    if (request.status !== 'PENDING') {
        throw Object.assign(new Error('La solicitud ya fue respondida.'), { statusCode: 409 });
    }

    const newStatus = accept ? 'ACCEPTED' : 'REJECTED';
    const updated = await repo.updateRequestStatus(requestId, newStatus);

    if (accept) {
        await repo.createFriendship(request.senderId, request.receiverId);
    }

    return updated;
}

// ─── List pending requests ────────────────────────────────────────────────────

export async function listPending(userId: string) {
    return repo.listPendingRequests(userId);
}

// ─── List friends with stats ──────────────────────────────────────────────────

export async function listFriends(userId: string) {
    const friends = await repo.listFriends(userId);

    const enriched = await Promise.all(
        friends.map(async (f: any) => {
            const stats = await repo.getFriendStats(f.friend.id);
            return { ...f, stats };
        })
    );

    return enriched;
}

// ─── Friend activity ─────────────────────────────────────────────────────────────

export async function getActivity(requesterId: string, friendId: string) {
    const friends = await repo.areFriends(requesterId, friendId);
    if (!friends) {
        throw Object.assign(new Error('No sos amigo de este usuario.'), { statusCode: 403 });
    }
    return repo.getFriendActivity(friendId);
}

// ─── Remove friend ─────────────────────────────────────────────────────────────

export async function removeFriend(userId: string, friendId: string) {
    if (userId === friendId) {
        throw Object.assign(new Error('No válido.'), { statusCode: 400 });
    }
    const currently = await repo.areFriends(userId, friendId);
    if (!currently) {
        throw Object.assign(new Error('No son amigos.'), { statusCode: 404 });
    }
    await repo.deleteFriendship(userId, friendId);
}

// ─── Direct Messages (Motivations) ──────────────────────────────────────────

export async function sendMessage(senderId: string, receiverId: string, message: string) {
    if (senderId === receiverId) {
        throw Object.assign(new Error('No podés enviarte un mensaje a vos mismo.'), { statusCode: 400 });
    }
    const friends = await repo.areFriends(senderId, receiverId);
    if (!friends) {
        throw Object.assign(new Error('No son amigos.'), { statusCode: 403 });
    }

    const history = await repo.getChatHistory(senderId, receiverId);
    if (history.length > 0) {
        const lastMsg = history[history.length - 1];
        if (lastMsg.senderId === senderId) {
            throw Object.assign(new Error('Esperá a que te responda antes de enviar otro mensaje.'), { statusCode: 429 });
        }
    }

    const result = await repo.createMessage(senderId, receiverId, message);

    // Send push notification to the receiver
    const sender = await findUserById(senderId);
    const senderName = sender?.name ?? 'Alguien';
    const preview = message.length > 60 ? message.slice(0, 57) + '...' : message;
    pushService.sendToUser(receiverId, {
        title: `💪 Mensaje de ${senderName}`,
        body: preview,
        url: '/friends',
        tag: 'friend-message',
    });

    return result;
}

export async function getUnreadMessages(userId: string) {
    return repo.getUnreadMessages(userId);
}

export async function markMessagesAsRead(messageIds: string[]) {
    return repo.markMessagesAsRead(messageIds);
}

export async function getChatHistory(userAId: string, userBId: string) {
    const friends = await repo.areFriends(userAId, userBId);
    if (!friends) {
        throw Object.assign(new Error('No son amigos.'), { statusCode: 403 });
    }
    return repo.getChatHistory(userAId, userBId);
}
