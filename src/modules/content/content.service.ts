// src/modules/content/content.service.ts
import mongoose from 'mongoose';
import {
  BannerModel,
  PromotionModel,
  EcosystemAppConfigModel,
  GroceryProductModel,
  PartnerBusinessModel,
  HotelRoomModel,
  ClinicDoctorModel,
} from '../../database/index.js';

const defaultBanners = [
  {
    bannerId: 'bnr_super_welcome',
    app: 'ubssuper',
    title: 'Get 20% OFF Your First Grocery Order',
    subtitle: 'Use code SUPERWELCOME at checkout',
    imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
    targetCategory: 'grocery',
    displayOrder: 1,
    isActive: true,
  },
  {
    bannerId: 'bnr_taxi_fast',
    app: 'ubssuper',
    title: 'Fastest Cabs in Bengaluru',
    subtitle: 'Verified drivers at zero cancellation surge',
    imageUrl: 'https://images.unsplash.com/photo-1511527661048-7fe73d85e9a4?auto=format&fit=crop&w=800&q=80',
    targetScreen: 'taxi',
    displayOrder: 2,
    isActive: true,
  },
];

const defaultPromotions = [
  {
    code: 'SUPERWELCOME',
    title: 'Welcome Discount ₹100 Flat OFF',
    app: 'ubssuper',
    discountType: 'flat',
    discountValue: 100,
    minOrderValue: 299,
    validUntil: new Date('2027-12-31'),
    isActive: true,
  },
];

export class ContentService {
  async getBanners(app = 'ubssuper') {
    if (mongoose.connection.readyState === 1) {
      try {
        const banners = await BannerModel.find({
          app: { $in: [app, 'all'] },
          isActive: true,
        }).sort({ displayOrder: 1 });
        if (banners && banners.length > 0) return banners;
      } catch {
        // Fallback to default
      }
    }
    return defaultBanners.filter((b) => b.app === app || b.app === 'all');
  }

  async getPromotions(app = 'all') {
    if (mongoose.connection.readyState === 1) {
      try {
        const promotions = await PromotionModel.find({
          app: { $in: [app, 'all'] },
          isActive: true,
          validUntil: { $gte: new Date() },
        }).sort({ createdAt: -1 });
        if (promotions && promotions.length > 0) return promotions;
      } catch {
        // Fallback
      }
    }
    return defaultPromotions;
  }

  async getEcosystemStatus() {
    if (mongoose.connection.readyState === 1) {
      try {
        const apps = await EcosystemAppConfigModel.find();
        if (apps && apps.length > 0) return apps;
      } catch {
        // Fallback
      }
    }
    return [
      { appId: 'ubssuper', status: 'active', version: '2.4.1' },
      { appId: 'taxi', status: 'active', version: '1.9.0' },
      { appId: 'delivery', status: 'active', version: '1.5.2' },
      { appId: 'partner', status: 'active', version: '2.1.0' },
    ];
  }

  async getGroceryCatalog(category?: string) {
    if (mongoose.connection.readyState === 1) {
      try {
        const filter: any = { inStock: true };
        if (category && category !== 'All') {
          filter.category = category;
        }
        return await GroceryProductModel.find(filter).sort({ isFeatured: -1, createdAt: -1 });
      } catch {
        // Fallback
      }
    }
    return [];
  }

  async getNearbyPartners(category?: string) {
    if (mongoose.connection.readyState === 1) {
      try {
        const filter: any = { status: 'approved' };
        if (category) {
          filter.category = category;
        }
        return await PartnerBusinessModel.find(filter).limit(20);
      } catch {
        // Fallback
      }
    }
    return [];
  }

  async getHotels() {
    if (mongoose.connection.readyState === 1) {
      try {
        return await HotelRoomModel.find({ isAvailable: true }).limit(20);
      } catch {
        // Fallback
      }
    }
    return [];
  }

  async getDoctors() {
    if (mongoose.connection.readyState === 1) {
      try {
        return await ClinicDoctorModel.find({ isAvailable: true }).limit(20);
      } catch {
        // Fallback
      }
    }
    return [];
  }
}

export const contentService = new ContentService();
