// src/modules/taxi/taxi.controller.ts
import { Request, Response } from 'express';
import { taxiService } from './taxi.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';

export class TaxiController {
  async getEstimates(req: Request, res: Response) {
    try {
      const { pickup, destination } = req.body;
      const result = await taxiService.getEstimates(pickup, destination);
      return sendSuccess(res, result, 'Taxi fare estimates calculated');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getNearbyDrivers(req: Request, res: Response) {
    try {
      const { lat, lng, vehicleType } = req.query;
      const pickup = {
        latitude: parseFloat(lat as string) || 12.9716,
        longitude: parseFloat(lng as string) || 77.5946,
      };
      const result = await taxiService.getNearbyDrivers(pickup, vehicleType as string);
      return sendSuccess(res, result, 'Nearby drivers retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async bookRide(req: Request, res: Response) {
    try {
      const result = await taxiService.bookRide(req.user!.userId, req.body);
      return sendSuccess(res, result, 'Ride requested successfully', 201);
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getRide(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await taxiService.getRide(id);
      return sendSuccess(res, result, 'Ride details retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 404);
    }
  }

  async cancelRide(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const result = await taxiService.cancelRide(req.user!.userId, id, reason);
      return sendSuccess(res, result, 'Ride cancelled successfully');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }
}

export const taxiController = new TaxiController();
