import webpush from 'web-push';
import { prisma } from '../config/database';

// ─── VAPID setup (lazy — runs on first use) ───────────────────────────────────

let vapidInitialized = false;

function ensureVapid(): boolean {
    if (vapidInitialized) return true;
    const pub = process.env.VAPID_PUBLIC_KEY;
    const prv = process.env.VAPID_PRIVATE_KEY;
    const mail = process.env.VAPID_CONTACT ?? 'mailto:admin@localhost';

    if (!pub || !prv) {
        console.warn('[push] VAPID keys not configured — push notifications disabled');
        return false;
    }
    try {
        webpush.setVapidDetails(mail, pub, prv);
        vapidInitialized = true;
        return true;
    } catch (err) {
        console.error('[push] Invalid VAPID keys:', err);
        return false;
    }
}

export function getVapidPublicKey(): string {
    return process.env.VAPID_PUBLIC_KEY ?? '';
}

// ─── Subscription management ─────────────────────────────────────────────────

export async function saveSubscription(
    userId: string,
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
) {
    return prisma.pushSubscription.upsert({
        where: { endpoint: subscription.endpoint },
        update: { userId, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
        create: { userId, endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
    });
}

export async function deleteSubscription(endpoint: string) {
    return prisma.pushSubscription.deleteMany({ where: { endpoint } });
}

// ─── Send notification ───────────────────────────────────────────────────────

export interface PushPayload {
    title: string;
    body: string;
    icon?: string;
    url?: string;
    tag?: string;
}

export async function sendToUser(userId: string, payload: PushPayload) {
    if (!ensureVapid()) return; // VAPID not configured — skip silently

    const subs = await prisma.pushSubscription.findMany({ where: { userId } });
    if (subs.length === 0) return;

    const json = JSON.stringify(payload);

    await Promise.allSettled(
        subs.map(async (sub) => {
            try {
                await webpush.sendNotification(
                    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                    json,
                );
            } catch (err: any) {
                // 410 Gone or 404 = subscription expired → remove it
                if (err?.statusCode === 410 || err?.statusCode === 404) {
                    await prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } });
                }
            }
        }),
    );
}
