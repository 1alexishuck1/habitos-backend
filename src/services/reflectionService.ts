import * as reflectionRepo from '../repositories/reflectionRepository';
import { todayInArg, argDateToUtc } from '../utils/date';
import { encrypt, decrypt } from '../utils/crypto';

export async function getTodayReflection(userId: string) {
    const today = todayInArg();
    const todayDate = argDateToUtc(today);
    const item = await reflectionRepo.findByDate(userId, todayDate);
    if (!item) return null;
    return {
        ...item,
        content: decrypt(item.content),
        mood: item.mood ? decrypt(item.mood) : null,
    };
}

export async function getAllReflections(userId: string) {
    const list = await reflectionRepo.findAll(userId);
    return list.map(item => ({
        ...item,
        content: decrypt(item.content),
        mood: item.mood ? decrypt(item.mood) : null,
    }));
}

export async function upsertReflection(userId: string, data: { content: string; mood?: string }) {
    const today = todayInArg();
    const todayDate = argDateToUtc(today);

    return reflectionRepo.upsert({
        userId,
        date: todayDate,
        content: encrypt(data.content),
        mood: data.mood ? encrypt(data.mood) : undefined,
    });
}
