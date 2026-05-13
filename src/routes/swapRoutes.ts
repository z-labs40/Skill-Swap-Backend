import { Router } from 'express';
import { createRequest, acceptRequest, rejectRequest } from '../controllers/swapController';

const router = Router();

router.post('/request', createRequest);
router.patch('/request/:id/accept', acceptRequest);
router.patch('/request/:id/reject', rejectRequest);

export default router;
