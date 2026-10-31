// src/database/Payout.ts
import { Schema, model, Document } from 'mongoose';

export type PayoutStatus =
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'processing'
  | 'paid'
  | 'rejected'
  | 'failed';

export interface IPayout extends Document {
  payoutId: string;
  recipientType: 'partner' | 'driver' | 'rider';
  recipientId: string;
  recipientName: string;
  bankDetails: {
    bankName: string;
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    upiId?: string;
  };
  amount: number;
  currency: string;
  status: PayoutStatus;
  requestedAt: Date;
  processedAt?: Date;
  processedBy?: string;
  referenceNumber?: string;
  rejectionReason?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PayoutSchema = new Schema<IPayout>(
  {
    payoutId: { type: String, required: true, unique: true, index: true },
    recipientType: {
      type: String,
      enum: ['partner', 'driver', 'rider'],
      required: true,
      index: true,
    },
    recipientId: { type: String, required: true, index: true },
    recipientName: { type: String, required: true },
    bankDetails: {
      bankName: { type: String, required: true },
      accountHolderName: { type: String, required: true },
      accountNumber: { type: String, required: true },
      ifscCode: { type: String, required: true },
      upiId: { type: String },
    },
    amount: { type: Number, required: true, min: 100 },
    currency: { type: String, default: 'INR' },
    status: {
      type: String,
      enum: ['pending', 'under_review', 'approved', 'processing', 'paid', 'rejected', 'failed'],
      default: 'pending',
      index: true,
    },
    requestedAt: { type: Date, default: Date.now },
    processedAt: { type: Date },
    processedBy: { type: String },
    referenceNumber: { type: String },
    rejectionReason: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

export const PayoutModel = model<IPayout>('Payout', PayoutSchema);
