import { Router } from 'express';
import { getMeteredIceServers } from '../utils/meteredService';

const router = Router();

// Endpoint to fetch ICE servers for frontend WebRTC
router.get('/ice-servers', async (req, res) => {
  try {
    const iceServers = await getMeteredIceServers();
    res.status(200).json(iceServers);
  } catch (error: any) {
    console.error('Failed to get ICE servers:', error.message);
    // Fallback to basic STUN if Metered fails
    res.status(200).json([{ urls: 'stun:stun.l.google.com:19302' }]);
  }
});

export default router;
