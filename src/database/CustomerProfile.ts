// src/database/CustomerProfile.ts
import { Schema, model, Document } from 'mongoose';

export interface ISavedAddress {
  id: string;
  label: 'Home' | 'Work' | 'Other';
  addressLine: string;
  city: string;
  state: string;
  postalCode: string;
  landmark?: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  isDefault: boolean;
}

export interface ICustomerProfile extends Document {
  userId: string;
  savedAddresses: ISavedAddress[];
  walletBalance: number;
  totalOrders: number;
  totalSpent: number;
  rating: number;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerProfileSchema = new Schema<ICustomerProfile>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    savedAddresses: [
      {
        id: { type: String, required: true },
        label: { type: String, enum: ['Home', 'Work', 'Other'], default: 'Home' },
        addressLine: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        postalCode: { type: String, required: true },
        landmark: { type: String },
        location: {
          type: { type: String, enum: ['Point'], default: 'Point' },
          coordinates: { type: [Number], required: true },
        },
        isDefault: { type: Boolean, default: false },
      },
    ],
    walletBalance: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    rating: { type: Number, default: 5.0 },
  },
  { timestamps: true }
);

export const CustomerProfileModel = model<ICustomerProfile>(
  'CustomerProfile',
  CustomerProfileSchema
);
