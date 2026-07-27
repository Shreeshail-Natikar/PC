import { Router } from 'express';
import * as messagesController from '../controllers/messages.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', messagesController.getMessages);
router.post('/', messagesController.sendMessage);
router.post('/read', messagesController.markAsRead);
router.delete('/clear', messagesController.clearChat);
router.put('/:id', messagesController.updateMessage);
router.delete('/:id', messagesController.deleteMessage);
router.post('/:id/reaction', messagesController.toggleReaction);

export default router;
