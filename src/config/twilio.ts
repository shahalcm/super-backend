// src/config/twilio.ts
import twilio from 'twilio';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export interface SmsResult {
  success: boolean;
  smsDelivered: boolean;
  messageId?: string;
  provider: 'twilio' | 'simulation' | 'failed';
  error?: string;
  reason?: string;
  twilioErrorCode?: number;
}

/**
 * Check if a phone number is an ecosystem test phone number
 */
export function isTestPhoneNumber(phone: string): boolean {
  const clean = phone.replace(/\D/g, '').slice(-10);
  if (clean === '9876543210') return true;
  if (/^98765400\d{2}$/.test(clean)) return true; // 9876540001 - 9876540099
  return false;
}

/**
 * Check whether Twilio is configured with valid production credentials
 */
function isTwilioValidlyConfigured(): boolean {
  const sid = env.TWILIO_ACCOUNT_SID;
  const token = env.TWILIO_AUTH_TOKEN;
  const from = env.TWILIO_PHONE_NUMBER;

  if (!sid || !token || !from) return false;
  if (sid.includes('test') || sid.includes('placeholder') || sid.includes('dummy')) return false;
  if (token.includes('test') || token.includes('placeholder') || token.includes('dummy')) return false;
  if (!sid.startsWith('AC') || sid.length !== 34) return false;
  if (token.length < 32) return false;

  return true;
}

let twilioClient: twilio.Twilio | null = null;
if (isTwilioValidlyConfigured()) {
  try {
    twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
    logger.info('✅ Twilio SMS Client initialized with production credentials');
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to initialize Twilio client');
  }
} else {
  logger.warn('⚠️ Twilio SMS is not configured with live production credentials. Simulation/Test mode active.');
}

/**
 * Send SMS OTP to recipient phone
 */
export async function sendSmsOtp(
  to: string,
  otpCode: string
): Promise<SmsResult> {
  const formattedTo = to.startsWith('+') ? to : `+91${to.replace(/\D/g, '').slice(-10)}`;
  const body = `Your UBSSuper verification code is: ${otpCode}. Valid for 5 minutes. Do NOT share this code with anyone.`;
  const isTest = isTestPhoneNumber(formattedTo);

  // If Twilio is not initialized with valid credentials
  if (!twilioClient) {
    if (isTest || env.NODE_ENV !== 'production') {
      logger.info(`📱 [SMS SIMULATION] To: ${formattedTo} | OTP: ${otpCode} | Note: Twilio not configured`);
      return {
        success: true,
        smsDelivered: false,
        messageId: `sim_${Date.now()}`,
        provider: 'simulation',
        reason: 'Twilio SMS credentials are not configured on Railway backend (running in simulation mode).',
      };
    }

    return {
      success: false,
      smsDelivered: false,
      provider: 'failed',
      error: 'SMS service is not configured. Please ensure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER are set in Railway environment variables.',
    };
  }

  // Attempt live Twilio dispatch
  try {
    const message = await twilioClient.messages.create({
      body,
      from: env.TWILIO_PHONE_NUMBER,
      to: formattedTo,
    });
    logger.info({ messageId: message.sid, to: formattedTo }, 'SMS successfully dispatched via Twilio');
    return {
      success: true,
      smsDelivered: true,
      messageId: message.sid,
      provider: 'twilio',
    };
  } catch (error: any) {
    const errCode = error.code;
    let explanation = error.message;

    if (errCode === 20003) {
      explanation = 'Twilio Authentication Error (20003): Invalid TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN.';
    } else if (errCode === 21608) {
      explanation = `Twilio Trial Account Restriction (21608): Number ${formattedTo} is unverified. Trial accounts can only send to verified caller IDs.`;
    } else if (errCode === 21211) {
      explanation = `Invalid recipient phone number format (${formattedTo}).`;
    } else if (errCode === 30008 || errCode === 30034 || errCode === 30447) {
      explanation = 'Indian TRAI DLT Restriction: Carrier rejected message. Requires DLT Principal Entity ID, registered Header, and template.';
    }

    logger.error({ code: errCode, err: explanation, to: formattedTo }, 'Failed to send SMS via Twilio');

    // In dev / test fallback to simulation with notice
    if (isTest || env.NODE_ENV !== 'production') {
      logger.info(`📱 [SMS FALLBACK TEST MODE] OTP for ${formattedTo}: ${otpCode}`);
      return {
        success: true,
        smsDelivered: false,
        messageId: `dev_fallback_${Date.now()}`,
        provider: 'simulation',
        reason: explanation,
      };
    }

    return {
      success: false,
      smsDelivered: false,
      provider: 'failed',
      error: explanation,
      twilioErrorCode: errCode,
    };
  }
}

