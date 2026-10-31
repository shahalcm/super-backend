// src/modules/auth/auth.routes.ts
import { Router } from 'express';
import { authController } from './auth.controller.js';
import { validateBody } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { otpLimiter, authLimiter } from '../../middleware/rateLimiter.js';
import {
  sendOtpSchema,
  verifyOtpSchema,
  registerSchema,
  loginPasswordSchema,
  refreshTokenSchema,
} from './auth.validators.js';

const router = Router();

// Public OTP & Password endpoints with rate limiting
router.post('/send-otp', otpLimiter, validateBody(sendOtpSchema), (req, res) =>
  authController.sendOtp(req, res)
);

router.post('/verify-otp', authLimiter, validateBody(verifyOtpSchema), (req, res) =>
  authController.verifyOtp(req, res)
);

router.post('/register', authLimiter, validateBody(registerSchema), (req, res) =>
  authController.register(req, res)
);

router.post('/login', authLimiter, validateBody(loginPasswordSchema), (req, res) =>
  authController.loginPassword(req, res)
);

router.post('/refresh-token', validateBody(refreshTokenSchema), (req, res) =>
  authController.refreshToken(req, res)
);

// Protected endpoints
router.get('/me', authenticate, (req, res) => authController.getMe(req, res));
router.post('/logout', authenticate, (req, res) => authController.logout(req, res));

export default router;
