// src/utils/crypto.ts
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';

// Derive 32-byte key from ENCRYPTION_KEY using SHA-256
const ENCRYPTION_KEY = crypto.createHash('sha256').update(env.ENCRYPTION_KEY).digest();

export interface EncryptedPayload {
  encrypted: string;
  iv: string;
  tag: string;
}

/**
 * Encrypt a string using AES-256-GCM authenticated encryption
 */
export function encryptSecret(plainText: string): EncryptedPayload {
  if (!plainText) {
    throw new Error('Cannot encrypt empty or null secret');
  }

  // 12-byte initialization vector (standard recommendation for GCM)
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');

  return {
    encrypted,
    iv: iv.toString('hex'),
    tag,
  };
}

/**
 * Decrypt an AES-256-GCM encrypted payload
 */
export function decryptSecret(payload: EncryptedPayload): string {
  if (!payload || !payload.encrypted || !payload.iv || !payload.tag) {
    throw new Error('Invalid encrypted payload structure');
  }

  const iv = Buffer.from(payload.iv, 'hex');
  const tag = Buffer.from(payload.tag, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);

  decipher.setAuthTag(tag);

  let decrypted = decipher.update(payload.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Mask secret to prevent leak in logs or API responses
 * e.g. "••••••••••••1018"
 */
export function maskSecret(secret?: string | null): string {
  if (!secret) return '';
  const trimmed = secret.trim();
  if (trimmed.length <= 4) {
    return '••••••••';
  }
  const lastFour = trimmed.slice(-4);
  return `••••••••••••${lastFour}`;
}

/**
 * Hash password using bcrypt (12 salt rounds)
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

/**
 * Compare plain password against bcrypt hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Hash an OTP code with sha256 before database storage
 */
export function hashOtp(otp: string, phone: string): string {
  return crypto.createHmac('sha256', env.JWT_ACCESS_SECRET).update(`${phone}:${otp}`).digest('hex');
}

/**
 * Generate a cryptographically secure 6-digit numeric OTP
 */
export function generateOtp(): string {
  const min = 100000;
  const max = 999999;
  return crypto.randomInt(min, max + 1).toString();
}

/**
 * Validate URL and protect against SSRF (Server-Side Request Forgery)
 */
export function validateSafeHttpsUrl(rawUrl: string): { isValid: boolean; error?: string } {
  try {
    const parsed = new URL(rawUrl);

    if (parsed.protocol !== 'https:') {
      return { isValid: false, error: 'Only secure HTTPS endpoints are permitted.' };
    }

    const host = parsed.hostname.toLowerCase();

    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.endsWith('.localhost') ||
      host.endsWith('.local')
    ) {
      return { isValid: false, error: 'Requests to localhost or loopback addresses are blocked.' };
    }

    // Block private/link-local IPv4 ranges
    const parts = host.split('.').map(Number);
    if (parts.length === 4 && parts.every((p) => !isNaN(p) && p >= 0 && p <= 255)) {
      if (
        parts[0] === 10 ||
        (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
        (parts[0] === 192 && parts[1] === 168) ||
        (parts[0] === 169 && parts[1] === 254)
      ) {
        return { isValid: false, error: 'Requests to private IP ranges are strictly blocked.' };
      }
    }

    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Malformed or invalid URL.' };
  }
}
