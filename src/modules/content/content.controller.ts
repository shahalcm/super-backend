// src/modules/content/content.controller.ts
import { Request, Response } from 'express';
import { contentService } from './content.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';

export class ContentController {
  async getBanners(req: Request, res: Response) {
    try {
      const app = (req.query.app as string) || 'ubssuper';
      const result = await contentService.getBanners(app);
      return sendSuccess(res, result, 'Banners retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getPromotions(req: Request, res: Response) {
    try {
      const app = (req.query.app as string) || 'all';
      const result = await contentService.getPromotions(app);
      return sendSuccess(res, result, 'Promotions retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getEcosystemStatus(req: Request, res: Response) {
    try {
      const result = await contentService.getEcosystemStatus();
      return sendSuccess(res, result, 'Ecosystem apps status retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getCategories(req: Request, res: Response) {
    try {
      const result = await contentService.getCategories();
      return sendSuccess(res, result, 'Categories retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getGroceryCatalog(req: Request, res: Response) {
    try {
      const category = req.query.category as string;
      const result = await contentService.getGroceryCatalog(category);
      return sendSuccess(res, result, 'Grocery catalog retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getPartners(req: Request, res: Response) {
    try {
      const category = req.query.category as string;
      const result = await contentService.getNearbyPartners(category);
      return sendSuccess(res, result, 'Partners retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getHotels(req: Request, res: Response) {
    try {
      const result = await contentService.getHotels();
      return sendSuccess(res, result, 'Hotels retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getDoctors(req: Request, res: Response) {
    try {
      const result = await contentService.getDoctors();
      return sendSuccess(res, result, 'Doctors retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }
}

export const contentController = new ContentController();
