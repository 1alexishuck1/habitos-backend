import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth';
import * as friendController from '../controllers/friendController';

const router = Router();

router.use(authMiddleware);

router.get('/search', friendController.search);
router.post('/request', friendController.sendRequest);
router.get('/requests', friendController.listRequests);
router.patch('/requests/:id', friendController.respondRequest);
router.get('/', friendController.listFriends);
router.get('/messages/unread', friendController.getUnreadMessages);
router.patch('/messages/read', friendController.markMessagesAsRead);
router.get('/events', friendController.subscribe);          // SSE — must be before /:friendId/*
router.post('/:friendId/messages', friendController.sendMessage);
router.get('/:friendId/messages', friendController.getChatHistory);
router.get('/:friendId/activity', friendController.getActivity);
router.delete('/:friendId', friendController.removeFriend);

export default router;
