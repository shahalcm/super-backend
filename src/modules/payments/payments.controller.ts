// src/modules/payments/payments.controller.ts
import { Request, Response } from 'express';
import { paymentsService } from './payments.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';

export class PaymentsController {
  async handleWebhook(req: Request, res: Response) {
    try {
      const signature = req.headers['x-razorpay-signature'] as string;
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);

      const result = await paymentsService.handleWebhook(rawBody, signature, req.body);
      return sendSuccess(res, result, 'Webhook processed successfully');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }
}

export const paymentsController = new PaymentsController();
