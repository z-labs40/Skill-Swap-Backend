import { Router } from 'express';
import { getAllUsers, updateUserStatus, getUserStats, getUserProfile, updateProfile, getUserProfileStats, getIncomingRequests, getSentRequests, uploadAvatar } from '../controllers/userController';
import { upload } from '../utils/upload';

const router = Router();

router.get('/', getAllUsers);
router.get('/stats', getUserStats);
router.get('/:id/stats', getUserProfileStats);
router.get('/:id/incoming', getIncomingRequests);
router.get('/:id/sent', getSentRequests);
router.get('/:id', getUserProfile);
router.patch('/:id', updateProfile);
router.post('/upload-avatar', upload.single('avatar'), uploadAvatar);
router.patch('/:id/status', updateUserStatus);

export default router;


