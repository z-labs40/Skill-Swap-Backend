import { Router } from 'express';
import { generateSmartReplies, getAiAssistance } from '../controllers/aiController';

const router = Router();

router.post('/smart-replies', generateSmartReplies);
router.post('/assistance', getAiAssistance);

export default router;
