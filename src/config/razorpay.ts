// src/config/razorpay.ts
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export const platformRazorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID,
  key_secret: env.RAZORPAY_KEY_SECRET,
});

/**
 * Verify Razorpay payment signature
 */
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string = env.RAZORPAY_KEY_SECRET
): boolean {
  try {
    const text = `${orderId}|${paymentId}`;
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(text)
      .digest('hex');

    const genBuf = Buffer.from(generatedSignature);
    const sigBuf = Buffer.from(signature);

    if (genBuf.length !== sigBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(genBuf, sigBuf);
  } catch (error) {
    return false;
  }
}

/**
 * Verify Razorpay Webhook signature against raw request body
 */
export function verifyWebhookSignature(
  rawBody: string | Buffer,
  signature: string,
  webhookSecret: string = env.RAZORPAY_WEBHOOK_SECRET
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8'))
      .digest('hex');

    const expBuf = Buffer.from(expectedSignature);
    const sigBuf = Buffer.from(signature);

    if (expBuf.length !== sigBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(expBuf, sigBuf);
  } catch (error) {
    return false;
  }
}
