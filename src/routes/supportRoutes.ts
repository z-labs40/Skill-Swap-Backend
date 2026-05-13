import { Router } from 'express';
import { getAllMessages, sendMessage, replyToMessage, updateMessage, deleteMessage, permanentlyDeleteMessage } from '../controllers/supportController';
import { authenticateUser, authorizeAdmin } from '../middleware/authMiddleware';

const router = Router();

router.get('/', getAllMessages);
router.post('/', sendMessage);
router.patch('/:id/reply', authenticateUser, authorizeAdmin, replyToMessage);
router.patch('/:id', authenticateUser, authorizeAdmin, updateMessage);
router.delete('/:id', authenticateUser, authorizeAdmin, deleteMessage);
router.delete('/:id/permanent', authenticateUser, authorizeAdmin, permanentlyDeleteMessage);

export default router;
