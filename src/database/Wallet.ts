// src/database/Wallet.ts
import { Schema, model, Document } from 'mongoose';

export type WalletAccountType = 'taxi_driver' | 'partner' | 'delivery_rider' | 'customer';
export type WalletApp = 'taxi' | 'partner' | 'delivery' | 'ubssuper';
export type WalletStatus = 'active' | 'frozen';

export interface IWallet extends Document {
  walletId: string;
  userId: string;
  app: WalletApp;
  accountType: WalletAccountType;
  cashBalance: number;
  promotionalBalance: number;
  currency: string;
  totalRecharged: number;
  totalBonusReceived: number;
  totalPlatformUsageDeducted: number;
  totalWithdrawn: number;
  status: WalletStatus;
  lastRechargedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WalletSchema = new Schema<IWallet>(
  {
    walletId: { type: String, required: true, unique: true, index: true },
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
    cashBalance: { type: Number, default: 0, min: 0 },
    promotionalBalance: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'INR' },
    totalRecharged: { type: Number, default: 0, min: 0 },
    totalBonusReceived: { type: Number, default: 0, min: 0 },
    totalPlatformUsageDeducted: { type: Number, default: 0, min: 0 },
    totalWithdrawn: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['active', 'frozen'],
      default: 'active',
      index: true,
    },
    lastRechargedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for total available usable balance
WalletSchema.virtual('totalAvailableBalance').get(function (this: IWallet) {
  return Number((this.cashBalance + this.promotionalBalance).toFixed(2));
});

// Compound index to guarantee one wallet per user per app & accountType
WalletSchema.index({ userId: 1, app: 1, accountType: 1 }, { unique: true });

export const WalletModel = model<IWallet>('Wallet', WalletSchema);

