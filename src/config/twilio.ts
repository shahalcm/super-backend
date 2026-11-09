// src/config/twilio.ts
import twilio from 'twilio';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export interface SmsResult {
  success: boolean;
  smsDelivered: boolean;
  messageId?: string;
  provider: 'twilio' | 'fast2sms' | 'msg91' | 'simulation' | 'failed';
  error?: string;
  reason?: string;
  twilioErrorCode?: number;
}

/**
 * Check whether Twilio is configured with valid production credentials
 */
function isTwilioValidlyConfigured(): boolean {
  const sid = env.TWILIO_ACCOUNT_SID;
  const token = env.TWILIO_AUTH_TOKEN;
  const from = env.TWILIO_PHONE_NUMBER || env.TWILIO_MESSAGING_SERVICE_SID;

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
}

/**
 * Check whether a phone number is an approved ecosystem test account
 */
export function isTestPhoneNumber(phone: string): boolean {
  if (!phone) return false;
  const cleanDigits = phone.replace(/\D/g, '');
  const cleanPhone = cleanDigits.length > 10 ? cleanDigits.slice(-10) : cleanDigits;
  const testList = (env.TEST_PHONE_NUMBERS || '9999999999,9876543210,9876540001,9876540002,9876540003')
    .split(',')
    .map((p) => p.trim().replace(/\D/g, '').slice(-10));
  return testList.includes(cleanPhone) || /^99999\d{5}$/.test(cleanPhone);
}

/**
 * Send SMS OTP to recipient phone
 * Strictly verifies against real SMS gateways in production.
 */
