import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth';
import * as pushController from '../controllers/pushController';

const router = Router();

// Public — frontend needs the key before the user is known
router.get('/vapid-public-key', pushController.getVapidPublicKey);

// Protected
router.use(authMiddleware);
router.post('/subscribe', pushController.subscribe);
router.delete('/subscribe', pushController.unsubscribe);

export default router;
