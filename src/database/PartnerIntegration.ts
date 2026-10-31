// src/database/PartnerIntegration.ts
import { Schema, model, Document } from 'mongoose';

export interface IEncryptedCredentials {
  keyId?: string; // Public API Key ID
  encryptedSecret?: string; // AES-256-GCM ciphertext
  iv?: string; // 12-byte initialization vector (hex)
  tag?: string; // 16-byte authentication tag (hex)
  encryptedWebhookSecret?: string;
  webhookIv?: string;
  webhookTag?: string;
}

export interface IPartnerIntegration extends Document {
  id: string;
  partnerId: string;
  provider: 'razorpay' | 'whatsapp' | 'google_maps' | 'logistics' | 'sms' | 'custom';
  integrationName: string;
  encryptedCredentials: IEncryptedCredentials;
  environment: 'test' | 'live';
  status: 'connected' | 'disconnected' | 'error' | 'unconfigured';
  settings?: Record<string, string>;
  accountMetadata?: {
    accountId?: string;
    accountName?: string;
    email?: string;
    liveMode?: boolean;
    lastLatencyMs?: number;
    [key: string]: any;
  };
  recentError?: string;
  lastTestedAt?: Date;
  lastUpdatedAt: Date;
  createdAt: Date;
}

const PartnerIntegrationSchema = new Schema<IPartnerIntegration>(
  {
    id: { type: String, required: true, unique: true, index: true },
    partnerId: { type: String, required: true, index: true },
    provider: {
      type: String,
      required: true,
      enum: ['razorpay', 'whatsapp', 'google_maps', 'logistics', 'sms', 'custom'],
      index: true,
    },
    integrationName: { type: String, required: true, trim: true },
    encryptedCredentials: {
      keyId: { type: String, trim: true },
      encryptedSecret: { type: String },
      iv: { type: String },
      tag: { type: String },
      encryptedWebhookSecret: { type: String },
      webhookIv: { type: String },
      webhookTag: { type: String },
    },
    environment: {
      type: String,
      enum: ['test', 'live'],
      default: 'test',
    },
    status: {
      type: String,
      enum: ['connected', 'disconnected', 'error', 'unconfigured'],
      default: 'unconfigured',
    },
    settings: {
      type: Map,
      of: String,
      default: {},
    },
    accountMetadata: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },
    recentError: { type: String },
    lastTestedAt: { type: Date },
    lastUpdatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

PartnerIntegrationSchema.index({ partnerId: 1, provider: 1 }, { unique: true });

export const PartnerIntegrationModel = model<IPartnerIntegration>(
  'PartnerIntegration',
  PartnerIntegrationSchema
);
