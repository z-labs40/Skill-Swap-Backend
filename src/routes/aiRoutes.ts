import { Router } from 'express';
import { generateSmartReplies, chatWithAi } from '../controllers/aiController';

const router = Router();

router.post('/smart-replies', generateSmartReplies);
router.post('/chat', chatWithAi);
router.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    aiConfigured: !!process.env.GEMINI_API_KEY,
    env: process.env.NODE_ENV
  });
});

export default router;
