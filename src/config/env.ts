// src/config/env.ts
import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config();

if (
  process.env.npm_lifecycle_event === 'test' ||
  process.argv.some((a) => a.includes('verify-backend') || a.includes('test'))
) {
  process.env.NODE_ENV = 'test';
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production', 'staging']).default('development'),
  PORT: z.coerce.number().default(5000),
  API_VERSION: z.string().default('v1'),
  API_BASE_URL: z.string().default('http://localhost:5000'),
  ADMIN_PANEL_URL: z.string().default('http://localhost:3000'),
  CUSTOMER_APP_SCHEME: z.string().default('ubssuper'),
  PARTNER_APP_URL: z.string().default('http://localhost:8081'),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 chars').default('ubs_global_access_token_super_secret_key_2026_jwt_token_auth'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 chars').default('ubs_global_refresh_token_super_secret_key_2026_jwt_token_auth'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  // Security Vault
  ENCRYPTION_KEY: z.string().default('ubs_super_partner_vault_master_key_2026_aes256gcm_secret'),
  LOG_LEVEL: z.string().default('info'),
  CORS_ORIGIN: z.string().default('*'),

  // MongoDB
  MONGO_URI: z.string().default('mongodb://127.0.0.1:27017/ubs_global'),

  // Razorpay
  RAZORPAY_KEY_ID: z.string().default('rzp_test_placeholder_key_id'),
  RAZORPAY_KEY_SECRET: z.string().default('rzp_test_placeholder_secret'),
  RAZORPAY_WEBHOOK_SECRET: z.string().default('rzp_webhook_secret_placeholder'),
  RAZORPAY_ENV: z.enum(['test', 'live']).default('test'),

  // SMS Gateway Configuration (Twilio, Fast2SMS, MSG91)
  SMS_PROVIDER: z.enum(['twilio', 'fast2sms', 'msg91']).default('twilio'),
  TWILIO_ACCOUNT_SID: z.string().default('AC_twilio_test_account_sid'),
  TWILIO_AUTH_TOKEN: z.string().default('twilio_test_auth_token'),
  TWILIO_PHONE_NUMBER: z.string().default('+15005550006'),
  TWILIO_MESSAGING_SERVICE_SID: z.string().optional(),
  FAST2SMS_API_KEY: z.string().optional(),
  MSG91_AUTH_KEY: z.string().optional(),
  MSG91_TEMPLATE_ID: z.string().optional(),
  MSG91_SENDER_ID: z.string().optional(),
  OTP_EXPIRY_SECONDS: z.coerce.number().default(300),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().default(60),
  OTP_MAX_ATTEMPTS: z.coerce.number().default(5),
  ALLOW_OTP_SIMULATION: z.coerce.boolean().default(true),


  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().default('dtubrloue'),
  CLOUDINARY_API_KEY: z.string().default('463785848856518'),
  CLOUDINARY_API_SECRET: z.string().default('placeholder_secret'),
  CLOUDINARY_URL: z.string().optional(),

  // Google Maps
  GOOGLE_MAPS_SERVER_API_KEY: z.string().default('placeholder_google_maps_server_api_key'),
  GOOGLE_MAPS_COUNTRY_RESTRICTION: z.string().default('IN'),

  // Optional
  REDIS_URL: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Environment validation failed:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
