// src/middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit';
import { sendError } from '../utils/response.js';

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return sendError(res, 'Too many requests. Please try again later.', 429, 'RATE_LIMIT_EXCEEDED');
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return sendError(res, 'Too many authentication attempts. Please wait 15 minutes.', 429, 'AUTH_RATE_LIMIT');
  },
});

export const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit per phone number or IP
    const phone = req.body?.phone || req.ip || 'anonymous';
    return `otp_${phone}`;
  },
  handler: (req, res) => {
    return sendError(
      res,
      'Too many OTP requests for this phone number. Please wait 5 minutes before trying again.',
      429,
      'OTP_RATE_LIMIT'
    );
  },
});
