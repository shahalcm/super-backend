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
 * Returns whether Razorpay is configured with a Live Mode key
 */
export function isLiveMode(): boolean {
  return env.RAZORPAY_KEY_ID?.startsWith('rzp_live_') || env.RAZORPAY_ENV === 'live';
}

/**
 * Public key ID safe to share with frontend
 */
export function getPublicRazorpayKey(): string {
  return env.RAZORPAY_KEY_ID;
}

/**
 * Supported ISO Currency Codes
 */
export const SUPPORTED_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'] as const;
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

/**
 * Validates if the requested currency is supported
 */
export function isSupportedCurrency(currency: string): currency is SupportedCurrency {
  return SUPPORTED_CURRENCIES.includes(currency?.toUpperCase() as SupportedCurrency);
}

/**
 * Convert major currency units (e.g. Rupees) to minor units (e.g. Paise)
 */
export function toSmallestCurrencyUnit(amount: number, currency: string = 'INR'): number {
  const cleanAmount = Number(amount);
  if (isNaN(cleanAmount) || cleanAmount < 0) {
    throw new Error('Invalid payment amount. Amount must be a positive number.');
  }
  // Standard currencies like INR, USD, EUR use factor of 100
  return Math.round(cleanAmount * 100);
}

/**
 * Convert minor currency units (e.g. Paise) to major currency units (e.g. Rupees)
 */
export function fromSmallestCurrencyUnit(amountInPaise: number, currency: string = 'INR'): number {
  return Number((amountInPaise / 100).toFixed(2));
}

/**
 * Dynamically initialize a Razorpay client (e.g. for custom merchant integrations)
 */
export function getRazorpayClient(customKeyId?: string, customKeySecret?: string): Razorpay {
  if (customKeyId && customKeySecret) {
    return new Razorpay({
      key_id: customKeyId,
      key_secret: customKeySecret,
    });
  }
  return platformRazorpay;
}

/**
 * Verify Razorpay payment signature using HMAC-SHA256
 * Mandatory equation: HMAC_SHA256(orderId + "|" + paymentId, secret)
 */
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string = env.RAZORPAY_KEY_SECRET
): boolean {
  if (!orderId || !paymentId || !signature || !secret) {
    return false;
  }

  try {
    const text = `${orderId}|${paymentId}`;
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(text)
      .digest('hex');

    const genBuf = Buffer.from(generatedSignature, 'utf8');
    const sigBuf = Buffer.from(signature, 'utf8');

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
  if (!rawBody || !signature || !webhookSecret) {
    return false;
  }

  try {
    const payload = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    const expBuf = Buffer.from(expectedSignature, 'utf8');
    const sigBuf = Buffer.from(signature, 'utf8');

    if (expBuf.length !== sigBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(expBuf, sigBuf);
  } catch (error) {
    return false;
  }
}
