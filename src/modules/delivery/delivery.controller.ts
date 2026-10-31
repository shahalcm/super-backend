// src/modules/delivery/delivery.controller.ts
import { Request, Response } from 'express';
import { deliveryService } from './delivery.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';

export class DeliveryController {
  async getProfile(req: Request, res: Response) {
    try {
      const result = await deliveryService.getProfile(req.user!.userId);
      return sendSuccess(res, result, 'Rider profile retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async updateProfile(req: Request, res: Response) {
    try {
      const result = await deliveryService.updateProfile(req.user!.userId, req.body);
      return sendSuccess(res, result, 'Rider profile updated');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async submitProfile(req: Request, res: Response) {
    try {
      const result = await deliveryService.submitProfileForReview(req.user!.userId);
      return sendSuccess(res, result, 'Rider application submitted for review');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async setAvailability(req: Request, res: Response) {
    try {
      const { isOnline } = req.body;
      const result = await deliveryService.setAvailability(req.user!.userId, isOnline);
      return sendSuccess(res, result, isOnline ? 'Online for delivery tasks' : 'Offline');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async updateLocation(req: Request, res: Response) {
    try {
      const { latitude, longitude } = req.body;
      const result = await deliveryService.updateLocation(req.user!.userId, latitude, longitude);
      return sendSuccess(res, result, 'Location updated');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getAvailableDeliveries(req: Request, res: Response) {
    try {
      const result = await deliveryService.getAvailableDeliveries(req.user!.userId);
      return sendSuccess(res, result, 'Available delivery tasks retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getCurrentDelivery(req: Request, res: Response) {
    try {
      const result = await deliveryService.getCurrentDelivery(req.user!.userId);
      return sendSuccess(res, result, 'Current delivery task retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async acceptDelivery(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await deliveryService.acceptDelivery(req.user!.userId, id);
      return sendSuccess(res, result, 'Delivery task accepted');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async updatePickup(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await deliveryService.updatePickup(req.user!.userId, id);
      return sendSuccess(res, result, 'Order picked up from merchant');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async completeDelivery(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { otp } = req.body;
      const result = await deliveryService.completeDelivery(req.user!.userId, id, otp);
      return sendSuccess(res, result, 'Delivery completed successfully');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getEarningsSummary(req: Request, res: Response) {
    try {
      const result = await deliveryService.getEarningsSummary(req.user!.userId);
      return sendSuccess(res, result, 'Earnings summary retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async requestPayout(req: Request, res: Response) {
    try {
      const { amount } = req.body;
      const result = await deliveryService.requestPayout(req.user!.userId, amount);
      return sendSuccess(res, result, 'Payout request submitted', 201);
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }
}

export const deliveryController = new DeliveryController();
