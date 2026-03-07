import { Request, Response } from 'express';
import sharp from 'sharp';
import path from 'path';
import { prisma } from '../config/database';
import { ensureAvatarDirectory } from '../utils/avatarStorage';

export const updateAvatar = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se ha subido ninguna imagen o el formato no es válido.' });
        }

        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Usuario no autenticado.' });
        }

        const avatarDir = ensureAvatarDirectory();
        const filename = `user-${userId}.webp`;
        const fullPath = path.join(avatarDir, filename);

        // Process with sharp: resize and convert to webp
        // fit: 'cover' crops the image to be square
        await sharp(req.file.buffer)
            .resize(300, 300, { fit: 'cover' })
            .webp({ quality: 85 })
            .toFile(fullPath);

        // Update database (relative path for serving)
        const avatarUrl = `/avatars/${filename}`;

        await prisma.user.update({
            where: { id: userId },
            data: { avatarUrl }
        });

        return res.status(200).json({
            avatar_url: avatarUrl
        });
    } catch (error) {
        console.error('[UserController] Error uploading avatar:', error);
        return res.status(500).json({ error: 'Error interno al procesar el avatar.' });
    }
};
