import { Router } from 'express';
import * as taskCtrl from '../controllers/taskController';
import { authMiddleware } from '../middlewares/auth';
import { writeLimiter } from '../middlewares/rateLimit';

const router = Router();

router.use(authMiddleware);

router.get('/today', taskCtrl.getTodayTasks);
router.get('/', taskCtrl.getTasks);
router.post('/', writeLimiter, taskCtrl.createTask);
router.put('/:id', writeLimiter, taskCtrl.updateTask);
router.patch('/:id/status', writeLimiter, taskCtrl.changeStatus);
router.delete('/:id', taskCtrl.deleteTask);

export default router;
