import { Router } from 'express';
import { generateSmartReplies, chatWithAi } from '../controllers/aiController';

const router = Router();

router.post('/smart-replies', generateSmartReplies);
router.post('/chat', chatWithAi);

export default router;
