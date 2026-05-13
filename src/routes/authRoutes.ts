import { Router } from 'express';
import { register, login, sendForgotPasswordOtp, verifyForgotPasswordOtp, refreshToken, verifyRegistrationOtp } from '../controllers/authController';

const router = Router();

router.post('/register', register);
router.post('/register/verify-otp', verifyRegistrationOtp);
router.post('/login', login);
router.post('/refresh', refreshToken);
router.post('/forgot-password/send-otp', sendForgotPasswordOtp);
router.post('/forgot-password/verify-otp', verifyForgotPasswordOtp);

export default router;
