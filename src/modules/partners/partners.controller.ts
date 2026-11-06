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
      let partnerId = (req.query.partnerId as string) || (req.user as any)?.partnerId;
      if (!partnerId && req.user?.userId) {
        try {
          const reg = await partnersService.getRegistration(req.user.userId);
          partnerId = reg?.partnerId;
        } catch {
          // Public browsing request
        }
      }
      const result = await partnersService.getGroceryProducts(partnerId);
      return sendSuccess(res, result, 'Products retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getGroceryProductById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await partnersService.getGroceryProductById(id);
      return sendSuccess(res, result, 'Product retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 404);
    }
  }

  private async getPartnerId(req: Request): Promise<string> {
    if (req.user?.partnerId) return req.user.partnerId;
    if (req.user?.userId) {
      const reg = await partnersService.getRegistration(req.user.userId);
      if (reg && (reg.id || (reg as any).partnerId)) return (reg.id || (reg as any).partnerId);
    }
    return 'ptn_default';
  }

  async createGroceryProduct(req: Request, res: Response) {
    try {
      const partnerId = await this.getPartnerId(req);
      const result = await partnersService.createGroceryProduct(partnerId, req.body);
      return sendSuccess(res, result, 'Product created successfully', 201);
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async updateGroceryProduct(req: Request, res: Response) {
    try {
      const partnerId = await this.getPartnerId(req);
      const { id } = req.params;
      const result = await partnersService.updateGroceryProduct(id, partnerId, req.body);
      return sendSuccess(res, result, 'Product updated successfully');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async deleteGroceryProduct(req: Request, res: Response) {
    try {
      const partnerId = await this.getPartnerId(req);
      const { id } = req.params;
      const result = await partnersService.deleteGroceryProduct(id, partnerId);
      return sendSuccess(res, result, 'Product deleted successfully');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getPartnerOrders(req: Request, res: Response) {
    try {
      const partnerId = await this.getPartnerId(req);
      const result = await partnersService.getPartnerOrders(partnerId);
      return sendSuccess(res, result, 'Orders retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async updateOrderStatus(req: Request, res: Response) {
    try {
      const partnerId = await this.getPartnerId(req);
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
      const partnerId = await this.getPartnerId(req);
      const result = await partnersService.getRazorpayIntegration(partnerId);
      return sendSuccess(res, result, 'Razorpay integration settings retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async saveRazorpayIntegration(req: Request, res: Response) {
    try {
      const partnerId = await this.getPartnerId(req);
      const result = await partnersService.saveRazorpayIntegration(partnerId, req.body);
      return sendSuccess(res, result, 'Razorpay credentials encrypted and saved successfully');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  // --- Store Images & Branding Management ---
  async uploadStoreImage(req: Request, res: Response) {
    try {
      const { image, type } = req.body;
      if (!image) {
        return sendError(res, 'Image payload (base64 dataUri or URL) is required', 400);
      }
      const imageType = type === 'logo' || type === 'cover' || type === 'gallery' ? type : 'gallery';
      const result = await partnersService.uploadStoreImage(req.user!.userId, image, imageType);
      return sendSuccess(res, result, 'Store photo uploaded to Cloudinary successfully', 201);
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getStoreBranding(req: Request, res: Response) {
    try {
      const result = await partnersService.getStoreBranding(req.user!.userId);
      return sendSuccess(res, result, 'Store branding retrieved successfully');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async updateStoreBranding(req: Request, res: Response) {
    try {
      const result = await partnersService.updateStoreBranding(req.user!.userId, req.body);
      return sendSuccess(res, result, 'Store branding updated successfully');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async deleteGalleryImage(req: Request, res: Response) {
    try {
      const imageUrl = (req.body?.imageUrl || req.query?.imageUrl) as string;
      if (!imageUrl) {
        return sendError(res, 'imageUrl is required to remove photo', 400);
      }
      const result = await partnersService.deleteGalleryImage(req.user!.userId, imageUrl);
      return sendSuccess(res, result, 'Gallery photo removed successfully');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }
}

export const partnersController = new PartnersController();
