import { Router } from 'express';
import * as statsCtrl from '../controllers/statsController';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

router.use(authMiddleware);

router.get('/today', statsCtrl.getSummaryToday);
router.get('/habits/streaks', statsCtrl.getStreaks);
router.get('/best-day', statsCtrl.getBestDay);
router.get('/weekly', statsCtrl.getWeeklyStats);
router.get('/summary', statsCtrl.getSummary);
router.get('/summary/weekly', statsCtrl.getWeeklySummary);

export default router;
