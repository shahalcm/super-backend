// src/database/Payment.ts
import { Schema, model, Document } from 'mongoose';

export type PaymentGateway = 'razorpay' | 'cash' | 'wallet';
export type PaymentTransactionStatus =
  | 'pending'
  | 'captured'
  | 'failed'
  | 'refunded'
  | 'partially_refunded';

export interface IPayment extends Document {
  transactionId: string;
  orderId?: string;
  rideId?: string;
  customerId: string;
  customerName: string;

  app: 'ubssuper' | 'taxi' | 'delivery' | 'partner';
  serviceCategory: string;

  gateway: PaymentGateway;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  gatewaySignature?: string;

  amount: number; // In minor units (paise for INR)
  majorAmount: number; // In major units (Rupees)
  currency: string;

  gatewayFee: number;
  platformCommission: number;
  partnerPayable: number;
  driverPayable: number;

  status: PaymentTransactionStatus;
  failureReason?: string;

  paymentMethodDetails?: {
    type?: string;
    issuer?: string;
    last4?: string;
  };

  reconciliationStatus: 'reconciled' | 'pending_recon' | 'disputed';
  capturedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    transactionId: { type: String, required: true, unique: true, index: true },
    orderId: { type: String, index: true },
    rideId: { type: String, index: true },
    customerId: { type: String, required: true, index: true },
    customerName: { type: String, required: true },

    app: {
      type: String,
      enum: ['ubssuper', 'taxi', 'delivery', 'partner'],
      required: true,
      index: true,
    },
    serviceCategory: { type: String, required: true },

    gateway: {
      type: String,
      enum: ['razorpay', 'cash', 'wallet'],
      default: 'razorpay',
    },
    gatewayOrderId: { type: String, index: true },
    gatewayPaymentId: { type: String, index: true },
    gatewaySignature: { type: String },

    amount: { type: Number, required: true, min: 0 },
    majorAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },

    gatewayFee: { type: Number, default: 0 },
    platformCommission: { type: Number, default: 0 },
    partnerPayable: { type: Number, default: 0 },
    driverPayable: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ['pending', 'captured', 'failed', 'refunded', 'partially_refunded'],
      default: 'pending',
      index: true,
    },
    failureReason: { type: String },

    paymentMethodDetails: {
      type: { type: String },
      issuer: { type: String },
      last4: { type: String },
    },

    reconciliationStatus: {
      type: String,
      enum: ['reconciled', 'pending_recon', 'disputed'],
      default: 'reconciled',
    },
    capturedAt: { type: Date },
  },
  { timestamps: true }
);

PaymentSchema.index({ customerId: 1, createdAt: -1 });
PaymentSchema.index({ app: 1, status: 1 });

export const PaymentModel = model<IPayment>('Payment', PaymentSchema);
