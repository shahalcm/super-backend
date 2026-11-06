// src/database/PropertyListingPayment.ts
import { Schema, model, Document } from 'mongoose';

export type PropertyPaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface IPropertyListingPayment extends Document {
  paymentId: string; // Unique transaction reference (e.g. PLP-123456)
  userId: string;
  userName: string;
  userPhone: string;
  propertyId: string;
  propertyTitle: string;
  amount: number; // In Rupees (e.g., 50)
  amountInPaise: number; // In Paise (e.g., 5000)
  currency: string; // 'INR'
  feeSnapshot: number; // Server-validated fee at time order was initiated
  paymentProvider: 'razorpay' | 'free';

  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;

  status: PropertyPaymentStatus;
  failureReason?: string;
  createdAt: Date;
  paidAt?: Date;
  updatedAt: Date;
}

const PropertyListingPaymentSchema = new Schema<IPropertyListingPayment>(
  {
    paymentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    userName: {
      type: String,
      required: true,
    },
    userPhone: {
      type: String,
      required: true,
    },
    propertyId: {
      type: String,
      required: true,
      index: true,
    },
    propertyTitle: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    amountInPaise: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: 'INR',
    },
    feeSnapshot: {
      type: Number,
      required: true,
    },
    paymentProvider: {
      type: String,
      enum: ['razorpay', 'free'],
      required: true,
      default: 'razorpay',
    },
    razorpayOrderId: {
      type: String,
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      index: true,
    },
    razorpaySignature: {
      type: String,
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },
    failureReason: {
      type: String,
    },
    paidAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const PropertyListingPaymentModel = model<IPropertyListingPayment>(
  'PropertyListingPayment',
  PropertyListingPaymentSchema
);
