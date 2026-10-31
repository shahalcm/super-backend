// src/database/Content.ts
import { Schema, model, Document } from 'mongoose';

// 1. Home Discovery Banners
export interface IBanner extends Document {
  bannerId: string;
  app: 'ubssuper' | 'taxi' | 'delivery' | 'partner' | 'all';
  title: string;
  subtitle?: string;
  imageUrl: string;
  targetScreen?: string;
  targetCategory?: string;
  actionUrl?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BannerSchema = new Schema<IBanner>(
  {
    bannerId: { type: String, required: true, unique: true, index: true },
    app: {
      type: String,
      enum: ['ubssuper', 'taxi', 'delivery', 'partner', 'all'],
      default: 'ubssuper',
      index: true,
    },
    title: { type: String, required: true },
    subtitle: { type: String },
    imageUrl: { type: String, required: true },
    targetScreen: { type: String },
    targetCategory: { type: String },
    actionUrl: { type: String },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export const BannerModel = model<IBanner>('Banner', BannerSchema);

// 2. Promotional Coupons
export interface IPromotion extends Document {
  code: string;
  title: string;
  description?: string;
  app: 'ubssuper' | 'taxi' | 'delivery' | 'partner' | 'all';
  discountType: 'percentage' | 'flat';
  discountValue: number;
  minOrderValue: number;
  maxDiscount?: number;
  validFrom: Date;
  validUntil: Date;
  usageLimit: number;
  usageCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PromotionSchema = new Schema<IPromotion>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    title: { type: String, required: true },
    description: { type: String },
    app: {
      type: String,
      enum: ['ubssuper', 'taxi', 'delivery', 'partner', 'all'],
      default: 'all',
    },
    discountType: { type: String, enum: ['percentage', 'flat'], required: true },
    discountValue: { type: Number, required: true, min: 1 },
    minOrderValue: { type: Number, default: 0 },
    maxDiscount: { type: Number },
    validFrom: { type: Date, default: Date.now },
    validUntil: { type: Date, required: true },
    usageLimit: { type: Number, default: 1000 },
    usageCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export const PromotionModel = model<IPromotion>('Promotion', PromotionSchema);

// 3. Ecosystem App Status & Master Configuration
export interface IEcosystemAppConfig extends Document {
  appId: 'ubssuper' | 'taxi' | 'delivery' | 'partner';
  name: string;
  version: string;
  minSupportedVersion: string;
  status: 'active' | 'maintenance' | 'beta';
  maintenanceNotice: string;
  enabledFeatures: Record<string, boolean>;
  supportedRegions: string[];
  createdAt: Date;
  updatedAt: Date;
}

const EcosystemAppConfigSchema = new Schema<IEcosystemAppConfig>(
  {
    appId: {
      type: String,
      enum: ['ubssuper', 'taxi', 'delivery', 'partner'],
      required: true,
      unique: true,
      index: true,
    },
    name: { type: String, required: true },
    version: { type: String, default: '1.0.0' },
    minSupportedVersion: { type: String, default: '1.0.0' },
    status: { type: String, enum: ['active', 'maintenance', 'beta'], default: 'active' },
    maintenanceNotice: { type: String, default: 'All systems operational.' },
    enabledFeatures: { type: Map, of: Boolean, default: {} },
    supportedRegions: { type: [String], default: ['All India'] },
  },
  { timestamps: true }
);

export const EcosystemAppConfigModel = model<IEcosystemAppConfig>(
  'EcosystemAppConfig',
  EcosystemAppConfigSchema
);
