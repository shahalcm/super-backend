// src/modules/drivers/drivers.controller.ts
import { Request, Response } from 'express';
import { driversService } from './drivers.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';

export class DriversController {
  async getProfile(req: Request, res: Response) {
    try {
      const result = await driversService.getProfile(req.user!.userId);
      const doc = result.toObject ? result.toObject() : { ...result };
      const enriched = {
        ...doc,
        id: doc.driverId || doc.id || doc._id?.toString(),
        applicationStatus: doc.status || 'draft',
      };
      return sendSuccess(res, enriched, 'Driver profile retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async updateProfile(req: Request, res: Response) {
    try {
      const result = await driversService.updateProfile(req.user!.userId, req.body);
      return sendSuccess(res, result, 'Profile updated successfully');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async submitProfile(req: Request, res: Response) {
    try {
      const result = await driversService.submitProfileForReview(req.user!.userId);
      return sendSuccess(res, result, 'Profile submitted for administrative verification');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async updateLicence(req: Request, res: Response) {
    try {
      const result = await driversService.updateLicence(req.user!.userId, req.body);
      return sendSuccess(res, result, 'Driving licence updated');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async updateRC(req: Request, res: Response) {
    try {
      const result = await driversService.updateRC(req.user!.userId, req.body);
      return sendSuccess(res, result, 'Vehicle RC updated');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async updateVehiclePhotos(req: Request, res: Response) {
    try {
      const result = await driversService.updateVehiclePhotos(req.user!.userId, req.body);
      return sendSuccess(res, result, 'Vehicle photographs updated');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async setAvailability(req: Request, res: Response) {
    try {
      const { isOnline } = req.body;
      const result = await driversService.setAvailability(req.user!.userId, isOnline);
      return sendSuccess(res, result, isOnline ? 'You are now online' : 'You are now offline');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async updateLocation(req: Request, res: Response) {
    try {
      const { latitude, longitude, heading } = req.body;
      const result = await driversService.updateLocation(req.user!.userId, latitude, longitude, heading);
      return sendSuccess(res, result, 'Location updated');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getAvailableRides(req: Request, res: Response) {
    try {
      const result = await driversService.getAvailableRides(req.user!.userId);
      return sendSuccess(res, result, 'Available rides retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getActiveRide(req: Request, res: Response) {
    try {
      const result = await driversService.getActiveRide(req.user!.userId);
      return sendSuccess(res, result, 'Active ride retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async acceptRide(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await driversService.acceptRide(req.user!.userId, id);
      return sendSuccess(res, result, 'Ride accepted');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async declineRide(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await driversService.declineRide(req.user!.userId, id);
      return sendSuccess(res, result, 'Ride declined');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async updateArrived(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await driversService.updateRideArrived(req.user!.userId, id);
      return sendSuccess(res, result, 'Status updated to arrived');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async startRide(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { otp } = req.body;
      const result = await driversService.startRide(req.user!.userId, id, otp);
      return sendSuccess(res, result, 'Trip started successfully');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async completeRide(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await driversService.completeRide(req.user!.userId, id);
      return sendSuccess(res, result, 'Trip completed successfully');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getEarningsSummary(req: Request, res: Response) {
    try {
      const result = await driversService.getEarningsSummary(req.user!.userId);
      return sendSuccess(res, result, 'Earnings summary retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getEarningsHistory(req: Request, res: Response) {
    try {
      const result = await driversService.getEarningsHistory(req.user!.userId);
      return sendSuccess(res, result, 'Earnings history retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async requestPayout(req: Request, res: Response) {
    try {
      const { amount } = req.body;
      const result = await driversService.requestPayout(req.user!.userId, amount);
      return sendSuccess(res, result, 'Payout request submitted', 201);
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }
}

export const driversController = new DriversController();
