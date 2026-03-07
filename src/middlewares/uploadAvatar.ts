import multer from 'multer';
import { Request } from 'express';

// Memory storage to process with sharp before saving
const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Formato no permitido. Solo se aceptan jpg, jpeg, png, webp.'));
    }
};

export const uploadAvatar = multer({
    storage,
    limits: {
        fileSize: 2 * 1024 * 1024, // 2MB
    },
    fileFilter,
}).single('avatar');

// Error generic middleware specifically for multer
export const handleUploadError = (err: any, req: any, res: any, next: any) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'La imagen excede el límite de 2MB.' });
        }
        return res.status(400).json({ error: err.message });
    } else if (err) {
        return res.status(400).json({ error: err.message });
    }
    next();
};
