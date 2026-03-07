import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth';
import { uploadAvatar, handleUploadError } from '../middlewares/uploadAvatar';
import * as userCtrl from '../controllers/userController';

const router = Router();

/**
 * POST /users/avatar
 * Recibe multipart/form-data con campo 'avatar'
 */
router.post(
    '/avatar',
    authMiddleware,
    uploadAvatar,
    handleUploadError,
    userCtrl.updateAvatar
);

export default router;
