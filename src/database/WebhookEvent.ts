// src/database/WebhookEvent.ts
import { Schema, model, Document } from 'mongoose';

export interface IWebhookEvent extends Document {
  eventId: string;
  eventType: string;
  source: string;
  payload: Record<string, any>;
  status: 'received' | 'processing' | 'processed' | 'failed' | 'ignored';
  errorDetails?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WebhookEventSchema = new Schema<IWebhookEvent>(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    eventType: { type: String, required: true, index: true },
    source: { type: String, default: 'razorpay', index: true },
    payload: { type: Schema.Types.Mixed },
    status: {
      type: String,
      enum: ['received', 'processing', 'processed', 'failed', 'ignored'],
      default: 'received',
      index: true,
    },
    errorDetails: { type: String },
    processedAt: { type: Date },
  },
  { timestamps: true }
);

WebhookEventSchema.index({ eventId: 1, source: 1 }, { unique: true });
WebhookEventSchema.index({ createdAt: -1 });

export const WebhookEventModel = model<IWebhookEvent>('WebhookEvent', WebhookEventSchema);

