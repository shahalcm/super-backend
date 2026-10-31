// src/database/Otp.ts
import { Schema, model, Document } from 'mongoose';

export interface IOtp extends Document {
  phone: string;
  otpHash: string;
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
}

const OtpSchema = new Schema<IOtp>(
  {
    phone: { type: String, required: true, index: true },
    otpHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // MongoDB automatic TTL deletion
    },
  },
  { timestamps: true }
);

export const OtpModel = model<IOtp>('Otp', OtpSchema);
