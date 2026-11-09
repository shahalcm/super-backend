// src/database/RechargeOffer.ts
import { Schema, model, Document } from 'mongoose';

export type RechargeTargetApp = 'taxi' | 'partner' | 'delivery' | 'ubssuper' | 'all';
export type RechargeUserRole = 'TAXI_DRIVER' | 'PARTNER_OWNER' | 'DELIVERY_RIDER' | 'CUSTOMER' | 'all';
export type RechargeOfferStatus = 'active' | 'inactive' | 'expired';

export interface IRechargeOffer extends Document {
  offerId: string;
  name: string;
  description: string;
  app: RechargeTargetApp;
  userRole: RechargeUserRole;
  rechargeAmount: number;
  promotionalBonus: number;
  totalCredit: number;
  minAmount: number;
  maxAmount: number;
  currency: string;
  startDate: Date;
  expirationDate?: Date;
  status: RechargeOfferStatus;
  terms: string[];
  usageRules: {
    maxUsagePercentPerTx: number;
    eligibleFeeTypes: string[];
    nonWithdrawable: boolean;
    expiryDays?: number;
  };
  badgeText?: string;
  displayOrder: number;
  totalRedemptions: number;
  createdAt: Date;
  updatedAt: Date;
}

const RechargeOfferSchema = new Schema<IRechargeOffer>(
  {
    offerId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    app: {
      type: String,
      enum: ['taxi', 'partner', 'delivery', 'ubssuper', 'all'],
      required: true,
      index: true,
    },
    userRole: {
      type: String,
      enum: ['TAXI_DRIVER', 'PARTNER_OWNER', 'DELIVERY_RIDER', 'CUSTOMER', 'all'],
      required: true,
      index: true,
    },
    rechargeAmount: { type: Number, required: true, min: 1 },
    promotionalBonus: { type: Number, required: true, min: 0 },
    totalCredit: { type: Number, required: true, min: 1 },
    minAmount: { type: Number, default: 1 },
    maxAmount: { type: Number, default: 100000 },
    currency: { type: String, default: 'INR' },
    startDate: { type: Date, default: Date.now },
    expirationDate: { type: Date },
    status: {
      type: String,
      enum: ['active', 'inactive', 'expired'],
      default: 'active',
      index: true,
    },
    terms: {
      type: [String],
      default: [
        'Promotional credits are valid only for platform fees and commissions.',
        'Promotional bonus credits cannot be withdrawn to a bank account or transferred.',
        'Credits are applied automatically upon successful online payment verification.',
      ],
    },
    usageRules: {
      maxUsagePercentPerTx: { type: Number, default: 100 },
      eligibleFeeTypes: {
        type: [String],
        default: ['commission', 'platform_fee', 'subscription', 'lead_fee'],
      },
      nonWithdrawable: { type: Boolean, default: true },
      expiryDays: { type: Number, default: 365 },
    },
    badgeText: { type: String },
    displayOrder: { type: Number, default: 0 },
    totalRedemptions: { type: Number, default: 0 },
  },
  { timestamps: true }
);

RechargeOfferSchema.index({ app: 1, userRole: 1, status: 1 });

export const RechargeOfferModel = model<IRechargeOffer>('RechargeOffer', RechargeOfferSchema);

