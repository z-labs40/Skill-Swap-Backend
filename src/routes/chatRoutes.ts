import { Router } from 'express';
import { getMessages, sendMessage, getConversations, uploadFile, deleteMessage, editMessage, deleteConversation } from '../controllers/chatController';
import { upload } from '../utils/upload';
import { authenticateUser } from '../middleware/authMiddleware';

const router = Router();

// Apply authentication to all chat routes
router.use(authenticateUser);

router.get('/conversations/:userId', getConversations);
router.get('/:userId/:otherId', getMessages);
router.post('/send', sendMessage);
router.post('/upload', upload.single('file'), uploadFile);
router.delete('/message/:messageId', deleteMessage);
router.put('/message/:messageId', editMessage);
router.delete('/conversation/:userId/:otherId', deleteConversation);

export default router;
