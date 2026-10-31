// src/config/twilio.ts
import twilio from 'twilio';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let twilioClient: twilio.Twilio | null = null;

const isTwilioConfigured =
  env.TWILIO_ACCOUNT_SID &&
  env.TWILIO_AUTH_TOKEN &&
  !env.TWILIO_ACCOUNT_SID.includes('placeholder') &&
  !env.TWILIO_AUTH_TOKEN.includes('placeholder');

if (isTwilioConfigured) {
  twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
}

/**
 * Send SMS OTP to recipient phone
 */
export async function sendSmsOtp(
  to: string,
  otpCode: string
): Promise<{ success: boolean; messageId?: string }> {
  const formattedTo = to.startsWith('+') ? to : `+91${to}`;
  const body = `Your UBS Global verification code is: ${otpCode}. Valid for 5 minutes. Do NOT share this code with anyone.`;

  if (!twilioClient) {
    logger.info(`📱 [SMS SIMULATION] To: ${formattedTo} | Message: ${body}`);
    return { success: true, messageId: `mock_sms_${Date.now()}` };
  }

  try {
    const message = await twilioClient.messages.create({
      body,
      from: env.TWILIO_PHONE_NUMBER,
      to: formattedTo,
    });
    logger.info({ messageId: message.sid }, `SMS sent to ${formattedTo}`);
    return { success: true, messageId: message.sid };
  } catch (error: any) {
    logger.error({ err: error.message, to: formattedTo }, 'Failed to send SMS via Twilio');
    // In development fallback to simulation
    if (env.NODE_ENV !== 'production') {
      logger.info(`📱 [SMS FALLBACK TEST MODE] OTP for ${formattedTo}: ${otpCode}`);
      return { success: true, messageId: `dev_fallback_${Date.now()}` };
    }
    throw error;
  }
}
