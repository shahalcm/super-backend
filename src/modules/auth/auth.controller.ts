// src/modules/auth/auth.controller.ts
import { Request, Response } from 'express';
import { authService } from './auth.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { UserModel } from '../../database/index.js';

export class AuthController {
  async sendOtp(req: Request, res: Response) {
    try {
      const { phone, countryCode, role } = req.body;
      const result = await authService.sendOtp(phone, countryCode, role);
      return sendSuccess(res, result, result.message);
    } catch (error: any) {
      return sendError(res, error.message, 400, 'OTP_SEND_FAILED');
    }
  }

  async verifyOtp(req: Request, res: Response) {
    try {
      const { phone, otp, role } = req.body;
      const result = await authService.verifyOtp(phone, otp, role);
      return sendSuccess(res, result, 'Verification successful');
    } catch (error: any) {
      return sendError(res, error.message, 400, 'OTP_VERIFICATION_FAILED');
    }
  }

  async register(req: Request, res: Response) {
    try {
      const result = await authService.register(req.body);
      return sendSuccess(res, result, 'Registration successful', 201);
    } catch (error: any) {
      return sendError(res, error.message, 400, 'REGISTRATION_FAILED');
    }
  }

  async loginPassword(req: Request, res: Response) {
    try {
      const { phoneOrEmail, password, role } = req.body;
      const result = await authService.loginPassword(phoneOrEmail, password, role);
      return sendSuccess(res, result, 'Login successful');
    } catch (error: any) {
      return sendError(res, error.message, 401, 'INVALID_CREDENTIALS');
    }
  }

  async resetPassword(req: Request, res: Response) {
    try {
      const { phone, otp, newPassword } = req.body;
      const result = await authService.resetPassword(phone, otp, newPassword);
      return sendSuccess(res, result, result.message);
    } catch (error: any) {
      return sendError(res, error.message, 400, 'PASSWORD_RESET_FAILED');
    }
  }


  async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      const tokens = await authService.refreshAccessToken(refreshToken);
      return sendSuccess(res, tokens, 'Token refreshed successfully');
    } catch (error: any) {
      return sendError(res, error.message, 401, 'TOKEN_REFRESH_FAILED');
    }
  }

  async getMe(req: Request, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, 'Unauthorized', 401);
      }
      const userDoc: any = await UserModel.findOne({ userId: req.user.userId }).select('-passwordHash');
      if (!userDoc) {
        return sendError(res, 'User not found', 404);
      }
      const u = userDoc.toObject ? userDoc.toObject() : { ...userDoc };

      // Enrich profile so it fulfills DriverProfile, RiderProfile, PartnerUser, and Customer User across all 4 apps
      const responseProfile = {
        ...u,
        id: u.userId,
        applicationStatus: u.status === 'active' || u.status === 'approved' ? 'approved' : u.status || 'approved',
        status: u.status === 'active' || u.status === 'approved' ? 'approved' : u.status || 'approved',
        category: u.category || 'grocery',
        businessName: u.businessName || 'UBS Supermart & Gourmet Flagship',
        preferredLanguage: 'English',
        rating: 4.98,
        totalCompletedDeliveries: 380,
        totalTrips: 450,
        acceptanceRate: 98,
        avgDeliveryTimeMinutes: 18,
        currentZone: 'Indiranagar, Bengaluru',
        isOnline: true,
        vehicleType: u.currentRole === 'TAXI_DRIVER' ? 'Sedan' : 'motorcycle',
      };

      return sendSuccess(res, responseProfile, 'Profile retrieved successfully');
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  }

  async logout(req: Request, res: Response) {
    // In JWT architecture, client drops token. Can invalidate in Redis if configured.
    return sendSuccess(res, { loggedOut: true }, 'Successfully logged out');
  }
}

export const authController = new AuthController();
