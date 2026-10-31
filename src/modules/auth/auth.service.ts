// src/modules/auth/auth.service.ts
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import {
  UserModel,
  OtpModel,
  CustomerProfileModel,
  TaxiDriverModel,
  DeliveryRiderModel,
  PartnerBusinessModel,
  IUser,
} from '../../database/index.js';
import { env } from '../../config/env.js';
import { generateOtp, hashOtp, hashPassword, comparePassword } from '../../utils/crypto.js';
import { sendSmsOtp } from '../../config/twilio.js';
import { generateTokens, AuthUserPayload, UserRole } from '../../middleware/auth.js';
import { logger } from '../../utils/logger.js';

import mongoose from 'mongoose';

// In-memory fallback stores when running offline / without active MongoDB
const memoryOtpStore = new Map<string, { otpHash: string; expiresAt: Date; attempts: number }>();
const memoryUserStore = new Map<string, any>();

export class AuthService {
  /**
   * Request OTP code via SMS
   */
  async sendOtp(phone: string, countryCode = '+91', role: UserRole = 'CUSTOMER') {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const fullPhone = `${countryCode}${cleanPhone}`;
    const isDbConnected = mongoose.connection.readyState === 1;

    // Check cooldown / existing active OTP
    if (isDbConnected) {
      try {
        const existingOtp = await OtpModel.findOne({ phone: cleanPhone });
        if (existingOtp) {
          const timeRemaining = Math.ceil((existingOtp.expiresAt.getTime() - Date.now()) / 1000);
          if (timeRemaining > env.OTP_EXPIRY_SECONDS - env.OTP_RESEND_COOLDOWN_SECONDS) {
            throw new Error(
              `Please wait ${timeRemaining - (env.OTP_EXPIRY_SECONDS - env.OTP_RESEND_COOLDOWN_SECONDS)} seconds before requesting another OTP.`
            );
          }
        }
      } catch (err: any) {
        if (err.message.includes('Please wait')) throw err;
      }
    } else {
      const existing = memoryOtpStore.get(cleanPhone);
      if (existing && existing.expiresAt.getTime() > Date.now()) {
        const timeRemaining = Math.ceil((existing.expiresAt.getTime() - Date.now()) / 1000);
        if (timeRemaining > env.OTP_EXPIRY_SECONDS - env.OTP_RESEND_COOLDOWN_SECONDS) {
          throw new Error(
            `Please wait ${timeRemaining - (env.OTP_EXPIRY_SECONDS - env.OTP_RESEND_COOLDOWN_SECONDS)} seconds before requesting another OTP.`
          );
        }
      }
    }

    const otpCode = generateOtp();
    const otpHash = hashOtp(otpCode, cleanPhone);
    const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_SECONDS * 1000);

    // Save/upsert OTP record
    if (isDbConnected) {
      try {
        await OtpModel.findOneAndUpdate(
          { phone: cleanPhone },
          { otpHash, attempts: 0, expiresAt },
          { upsert: true, new: true }
        );
      } catch {
        memoryOtpStore.set(cleanPhone, { otpHash, attempts: 0, expiresAt });
      }
    } else {
      memoryOtpStore.set(cleanPhone, { otpHash, attempts: 0, expiresAt });
    }

    // Send SMS via Twilio
    await sendSmsOtp(fullPhone, otpCode);