export async function sendSmsOtp(
  to: string,
  otpCode: string
): Promise<SmsResult> {
  const cleanPhone = to.replace(/\D/g, '').slice(-10);
  if (cleanPhone.length !== 10) {
    return {
      success: false,
      smsDelivered: false,
      provider: 'failed',
      error: `Invalid Indian mobile number (${to}). Must be a valid 10-digit number.`,
    };
  }

  // Universal Test Number Bypass (Simulates immediate 100% delivery without Twilio/carrier costs)
  if (isTestPhoneNumber(to)) {
    logger.info({ to, otpCode }, '🧪 Test phone number detected - SMS dispatch simulated successfully');
    return {
      success: true,
      smsDelivered: true,
      messageId: `test_otp_sms_${Date.now()}`,
      provider: 'simulation',
      reason: 'Universal Ecosystem Test Account (Bypass Carrier)',
    };
  }

  const formattedTo = `+91${cleanPhone}`;
  const body = `Your UBSSuper verification code is: ${otpCode}. Valid for 5 minutes. Do NOT share this code with anyone.`;

  // 1. FAST2SMS Provider (Indian Transactional OTP Gateway)
  if (env.SMS_PROVIDER === 'fast2sms' && env.FAST2SMS_API_KEY) {
    try {
      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          authorization: env.FAST2SMS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: 'otp',
          variables_values: otpCode,
          numbers: cleanPhone,
        }),
      });
      const data: any = await response.json();
      if (data && data.return === true) {
        logger.info({ phone: formattedTo, reqId: data.request_id }, 'SMS delivered via Fast2SMS');
        return {
          success: true,
          smsDelivered: true,
          messageId: data.request_id,
          provider: 'fast2sms',
        };
      }
      return {
        success: false,
        smsDelivered: false,
        provider: 'failed',
        error: `Fast2SMS rejected dispatch: ${data?.message?.[0] || 'Unknown error'}`,
      };
    } catch (err: any) {
      logger.error({ err: err.message }, 'Fast2SMS network failure');
      return {
        success: false,
        smsDelivered: false,
        provider: 'failed',
        error: `Fast2SMS service error: ${err.message}`,
      };
    }
  }

  // 2. MSG91 Provider (Indian DLT-Compliant Transactional Gateway)
  if (env.SMS_PROVIDER === 'msg91' && env.MSG91_AUTH_KEY && env.MSG91_TEMPLATE_ID) {
    try {
      const url = `https://control.msg91.com/api/v5/otp?template_id=${env.MSG91_TEMPLATE_ID}&mobile=91${cleanPhone}&authkey=${env.MSG91_AUTH_KEY}&otp=${otpCode}`;
      const response = await fetch(url, { method: 'POST' });
      const data: any = await response.json();
      if (data && data.type === 'success') {
        logger.info({ phone: formattedTo, msgId: data.message }, 'SMS delivered via MSG91');
        return {
          success: true,
          smsDelivered: true,
          messageId: data.message,
          provider: 'msg91',
        };
      }
      return {
        success: false,
        smsDelivered: false,
        provider: 'failed',
        error: `MSG91 rejected dispatch: ${data?.message || 'Authentication or template error'}`,
      };
    } catch (err: any) {
      logger.error({ err: err.message }, 'MSG91 network failure');
      return {
        success: false,
        smsDelivered: false,
        provider: 'failed',
        error: `MSG91 service error: ${err.message}`,
      };
    }
  }

  // 3. Twilio SMS Provider
  if (twilioClient) {
    try {
      const payload: any = {
        body,
        to: formattedTo,
      };

      if (env.TWILIO_MESSAGING_SERVICE_SID) {
        payload.messagingServiceSid = env.TWILIO_MESSAGING_SERVICE_SID;
      } else {
        payload.from = env.TWILIO_PHONE_NUMBER;
      }

      const message = await twilioClient.messages.create(payload);
      logger.info({ messageId: message.sid, to: formattedTo }, 'SMS successfully dispatched via Twilio');
      return {
        success: true,
        smsDelivered: true,
        messageId: message.sid,
        provider: 'twilio',
      };
    } catch (error: any) {
      const errCode = error.code;
      let internalReason = error.message;
      let userFriendlyError = 'Unable to send SMS verification code right now. Please try again in a few moments.';

      if (errCode === 20003) {
        internalReason = 'Twilio Authentication Error (20003): Twilio account is inactive (status 4) or credentials are invalid. Please update TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in Railway variables.';
        userFriendlyError = 'SMS verification service is temporarily unavailable. Please try again shortly or contact support.';
      } else if (errCode === 21608) {
        internalReason = `Twilio Trial Account Restriction (21608): Number ${formattedTo} is unverified. Trial accounts can only send to verified numbers in Twilio Console. Upgrade Twilio or add number to Verified Caller IDs.`;
        userFriendlyError = 'This phone number cannot receive SMS in trial mode. Please ensure it is verified in Twilio Console or upgrade account.';
      } else if (errCode === 21211) {
        internalReason = `Invalid recipient phone number format (${formattedTo}).`;
        userFriendlyError = 'The mobile number provided is invalid. Please enter a valid 10-digit number.';
      } else if (errCode === 30008 || errCode === 30034 || errCode === 30447) {
        internalReason = 'Indian TRAI DLT Restriction: Carrier rejected message. Requires DLT Principal Entity ID, registered Header, and approved template.';
        userFriendlyError = 'SMS delivery was restricted by the carrier. Please try again later.';
      }

      logger.error({ code: errCode, reason: internalReason, to: formattedTo }, 'Twilio SMS dispatch failed');

      // Only in explicit isolated unit test runs
      if (env.NODE_ENV === 'test') {
        return {
          success: true,
          smsDelivered: false,
          messageId: `test_fallback_${Date.now()}`,
          provider: 'simulation',
          reason: internalReason,
        };
      }

      return {
        success: false,
        smsDelivered: false,
        provider: 'failed',
        error: env.NODE_ENV === 'development' ? internalReason : userFriendlyError,
        twilioErrorCode: errCode,
      };
    }
  }

  // 4. Isolated Automated Test Suite Runner (npm test)
  if (env.NODE_ENV === 'test') {
    return {
      success: true,
      smsDelivered: false,
      messageId: `test_sim_${Date.now()}`,
      provider: 'simulation',
      reason: 'Automated test environment (NODE_ENV=test)',
    };
  }

  // 5. Unconfigured Gateway in Production
  const missingReason = 'Live SMS gateway is not configured with valid credentials in Railway environment. Please configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER (or FAST2SMS_API_KEY / MSG91_AUTH_KEY).';
  logger.error({ to: formattedTo }, missingReason);
  return {
    success: false,
    smsDelivered: false,
    provider: 'failed',
    error: missingReason,
  };
}




