// src/modules/wallet/wallet.controller.ts
import { Request, Response } from 'express';
import { walletService } from './wallet.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { WalletApp, WalletAccountType } from '../../database/index.js';

export class WalletController {
  private resolveAppAndAccountType(req: Request): { app: WalletApp; accountType: WalletAccountType } {
    let app: WalletApp = (req.query.app as WalletApp) || (req.body.app as WalletApp);
    let accountType: WalletAccountType = (req.query.accountType as WalletAccountType) || (req.body.accountType as WalletAccountType);

    // If not explicitly provided, infer from req.user
    if (!app || !accountType) {
      const role = req.user?.currentRole || req.user?.roles?.[0];
      if (role === 'TAXI_DRIVER') {
        app = app || 'taxi';
        accountType = accountType || 'taxi_driver';
      } else if (role === 'PARTNER_OWNER' || role === 'PARTNER_STAFF') {
        app = app || 'partner';
        accountType = accountType || 'partner';
      } else if (role === 'DELIVERY_RIDER') {
        app = app || 'delivery';
        accountType = accountType || 'delivery_rider';
      } else {
        app = app || 'ubssuper';
        accountType = accountType || 'customer';
      }
    }

    return { app, accountType };
  }

  async getOffers(req: Request, res: Response) {
    try {
      const app = (req.query.app as string) || 'taxi';
      const role = (req.query.userRole as string) || (req.user?.currentRole as string);
      const offers = await walletService.getOffers(app, role);
      return sendSuccess(res, offers, 'Recharge offers retrieved successfully');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getBalance(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return sendError(res, 'Authentication required', 401);
      }

      const { app, accountType } = this.resolveAppAndAccountType(req);
      const wallet = await walletService.getOrCreateWallet(userId, app, accountType);
      const txs = await walletService.getTransactions(userId, app, 1, 15);

      return sendSuccess(
        res,
        {
          ...wallet,
          recentTransactions: txs.data,
        },
        'Wallet balance retrieved'
      );
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async createRechargeOrder(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return sendError(res, 'Authentication required', 401);
      }

      const { offerId } = req.body;
      if (!offerId) {
        return sendError(res, 'offerId is required to create a recharge order', 400);
      }

      const { app, accountType } = this.resolveAppAndAccountType(req);
      const order = await walletService.createRechargeOrder(userId, app, accountType, offerId);
      return sendSuccess(res, order, 'Razorpay recharge order created successfully', 201);
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async verifyRechargePayment(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return sendError(res, 'Authentication required', 401);
      }

      const { orderId, paymentId, signature, offerId } = req.body;
      if (!orderId || !paymentId || !offerId) {
        return sendError(res, 'orderId, paymentId, and offerId are required', 400);
      }

      const { app, accountType } = this.resolveAppAndAccountType(req);
      const result = await walletService.verifyRechargePayment(userId, app, accountType, {
        orderId,
        paymentId,
        signature: signature || '',
        offerId,
      });

      return sendSuccess(res, result, result.message);
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async requestWithdrawal(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return sendError(res, 'Authentication required', 401);
      }

      const { amount } = req.body;
      const numAmount = Number(amount);
      if (!numAmount || numAmount <= 0) {
        return sendError(res, 'Valid withdrawal amount required', 400);
      }

      const { app, accountType } = this.resolveAppAndAccountType(req);
      const result = await walletService.requestWithdrawal(userId, app, accountType, numAmount);
      return sendSuccess(res, result, result.message, 201);
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getTransactions(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return sendError(res, 'Authentication required', 401);
      }

      const app = (req.query.app as string) || undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 30;

      const result = await walletService.getTransactions(userId, app, page, limit);
      return sendSuccess(res, result, 'Wallet transactions retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }
}

export const walletController = new WalletController();

