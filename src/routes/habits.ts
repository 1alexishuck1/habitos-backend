import { Router } from 'express';
import * as habitCtrl from '../controllers/habitController';
import { authMiddleware } from '../middlewares/auth';
import { writeLimiter } from '../middlewares/rateLimit';

const router = Router();

router.use(authMiddleware);

router.get('/templates', habitCtrl.getTemplates);
router.get('/today', habitCtrl.getToday);
router.get('/', habitCtrl.getHabits);
router.post('/', writeLimiter, habitCtrl.createHabit);
router.put('/:id', writeLimiter, habitCtrl.updateHabit);
router.patch('/:id/pause', habitCtrl.pauseHabit);
router.patch('/:id/archive', habitCtrl.archiveHabit);
router.delete('/:id', habitCtrl.deleteHabit);
router.post('/:id/logs', writeLimiter, habitCtrl.logHabit);
router.delete('/:id/logs/today', writeLimiter, habitCtrl.unlogHabit);
router.get('/:id/logs', habitCtrl.getHabitLogs);

export default router;
