import { Router } from 'express';
import { gymController } from '../controllers/gymController';
import { authMiddleware } from '../middlewares/auth';

const router = Router();
router.use(authMiddleware);

// Days
router.get('/', gymController.listDays);
router.get('/:day', gymController.getDay);
router.put('/:day', gymController.upsertDay);
router.delete('/:day', gymController.deleteDay);

// Exercises
router.post('/:day/exercises', gymController.addExercise);
router.put('/exercises/:id', gymController.updateExercise);
router.delete('/exercises/:id', gymController.deleteExercise);

export default router;
