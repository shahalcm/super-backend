// src/modules/taxi/taxi.controller.ts
import { Request, Response } from 'express';
import { taxiService } from './taxi.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';

export class TaxiController {
  async getEstimates(req: Request, res: Response) {
    try {
      const rawPickup = req.body.pickup || req.body.pickupLocation || req.body.pickupCoordinates;
      const rawDest = req.body.destination || req.body.destinationLocation || req.body.dropCoordinates || req.body.destinationCoordinates;

      const normalizeCoord = (c: any) => {
        if (!c) return { latitude: 12.9716, longitude: 77.5946 };
        if (Array.isArray(c)) return { longitude: c[0], latitude: c[1] };
        return {
          latitude: c.latitude ?? c.lat ?? 12.9716,
          longitude: c.longitude ?? c.lng ?? 77.5946,
        };
      };

      const pickup = normalizeCoord(rawPickup);
      const destination = normalizeCoord(rawDest);

      const result = await taxiService.getEstimates(pickup, destination);
      return sendSuccess(res, result, 'Taxi fare estimates calculated');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getPricing(req: Request, res: Response) {
    try {
      const includeInactive = req.query.all === 'true' || req.query.includeInactive === 'true';
      const pricing = await taxiService.getPricing(includeInactive);
      return sendSuccess(res, pricing, 'Taxi pricing retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  }

  async updatePricing(req: Request, res: Response) {
    try {
      const pricingList = Array.isArray(req.body) ? req.body : [req.body];
      const adminId = (req as any).user?.userId || 'admin';
      const result = await taxiService.updatePricing(pricingList, adminId);
      return sendSuccess(res, result, 'Taxi pricing updated successfully');
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
