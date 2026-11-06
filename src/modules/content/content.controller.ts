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
      const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
      const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;
      const result = await contentService.getNearbyPartners(category, lat, lng);
      return sendSuccess(res, result, 'Partners retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getStores(req: Request, res: Response) {
    try {
      const { category, search, sort, cuisine } = req.query;
      const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
      const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;
      const isOpen = req.query.isOpen === 'true' ? true : undefined;
      const deliveryAvailable = req.query.deliveryAvailable === 'true' ? true : undefined;

      const result = await contentService.getStores({
        category: category as string,
        lat,
        lng,
        search: search as string,
        sort: sort as string,
        cuisine: cuisine as string,
        isOpen,
        deliveryAvailable,
      });
      return sendSuccess(res, result, 'Stores retrieved successfully');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getNearbyStores(req: Request, res: Response) {
    try {
      const lat = req.query.latitude !== undefined
        ? parseFloat(req.query.latitude as string)
        : req.query.lat !== undefined
        ? parseFloat(req.query.lat as string)
        : 11.1217;
      const lng = req.query.longitude !== undefined
        ? parseFloat(req.query.longitude as string)
        : req.query.lng !== undefined
        ? parseFloat(req.query.lng as string)
        : 76.1283;
      const radius = req.query.radius ? parseFloat(req.query.radius as string) : 15;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const search = req.query.search as string;

      const result = await contentService.getNearbyStores({
        category: 'grocery',
        latitude: lat,
        longitude: lng,
        radius,
        page,
        limit,
        search,
      });
      return sendSuccess(res, result, 'Nearby grocery stores retrieved successfully');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getNearbyRestaurants(req: Request, res: Response) {
    try {
      const lat = req.query.latitude !== undefined
        ? parseFloat(req.query.latitude as string)
        : req.query.lat !== undefined
        ? parseFloat(req.query.lat as string)
        : 11.1217;
      const lng = req.query.longitude !== undefined
        ? parseFloat(req.query.longitude as string)
        : req.query.lng !== undefined
        ? parseFloat(req.query.lng as string)
        : 76.1283;
      const radius = req.query.radius ? parseFloat(req.query.radius as string) : 15;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const search = req.query.search as string;

      const result = await contentService.getNearbyStores({
        category: 'restaurant',
        latitude: lat,
        longitude: lng,
        radius,
        page,
        limit,
        search,
      });
      return sendSuccess(res, result, 'Nearby restaurants retrieved successfully');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getStoreById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
      const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;
      const result = await contentService.getStoreById(id, lat, lng);
      if (!result) {
        return sendError(res, `Store or restaurant ${id} not found`, 404);
      }
      return sendSuccess(res, result, 'Store details retrieved successfully');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getStoreProducts(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const category = req.query.category as string;
      const search = req.query.search as string;
      const result = await contentService.getStoreProducts(id, category, search);
      return sendSuccess(res, result, 'Store products retrieved successfully');
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
