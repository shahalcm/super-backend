// src/modules/partners/partners.controller.ts
import { Request, Response } from 'express';
import { partnersService } from './partners.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';

export class PartnersController {
  async getRegistration(req: Request, res: Response) {
    try {
      const result = await partnersService.getRegistration(req.user!.userId);
      return sendSuccess(res, result, 'Partner registration profile retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async updateRegistration(req: Request, res: Response) {
    try {
      const result = await partnersService.updateRegistration(req.user!.userId, req.body);
      return sendSuccess(res, result, 'Partner registration updated');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async submitRegistration(req: Request, res: Response) {
    try {
      const result = await partnersService.submitRegistration(req.user!.userId);
      return sendSuccess(res, result, 'Partner application submitted for review');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async createFeeOrder(req: Request, res: Response) {
    try {
      const result = await partnersService.createRegistrationFeeOrder(req.user!.userId);
      return sendSuccess(res, result, 'Registration fee payment order created');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async verifyFeePayment(req: Request, res: Response) {
    try {
      const result = await partnersService.verifyRegistrationFeePayment(req.user!.userId, req.body);
      return sendSuccess(res, result, result.message);
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getDashboardSummary(req: Request, res: Response) {
    try {
      const result = await partnersService.getDashboardSummary(req.user!.userId);
      return sendSuccess(res, result, 'Partner dashboard metrics retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  // --- Grocery ---
  async getGroceryProducts(req: Request, res: Response) {
    try {
      const partnerId = req.user?.partnerId || (await partnersService.getRegistration(req.user!.userId)).partnerId;
      const result = await partnersService.getGroceryProducts(partnerId);
      return sendSuccess(res, result, 'Products retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async createGroceryProduct(req: Request, res: Response) {
    try {
      const partnerId = req.user?.partnerId || (await partnersService.getRegistration(req.user!.userId)).partnerId;
      const result = await partnersService.createGroceryProduct(partnerId, req.body);
      return sendSuccess(res, result, 'Product created successfully', 201);
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async updateGroceryProduct(req: Request, res: Response) {
    try {
      const partnerId = req.user?.partnerId || (await partnersService.getRegistration(req.user!.userId)).partnerId;
      const { id } = req.params;
      const result = await partnersService.updateGroceryProduct(id, partnerId, req.body);
      return sendSuccess(res, result, 'Product updated successfully');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async deleteGroceryProduct(req: Request, res: Response) {
    try {
      const partnerId = req.user?.partnerId || (await partnersService.getRegistration(req.user!.userId)).partnerId;
      const { id } = req.params;
      const result = await partnersService.deleteGroceryProduct(id, partnerId);
      return sendSuccess(res, result, 'Product deleted successfully');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getPartnerOrders(req: Request, res: Response) {
    try {
      const partnerId = req.user?.partnerId || (await partnersService.getRegistration(req.user!.userId)).partnerId;
      const result = await partnersService.getPartnerOrders(partnerId);
      return sendSuccess(res, result, 'Orders retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async updateOrderStatus(req: Request, res: Response) {
    try {
      const partnerId = req.user?.partnerId || (await partnersService.getRegistration(req.user!.userId)).partnerId;
      const { id } = req.params;
      const { status } = req.body;
      const result = await partnersService.updateOrderStatus(id, partnerId, status);
      return sendSuccess(res, result, 'Order status updated');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  // --- Integrations ---
  async getRazorpayIntegration(req: Request, res: Response) {
    try {
      const partnerId = req.user?.partnerId || (await partnersService.getRegistration(req.user!.userId)).partnerId;
      const result = await partnersService.getRazorpayIntegration(partnerId);
      return sendSuccess(res, result, 'Razorpay integration settings retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async saveRazorpayIntegration(req: Request, res: Response) {
    try {
      const partnerId = req.user?.partnerId || (await partnersService.getRegistration(req.user!.userId)).partnerId;
      const result = await partnersService.saveRazorpayIntegration(partnerId, req.body);
      return sendSuccess(res, result, 'Razorpay credentials encrypted and saved successfully');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }
}

export const partnersController = new PartnersController();
