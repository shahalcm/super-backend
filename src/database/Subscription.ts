// src/database/Subscription.ts
import { Schema, model, Document } from 'mongoose';

export interface ISubscriptionPlan extends Document {
  planId: string;
  name: string;
  category: 'grocery' | 'hotel' | 'clinic' | 'all';
  monthlyPrice: number;
  annualPrice: number;
  currency: string;
  trialDays: number;
  features: string[];
  productLimit: number;
  staffLimit: number;
  commissionRate: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionPlanSchema = new Schema<ISubscriptionPlan>(
  {
    planId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    category: {
      type: String,
      enum: ['grocery', 'hotel', 'clinic', 'all'],
      default: 'all',
    },
    monthlyPrice: { type: Number, required: true, min: 0 },
    annualPrice: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    trialDays: { type: Number, default: 14 },
    features: { type: [String], default: [] },
    productLimit: { type: Number, default: 500 },
    staffLimit: { type: Number, default: 5 },
    commissionRate: { type: Number, default: 5 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const SubscriptionPlanModel = model<ISubscriptionPlan>(
  'SubscriptionPlan',
  SubscriptionPlanSchema
);
