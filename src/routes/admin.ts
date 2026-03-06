import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middlewares/auth';
import { getAdminStats } from '../controllers/adminController';

const router = Router();

// Admin Guard Middleware
export const adminGuard = (req: Request, res: Response, next: NextFunction) => {
    // Only allow this specific user ID and email
    if (req.user?.userId === '1c30001a-ba62-47f4-ad41-bbcdc137e221' && req.user?.email === 'huckalexis0@gmail.com') {
        return next();
    }
    return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
};

// Root of /admin
router.get('/stats', authMiddleware, adminGuard, getAdminStats);

export default router;
