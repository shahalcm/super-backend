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
      const user = await UserModel.findOne({ userId: req.user.userId }).select('-passwordHash');
      if (!user) {
        return sendError(res, 'User not found', 404);
      }
      return sendSuccess(res, user, 'Profile retrieved successfully');
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
