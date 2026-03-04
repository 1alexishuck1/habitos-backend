import { Router } from 'express';
import * as reflectionCtrl from '../controllers/reflectionController';
import { authMiddleware } from '../middlewares/auth';
import { writeLimiter } from '../middlewares/rateLimit';

const router = Router();

router.use(authMiddleware);

router.get('/today', reflectionCtrl.getToday);
router.get('/', reflectionCtrl.getAll);
router.post('/', writeLimiter, reflectionCtrl.upsert);

export default router;
