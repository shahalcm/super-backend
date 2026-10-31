// src/database/Refund.ts
import { Schema, model, Document } from 'mongoose';

export type RefundStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'processed';

export interface IRefund extends Document {
  refundId: string;
  transactionId: string;
  orderId: string;
  customerId: string;
  customerName: string;
  amount: number;
  currency: string;
  reason: string;
  requestedBy: string;
  status: RefundStatus;
  gatewayRefundId?: string;
  approvedBy?: string;
  rejectionReason?: string;
  internalNotes?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RefundSchema = new Schema<IRefund>(
  {
    refundId: { type: String, required: true, unique: true, index: true },
    transactionId: { type: String, required: true, index: true },
    orderId: { type: String, required: true, index: true },
    customerId: { type: String, required: true, index: true },
    customerName: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    reason: { type: String, required: true },
    requestedBy: { type: String, default: 'customer' },
    status: {
      type: String,
      enum: ['pending', 'under_review', 'approved', 'rejected', 'processed'],
      default: 'pending',
      index: true,
    },
    gatewayRefundId: { type: String },
    approvedBy: { type: String },
    rejectionReason: { type: String },
    internalNotes: { type: String, default: '' },
    processedAt: { type: Date },
  },
  { timestamps: true }
);

export const RefundModel = model<IRefund>('Refund', RefundSchema);
