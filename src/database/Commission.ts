// src/database/Commission.ts
import { Schema, model, Document } from 'mongoose';

export interface ICommissionRule extends Document {
  ruleId: string;
  app: 'ubssuper' | 'taxi' | 'delivery' | 'partner';
  serviceCategory: string;
  partnerCategory?: 'grocery' | 'hotel' | 'clinic';
  partnerId?: string;
  type: 'percentage' | 'fixed' | 'hybrid';
  percentage: number;
  fixedFee: number;
  minCommission: number;
  maxCommission: number;
  isActive: boolean;
  effectiveDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CommissionRuleSchema = new Schema<ICommissionRule>(
  {
    ruleId: { type: String, required: true, unique: true, index: true },
    app: {
      type: String,
      enum: ['ubssuper', 'taxi', 'delivery', 'partner'],
      required: true,
      index: true,
    },
    serviceCategory: { type: String, required: true, index: true },
    partnerCategory: { type: String, enum: ['grocery', 'hotel', 'clinic'] },
    partnerId: { type: String, sparse: true },
    type: {
      type: String,
      enum: ['percentage', 'fixed', 'hybrid'],
      default: 'percentage',
    },
    percentage: { type: Number, default: 10, min: 0, max: 100 },
    fixedFee: { type: Number, default: 0, min: 0 },
    minCommission: { type: Number, default: 0 },
    maxCommission: { type: Number, default: 5000 },
    isActive: { type: Boolean, default: true, index: true },
    effectiveDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const CommissionRuleModel = model<ICommissionRule>('CommissionRule', CommissionRuleSchema);