    return {
      success: true,
      message: `Verification code sent to ${fullPhone}`,
      expiresInSeconds: env.OTP_EXPIRY_SECONDS,
      // For development / testing convenience, include testOtp when not in live production
      ...(env.NODE_ENV !== 'production' ? { testOtp: otpCode } : {}),
    };
  }

  /**
   * Verify OTP code and return authentication session
   */
  async verifyOtp(phone: string, otp: string, role: UserRole = 'CUSTOMER') {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);

    // Development bypass for easy local manual testing if configured
    const isMasterTestOtp = env.NODE_ENV !== 'production' && otp === '123456';

    const isDbConnected = mongoose.connection.readyState === 1;

    if (!isMasterTestOtp) {
      if (isDbConnected) {
        const otpRecord = await OtpModel.findOne({ phone: cleanPhone });
        if (!otpRecord) {
          throw new Error('OTP has expired or was not requested. Please request a new code.');
        }

        if (otpRecord.attempts >= env.OTP_MAX_ATTEMPTS) {
          await OtpModel.deleteOne({ _id: otpRecord._id });
          throw new Error('Maximum verification attempts exceeded. Please request a new OTP.');
        }

        const expectedHash = hashOtp(otp, cleanPhone);
        if (otpRecord.otpHash !== expectedHash) {
          otpRecord.attempts += 1;
          await otpRecord.save();
          throw new Error(`Invalid verification code. ${env.OTP_MAX_ATTEMPTS - otpRecord.attempts} attempts remaining.`);
        }

        await OtpModel.deleteOne({ _id: otpRecord._id });
      } else {
        const otpRecord = memoryOtpStore.get(cleanPhone);
        if (!otpRecord || otpRecord.expiresAt.getTime() < Date.now()) {
          throw new Error('OTP has expired or was not requested. Please request a new code.');
        }
        const expectedHash = hashOtp(otp, cleanPhone);
        if (otpRecord.otpHash !== expectedHash) {
          otpRecord.attempts += 1;
          throw new Error(`Invalid verification code. ${env.OTP_MAX_ATTEMPTS - otpRecord.attempts} attempts remaining.`);
        }
        memoryOtpStore.delete(cleanPhone);
      }
    }

    // Find or create User
    let user: any = null;
    if (isDbConnected) {
      try {
        user = await UserModel.findOne({ phone: cleanPhone });
      } catch {
        user = memoryUserStore.get(cleanPhone);
      }
    } else {
      user = memoryUserStore.get(cleanPhone);
    }

    if (!user) {
      const userId = `usr_${cleanPhone}`;
      const userData = {
        userId,
        phone: cleanPhone,
        fullName: this.getDefaultNameForRole(role),
        roles: [role],
        currentRole: role,
        status: 'active',
        lastLoginAt: new Date(),
        partnerBusinessId: role === 'PARTNER_OWNER' ? `ptn_${cleanPhone.slice(-4)}` : undefined,
        taxiDriverProfileId: role === 'TAXI_DRIVER' ? `drv_${cleanPhone.slice(-4)}` : undefined,
        deliveryRiderProfileId: role === 'DELIVERY_RIDER' ? `rdr_${cleanPhone.slice(-4)}` : undefined,
      };

      if (isDbConnected) {
        try {
          user = await UserModel.create(userData);
          await this.ensureProfileForRole(user, role);
        } catch {
          user = userData;
          memoryUserStore.set(cleanPhone, userData);
        }
      } else {
        user = userData;
        memoryUserStore.set(cleanPhone, userData);
      }
    } else {
      if (!user.roles.includes(role)) {
        user.roles.push(role);
      }
      user.currentRole = role;
      user.lastLoginAt = new Date();
      if (isDbConnected && typeof user.save === 'function') {
        await user.save();
        await this.ensureProfileForRole(user, role);
      } else {
        memoryUserStore.set(cleanPhone, user);
      }
    }

    const payload: AuthUserPayload = {
      userId: user.userId,
      phone: user.phone,
      email: user.email,
      roles: user.roles,
      currentRole: role,
      partnerId: user.partnerBusinessId,
      driverId: user.taxiDriverProfileId,
      riderId: user.deliveryRiderProfileId,
    };

    const tokens = generateTokens(payload);

    return {
      user: {
        id: user.userId,
        userId: user.userId,
        phone: user.phone,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        roles: user.roles,
        currentRole: user.currentRole,
        partnerId: user.partnerBusinessId,
        driverId: user.taxiDriverProfileId,
        riderId: user.deliveryRiderProfileId,
      },
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Register a new user with profile details
   */
  async register(data: {
    phone: string;
    fullName: string;
    email?: string;
    password?: string;
    role?: UserRole;
    vehicleType?: string;
    partnerCategory?: 'grocery' | 'hotel' | 'clinic';
  }) {
    const cleanPhone = data.phone.replace(/\D/g, '').slice(-10);
    const role = data.role || 'CUSTOMER';
    const isDbConnected = mongoose.connection.readyState === 1;

    let user: any = null;
    if (isDbConnected) {
      try {
        user = await UserModel.findOne({ phone: cleanPhone });
      } catch {
        user = memoryUserStore.get(cleanPhone);
      }
    } else {
      user = memoryUserStore.get(cleanPhone);
    }

    if (user && user.roles.includes(role)) {
      throw new Error(`An account with phone ${cleanPhone} already exists for this role.`);
    }

    const passwordHash = data.password ? await hashPassword(data.password) : undefined;

    if (!user) {
      const userData = {
        userId: `usr_${cleanPhone}`,
        phone: cleanPhone,
        email: data.email,
        fullName: data.fullName,
        passwordHash,
        roles: [role],
        currentRole: role,
        status: 'active',
        lastLoginAt: new Date(),
        save: async function () {
          return this;
        },
      };

      if (isDbConnected) {
        try {
          user = await UserModel.create(userData);
        } catch {
          user = userData;
          memoryUserStore.set(cleanPhone, userData);
        }
      } else {
        user = userData;
        memoryUserStore.set(cleanPhone, userData);
      }
    } else {
      user.roles.push(role);
      user.currentRole = role;
      if (data.email) user.email = data.email;
      if (passwordHash) user.passwordHash = passwordHash;
      if (isDbConnected && typeof user.save === 'function') {
        await user.save();
      } else {
        memoryUserStore.set(cleanPhone, user);
      }
    }

    if (isDbConnected) {
      try {
        await this.ensureProfileForRole(user, role, data);
      } catch {
        // Fallback
      }
    }

    const payload: AuthUserPayload = {
      userId: user.userId,
      phone: user.phone,
      email: user.email,
      roles: user.roles,
      currentRole: role,
      partnerId: user.partnerBusinessId,
      driverId: user.taxiDriverProfileId,
      riderId: user.deliveryRiderProfileId,
    };

    const tokens = generateTokens(payload);

    return {
      user: {
        id: user.userId,
        userId: user.userId,
        phone: user.phone,
        email: user.email,
        fullName: user.fullName,
        roles: user.roles,
        currentRole: user.currentRole,
      },
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Login using Phone/Email + Password
   */
  async loginPassword(phoneOrEmail: string, pass: string, requestedRole?: UserRole) {
    const isDbConnected = mongoose.connection.readyState === 1;
    const isEmail = phoneOrEmail.includes('@');
    const cleanPhone = phoneOrEmail.replace(/\D/g, '').slice(-10);

    let user: any = null;
    if (isDbConnected) {
      try {
        const query = isEmail
          ? { email: phoneOrEmail.toLowerCase().trim() }
          : { phone: cleanPhone };
        user = await UserModel.findOne(query);
      } catch {
        user = memoryUserStore.get(cleanPhone);
      }
    } else {
      user = memoryUserStore.get(cleanPhone);
    }

    if (!user) {
      throw new Error('Invalid credentials. Account not found.');
    }

    if (!user.passwordHash) {
      throw new Error('This account does not have a password set. Please log in using Phone + OTP.');
    }

    const isMatch = await comparePassword(pass, user.passwordHash);
    if (!isMatch) {
      throw new Error('Invalid credentials. Incorrect password.');
    }

    const targetRole = requestedRole || user.currentRole || user.roles[0];
    user.currentRole = targetRole;
    user.lastLoginAt = new Date();
    if (isDbConnected && typeof user.save === 'function') {
      await user.save();
    } else {
      memoryUserStore.set(cleanPhone, user);
    }

    const payload: AuthUserPayload = {
      userId: user.userId,
      phone: user.phone,
      email: user.email,
      roles: user.roles,
      currentRole: targetRole,
      partnerId: user.partnerBusinessId,
      driverId: user.taxiDriverProfileId,
      riderId: user.deliveryRiderProfileId,
    };

    const tokens = generateTokens(payload);

    return {
      user: {
        id: user.userId,
        userId: user.userId,
        phone: user.phone,
        email: user.email,
        fullName: user.fullName,
        roles: user.roles,
        currentRole: user.currentRole,
      },
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Refresh expired access token using refresh token
   */
  async refreshAccessToken(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as any;
      const user = await UserModel.findOne({ userId: decoded.userId });

      if (!user) {
        throw new Error('User not found.');
      }

      const payload: AuthUserPayload = {
        userId: user.userId,
        phone: user.phone,
        email: user.email,
        roles: user.roles,
        currentRole: decoded.currentRole || user.currentRole,
        partnerId: user.partnerBusinessId,
        driverId: user.taxiDriverProfileId,
        riderId: user.deliveryRiderProfileId,
      };

      const tokens = generateTokens(payload);
      return tokens;
    } catch {
      throw new Error('Invalid or expired refresh token. Please log in again.');
    }
  }

  private getDefaultNameForRole(role: UserRole): string {
    switch (role) {
      case 'TAXI_DRIVER':
        return 'Taxi Driver Partner';
      case 'DELIVERY_RIDER':
        return 'Delivery Rider';
      case 'PARTNER_OWNER':
        return 'Merchant Partner';
      case 'ADMIN':
        return 'Platform Administrator';
      case 'SUPER_ADMIN':
        return 'Super Administrator';
      default:
        return 'UBS Customer';
    }
  }

  private async ensureProfileForRole(user: IUser, role: UserRole, extraData?: any) {
    if (role === 'CUSTOMER') {
      await CustomerProfileModel.findOneAndUpdate(
        { userId: user.userId },
        { userId: user.userId },
        { upsert: true, new: true }
      );
    } else if (role === 'TAXI_DRIVER') {
      const driverId = `drv_${user.phone.slice(-4)}`;
      const driver = await TaxiDriverModel.findOneAndUpdate(
        { userId: user.userId },
        {
          driverId,
          userId: user.userId,
          fullName: user.fullName,
          phone: user.phone,
          vehicleType: extraData?.vehicleType || 'Sedan',
          vehicleModel: 'Toyota Innova / Swift Dzire',
          registrationNumber: 'KA-01-AB-1234',
        },
        { upsert: true, new: true }
      );
      user.taxiDriverProfileId = driver.driverId;
      await user.save();
    } else if (role === 'DELIVERY_RIDER') {
      const riderId = `rdr_${user.phone.slice(-4)}`;
      const rider = await DeliveryRiderModel.findOneAndUpdate(
        { userId: user.userId },
        {
          riderId,
          userId: user.userId,
          fullName: user.fullName,
          phone: user.phone,
          vehicleType: extraData?.vehicleType || 'motorcycle',
        },
        { upsert: true, new: true }
      );
      user.deliveryRiderProfileId = rider.riderId;
      await user.save();
    } else if (role === 'PARTNER_OWNER') {
      const partnerId = `ptn_${user.phone.slice(-4)}`;
      const category = extraData?.partnerCategory || 'grocery';
      const partner = await PartnerBusinessModel.findOneAndUpdate(
        { userId: user.userId },
        {
          partnerId,
          userId: user.userId,
          businessName: `${user.fullName}'s ${category.toUpperCase()}`,
          legalName: `${user.fullName} Enterprises Pvt Ltd`,
          category,
          ownerName: user.fullName,
          ownerPhone: user.phone,
          ownerEmail: user.email || `${user.phone}@ubspartner.com`,
          address: 'Plot 42, Indiranagar',
          city: 'Bengaluru',
          state: 'Karnataka',
          postalCode: '560038',
        },
        { upsert: true, new: true }
      );
      user.partnerBusinessId = partner.partnerId;
      await user.save();
    }
  }
}

export const authService = new AuthService();
