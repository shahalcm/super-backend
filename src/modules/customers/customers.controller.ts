// src/modules/customers/customers.controller.ts
import { Request, Response } from 'express';
import { customersService } from './customers.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';

export class CustomersController {
  async getProfile(req: Request, res: Response) {
    try {
      const result = await customersService.getProfile(req.user!.userId);
      return sendSuccess(res, result, 'Customer profile retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async updateProfile(req: Request, res: Response) {
    try {
      const result = await customersService.updateProfile(req.user!.userId, req.body);
      return sendSuccess(res, result, 'Customer profile updated successfully');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async addAddress(req: Request, res: Response) {
    try {
      const result = await customersService.addAddress(req.user!.userId, req.body);
      return sendSuccess(res, result, 'Address added successfully', 201);
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async deleteAddress(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await customersService.deleteAddress(req.user!.userId, id);
      return sendSuccess(res, result, 'Address deleted successfully');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async lookupPincode(req: Request, res: Response) {
    try {
      const { pincode } = req.params;
      const result = await customersService.lookupPincode(pincode);
      return sendSuccess(res, result, 'Location found for PIN code');
    } catch (error: any) {
      return sendError(res, error.message, 404, 'PINCODE_NOT_FOUND');
    }
  }

  async updateLocation(req: Request, res: Response) {
    try {
      const result = await customersService.updateLocation(req.user!.userId, req.body);
      return sendSuccess(res, result, 'Customer location updated successfully');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async deleteAccount(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { reason } = req.body || {};
      const result = await customersService.deleteAccount(userId, { reason });
      return sendSuccess(
        res,
        result,
        'Your account and associated personal data have been permanently deleted.'
      );
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to delete account', 400);
    }
  }
}

export const customersController = new CustomersController();
