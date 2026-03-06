import { Router } from 'express';
import * as authCtrl from '../controllers/authController';
import { authLimiter } from '../middlewares/rateLimit';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

// Auth routes — strict rate limited
router.post('/register', authLimiter, authCtrl.register);
router.post('/login', authLimiter, authCtrl.login);
router.post('/refresh', authLimiter, authCtrl.refresh);
router.post('/logout', authCtrl.logout);

// Protected
router.get('/me', authMiddleware, authCtrl.me);
router.delete('/me', authMiddleware, authCtrl.deleteAccount);
router.get('/me/experience', authMiddleware, authCtrl.getExperienceLogs);

export default router;
