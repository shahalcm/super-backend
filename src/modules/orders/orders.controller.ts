// src/modules/orders/orders.controller.ts
import { Request, Response } from 'express';
import { ordersService } from './orders.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';

export class OrdersController {
  async checkout(req: Request, res: Response) {
    try {
      const result = await ordersService.checkout(req.user!.userId, req.body);
      return sendSuccess(res, result, 'Order placed successfully', 201);
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async verifyPayment(req: Request, res: Response) {
    try {
      const result = await ordersService.verifyPayment(req.user!.userId, req.body);
      return sendSuccess(res, result, 'Payment verified and order confirmed');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async retryPayment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await ordersService.retryPayment(req.user!.userId, id);
      return sendSuccess(res, result, 'Razorpay retry payment initiated');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getMyOrders(req: Request, res: Response) {
    try {
      const result = await ordersService.getMyOrders(req.user!.userId);
      return sendSuccess(res, result, 'Orders retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getOrderById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await ordersService.getOrderById(req.user!.userId, id);
      return sendSuccess(res, result, 'Order retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 404);
    }
  }

  async cancelOrder(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const result = await ordersService.cancelOrder(req.user!.userId, id, reason);
      return sendSuccess(res, result, 'Order cancelled successfully');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }
}

export const ordersController = new OrdersController();
