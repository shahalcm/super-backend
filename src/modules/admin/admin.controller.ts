// src/modules/admin/admin.controller.ts
import { Request, Response } from 'express';
import { adminService } from './admin.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';

export class AdminController {
  async getDashboard(req: Request, res: Response) {
    try {
      const result = await adminService.getDashboard();
      return sendSuccess(res, result, 'Dashboard metrics retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getApps(req: Request, res: Response) {
    try {
      const result = await adminService.getApps();
      return sendSuccess(res, result, 'Apps retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async updateApp(req: Request, res: Response) {
    try {
      const { id, ...data } = req.body;
      const result = await adminService.updateApp(id, data);
      return sendSuccess(res, result, 'App updated');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getCustomers(req: Request, res: Response) {
    try {
      const { search, status } = req.query;
      const result = await adminService.getCustomers(search as string, status as string);
      return sendSuccess(res, result, 'Customers retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async updateCustomer(req: Request, res: Response) {
    try {
      const { id, ...data } = req.body;
      const result = await adminService.updateCustomer(id, data);
      return sendSuccess(res, result, 'Customer updated');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getPartners(req: Request, res: Response) {
    try {
      const { search, category, status } = req.query;
      const result = await adminService.getPartners(search as string, category as string, status as string);
      return sendSuccess(res, result, 'Partners retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async updatePartner(req: Request, res: Response) {
    try {
      const { id, partnerId, ...data } = req.body;
      const targetId = partnerId || id;
      const result = await adminService.updatePartner(targetId, data);
      return sendSuccess(res, result, 'Partner updated');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getDrivers(req: Request, res: Response) {
    try {
      const { search, status, vehicleType } = req.query;
      const result = await adminService.getDrivers(search as string, status as string, vehicleType as string);
      return sendSuccess(res, result, 'Drivers retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async updateDriver(req: Request, res: Response) {
    try {
      const { id, ...data } = req.body;
      const result = await adminService.updateDriver(id, data);
      return sendSuccess(res, result, 'Driver updated');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getDeliveryRiders(req: Request, res: Response) {
    try {
      const { search, status } = req.query;
      const result = await adminService.getDeliveryRiders(search as string, status as string);
      return sendSuccess(res, result, 'Delivery riders retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async updateDeliveryRider(req: Request, res: Response) {
    try {
      const { id, ...data } = req.body;
      const result = await adminService.updateDeliveryRider(id, data);
      return sendSuccess(res, result, 'Delivery rider updated');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getOrders(req: Request, res: Response) {
    try {
      const { type, status } = req.query;
      const result = await adminService.getOrders(type as string, status as string);
      return sendSuccess(res, result, 'Orders retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async updateOrder(req: Request, res: Response) {
    try {
      const { id, ...data } = req.body;
      const result = await adminService.updateOrder(id, data);
      return sendSuccess(res, result, 'Order updated');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getPayments(req: Request, res: Response) {
    try {
      const result = await adminService.getPayments();
      return sendSuccess(res, result, 'Payments retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getRefunds(req: Request, res: Response) {
    try {
      const result = await adminService.getRefunds();
      return sendSuccess(res, result, 'Refunds retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async updateRefund(req: Request, res: Response) {
    try {
      const { id, ...data } = req.body;
      const result = await adminService.updateRefund(id, data);
      return sendSuccess(res, result, 'Refund status updated');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getPayouts(req: Request, res: Response) {
    try {
      const result = await adminService.getPayouts();
      return sendSuccess(res, result, 'Payout requests retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async updatePayout(req: Request, res: Response) {
    try {
      const { id, ...data } = req.body;
      const result = await adminService.updatePayout(id, data);
      return sendSuccess(res, result, 'Payout updated');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getCommissions(req: Request, res: Response) {
    try {
      const result = await adminService.getCommissions();
      return sendSuccess(res, result, 'Commission rules retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async createCommission(req: Request, res: Response) {
    try {
      const result = await adminService.createCommission(req.body);
      return sendSuccess(res, result, 'Commission rule created', 201);
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async updateCommission(req: Request, res: Response) {
    try {
      const { id, ...data } = req.body;
      const result = await adminService.updateCommission(id, data);
      return sendSuccess(res, result, 'Commission rule updated');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async deleteCommission(req: Request, res: Response) {
    try {
      const { id } = req.body;
      const result = await adminService.deleteCommission(id);
      return sendSuccess(res, result, 'Commission rule deleted');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getSubscriptions(req: Request, res: Response) {
    try {
      const result = await adminService.getSubscriptions();
      return sendSuccess(res, result, 'Subscriptions retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getAuditLogs(req: Request, res: Response) {
    try {
      const result = await adminService.getAuditLogs();
      return sendSuccess(res, result, 'Audit logs retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  // 11. Recharge Offers & Promotional Wallets
  async getRechargeOffers(req: Request, res: Response) {
    try {
      const { app } = req.query;
      const result = await adminService.getRechargeOffers(app as string);
      return sendSuccess(res, result, 'Recharge offers retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async createRechargeOffer(req: Request, res: Response) {
    try {
      const result = await adminService.saveRechargeOffer(req.body);
      return sendSuccess(res, result, 'Recharge offer created successfully', 201);
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async updateRechargeOffer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await adminService.saveRechargeOffer({ ...req.body, offerId: id || req.body.offerId });
      return sendSuccess(res, result, 'Recharge offer updated successfully');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async updateRechargeOfferStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const result = await adminService.updateRechargeOfferStatus(id, status);
      return sendSuccess(res, result, 'Recharge offer status updated');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getWalletTransactions(req: Request, res: Response) {
    try {
      const { app, accountType, status, search, page, limit } = req.query;
      const result = await adminService.getWalletTransactions({
        app: app as string,
        accountType: accountType as string,
        status: status as string,
        search: search as string,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 50,
      });
      return sendSuccess(res, result, 'Wallet transactions retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getWalletAnalytics(req: Request, res: Response) {
    try {
      const result = await adminService.getWalletAnalytics();
      return sendSuccess(res, result, 'Wallet analytics retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }
}

export const adminController = new AdminController();
