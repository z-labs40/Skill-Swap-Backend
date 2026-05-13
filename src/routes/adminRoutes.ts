import { Router } from 'express';
import { 
  getSkillAnalytics, 
  getAdminProfile, 
  updateAdminProfile,
  sendAdminCredentials
} from '../controllers/adminController';
import { authenticateUser, authorizeAdmin } from '../middleware/authMiddleware';

const router = Router();

// Apply auth middleware to all admin routes
router.use(authenticateUser);
router.use(authorizeAdmin);

// Route for admin analytics
router.get('/analytics/skills', getSkillAnalytics);

// Route for admin profile
router.get('/profile', getAdminProfile);
router.patch('/profile', updateAdminProfile);
router.post('/send-credentials', sendAdminCredentials);


export default router;

