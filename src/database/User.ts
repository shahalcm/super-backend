// src/database/User.ts
import mongoose, { Schema, model, Document } from 'mongoose';

export type UserRole =
  | 'CUSTOMER'
  | 'TAXI_DRIVER'
  | 'DELIVERY_RIDER'
  | 'PARTNER_OWNER'
  | 'PARTNER_STAFF'
  | 'ADMIN'
  | 'SUPER_ADMIN';

export interface IUser extends Document {
  userId: string;
  phone: string;
  email?: string;
  passwordHash?: string;
  fullName: string;
  avatarUrl?: string;
  roles: UserRole[];
  currentRole: UserRole;
  status: 'active' | 'suspended' | 'pending';
  fcmTokens: string[];
  partnerBusinessId?: string;
  taxiDriverProfileId?: string;
  deliveryRiderProfileId?: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    phone: { type: String, required: true, unique: true, index: true },
    email: { type: String, sparse: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    fullName: { type: String, required: true, trim: true },
    avatarUrl: { type: String },
    roles: {
      type: [String],
      enum: [
        'CUSTOMER',
        'TAXI_DRIVER',
        'DELIVERY_RIDER',
        'PARTNER_OWNER',
        'PARTNER_STAFF',
        'ADMIN',
        'SUPER_ADMIN',
      ],
      default: ['CUSTOMER'],
    },
    currentRole: {
      type: String,
      enum: [
        'CUSTOMER',
        'TAXI_DRIVER',
        'DELIVERY_RIDER',
        'PARTNER_OWNER',
        'PARTNER_STAFF',
        'ADMIN',
        'SUPER_ADMIN',
      ],
      default: 'CUSTOMER',
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'pending'],
      default: 'active',
      index: true,
    },
    fcmTokens: { type: [String], default: [] },
    partnerBusinessId: { type: String },
    taxiDriverProfileId: { type: String },
    deliveryRiderProfileId: { type: String },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

export const UserModel = model<IUser>('User', UserSchema);
