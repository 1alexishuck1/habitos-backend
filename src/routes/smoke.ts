import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth';
import * as smokeController from '../controllers/smokeController';

const router = Router();
router.use(authMiddleware);

router.post('/profile', smokeController.createProfile);
router.get('/dashboard', smokeController.getDashboard);
router.post('/logs', smokeController.logSmoke);
router.post('/cravings', smokeController.logCraving);

export default router;
