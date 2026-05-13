import { Router } from 'express';
import { getLandingContent, updateLandingContent } from '../controllers/landingController';
import { authenticateUser, authorizeAdmin } from '../middleware/authMiddleware';

const router = Router();

router.get('/', getLandingContent);
router.put('/', authenticateUser, authorizeAdmin, updateLandingContent);

export default router;
