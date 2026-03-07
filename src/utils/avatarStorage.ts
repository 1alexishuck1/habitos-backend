import fs from 'fs';
import path from 'path';

export const AVATAR_DIR = process.env.AVATAR_DIR || '/data/avatars';

export const ensureAvatarDirectory = () => {
    if (!fs.existsSync(AVATAR_DIR)) {
        try {
            fs.mkdirSync(AVATAR_DIR, { recursive: true });
            console.log(`[AvatarStorage] Created directory: ${AVATAR_DIR}`);
        } catch (error) {
            console.error(`[AvatarStorage] Error creating directory ${AVATAR_DIR}:`, error);
            // Fallback to local if /data is not accessible (e.g. dev without volume)
            if (!process.env.AVATAR_DIR && AVATAR_DIR === '/data/avatars') {
                const localDir = path.join(process.cwd(), 'avatars');
                if (!fs.existsSync(localDir)) {
                    fs.mkdirSync(localDir, { recursive: true });
                }
                console.warn(`[AvatarStorage] Using fallback local directory: ${localDir}`);
                return localDir;
            }
        }
    }
    return AVATAR_DIR;
};

export const getAvatarPath = (filename: string) => {
    return path.join(AVATAR_DIR, filename);
};
