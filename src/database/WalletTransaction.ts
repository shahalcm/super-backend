// src/database/WalletTransaction.ts
import { Schema, model, Document } from 'mongoose';
import { WalletAccountType, WalletApp } from './Wallet.js';

export type WalletTransactionType =
  | 'recharge_cash'
  | 'recharge_promo'
  | 'platform_charge_cash'
  | 'platform_charge_promo'
  | 'payout_withdrawal'
  | 'refund'
  | 'admin_adjustment'
  | 'promo_expiry';

export type WalletTransactionStatus = 'pending' | 'completed' | 'failed' | 'reversed';

export interface IWalletTransaction extends Document {
  transactionId: string;
  walletId: string;
  userId: string;
  app: WalletApp;
  accountType: WalletAccountType;
  transactionType: WalletTransactionType;
  amount: number;
  currency: string;
  cashBalanceChange: number;
  promoBalanceChange: number;
  previousCashBalance: number;
  newCashBalance: number;
  previousPromoBalance: number;
  newPromoBalance: number;
  gateway: 'razorpay' | 'cash' | 'system' | 'admin';
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  gatewaySignature?: string;
  rechargeOfferId?: string;
  status: WalletTransactionStatus;
  title: string;
  subtitle?: string;
  failureReason?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const WalletTransactionSchema = new Schema<IWalletTransaction>(
  {
    transactionId: { type: String, required: true, unique: true, index: true },
    walletId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    app: {
      type: String,
      enum: ['taxi', 'partner', 'delivery', 'ubssuper'],
      required: true,
      index: true,
    },
    accountType: {
      type: String,
      enum: ['taxi_driver', 'partner', 'delivery_rider', 'customer'],
      required: true,
      index: true,
    },
    transactionType: {
      type: String,
      enum: [
        'recharge_cash',
        'recharge_promo',
        'platform_charge_cash',
        'platform_charge_promo',
        'payout_withdrawal',
        'refund',
        'admin_adjustment',
        'promo_expiry',
      ],
      required: true,
      index: true,
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    cashBalanceChange: { type: Number, default: 0 },
    promoBalanceChange: { type: Number, default: 0 },
    previousCashBalance: { type: Number, required: true },
    newCashBalance: { type: Number, required: true },
    previousPromoBalance: { type: Number, required: true },
    newPromoBalance: { type: Number, required: true },
    gateway: {
      type: String,
      enum: ['razorpay', 'cash', 'system', 'admin'],
      default: 'razorpay',
    },
    gatewayOrderId: { type: String, index: true },
    gatewayPaymentId: { type: String, index: true },
    gatewaySignature: { type: String },
    rechargeOfferId: { type: String, index: true },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'reversed'],
      default: 'completed',
      index: true,
    },
    title: { type: String, required: true },
    subtitle: { type: String },
    failureReason: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

WalletTransactionSchema.index({ userId: 1, createdAt: -1 });

export const WalletTransactionModel = model<IWalletTransaction>(
  'WalletTransaction',
  WalletTransactionSchema
);
