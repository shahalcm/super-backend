// src/database/PropertyListingFee.ts
import { Schema, model, Document, Model } from 'mongoose';

export interface IFeeHistoryItem {
  amount: number;
  currency: string;
  isEnabled: boolean;
  changedBy: string;
  changedByName: string;
  changedAt: Date;
  reason?: string;
}

export interface IPropertyListingFee extends Document {
  feature: string;
  amount: number; // In Rupees (e.g., 50)
  currency: string; // 'INR'
  isEnabled: boolean;
  updatedBy?: string;
  updatedByName?: string;
  updatedAt: Date;
  history: IFeeHistoryItem[];
}

export interface IPropertyListingFeeModel extends Model<IPropertyListingFee> {
  getActiveFee(): Promise<IPropertyListingFee>;
}

const PropertyListingFeeSchema = new Schema<IPropertyListingFee, IPropertyListingFeeModel>(
  {
    feature: {
      type: String,
      required: true,
      unique: true,
      default: 'real_estate_property_listing',
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      default: 50,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: 'INR',
    },
    isEnabled: {
      type: Boolean,
      required: true,
      default: true,
    },
    updatedBy: {
      type: String,
    },
    updatedByName: {
      type: String,
      default: 'System Admin',
    },
    history: [
      {
        amount: { type: Number, required: true },
        currency: { type: String, required: true, default: 'INR' },
        isEnabled: { type: Boolean, required: true, default: true },
        changedBy: { type: String, required: true },
        changedByName: { type: String, required: true },
        changedAt: { type: Date, default: Date.now },
        reason: { type: String },
      },
    ],
  },
  {
    timestamps: true,
  }
);

/**
 * Fetch or initialize the active property listing fee setting.
 * Default is ₹50 INR, enabled.
 */
PropertyListingFeeSchema.statics.getActiveFee = async function (): Promise<IPropertyListingFee> {
  let fee = await this.findOne({ feature: 'real_estate_property_listing' });
  if (!fee) {
    fee = await this.create({
      feature: 'real_estate_property_listing',
      amount: 50,
      currency: 'INR',
      isEnabled: true,
      updatedByName: 'System Default',
      history: [
        {
          amount: 50,
          currency: 'INR',
          isEnabled: true,
          changedBy: 'system',
          changedByName: 'System Default',
          changedAt: new Date(),
          reason: 'Initial ecosystem real estate listing fee setup',
        },
      ],
    });
  }
  return fee;
};

export const PropertyListingFeeModel = model<IPropertyListingFee, IPropertyListingFeeModel>(
  'PropertyListingFee',
  PropertyListingFeeSchema
);
