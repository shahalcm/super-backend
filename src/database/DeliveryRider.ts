// src/database/DeliveryRider.ts
import { Schema, model, Document } from 'mongoose';
import { VerificationStatus, ApplicationStatus } from './TaxiDriver.js';

export type DeliveryVehicleType = 'motorcycle' | 'scooter' | 'electric_scooter' | 'bicycle';

export interface IDeliveryRider extends Document {
  riderId: string;
  userId: string;
  fullName: string;
  phone: string;
  email?: string;
  status: ApplicationStatus;
  rejectionReason?: string;
  actionRequiredMessage?: string;

  vehicleType: DeliveryVehicleType;
  registrationNumber?: string;
  currentZone: string;

  isOnline: boolean;
  isBusy: boolean;
  currentLocation: {
    type: 'Point';
    coordinates: [number, number];
    updatedAt: Date;
  };

  rating: number;
  totalDeliveries: number;
  totalEarnings: number;
  commissionPaid: number;
  outstandingPayout: number;

  documents: {
    aadhaar: {
      number: string;
      status: VerificationStatus;
      frontUrl: string;
      backUrl?: string;
      rejectionReason?: string;
    };
    licence?: {
      number: string;
      expiryDate: string;
      status: VerificationStatus;
      frontUrl: string;
      rejectionReason?: string;
    };
    rc?: {
      number: string;
      status: VerificationStatus;
      frontUrl: string;
      rejectionReason?: string;
    };
    vehiclePhotos: {
      vehicleUrl: string;
      numberPlateUrl?: string;
      status: VerificationStatus;
      rejectionReason?: string;
    };
  };

  payoutAccount: {
    bankName: string;
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    upiId?: string;
    isVerified: boolean;
  };

  registeredAt: Date;
  approvedAt?: Date;
  lastDeliveryAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DeliveryRiderSchema = new Schema<IDeliveryRider>(
  {
    riderId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, index: true },
    email: { type: String, lowercase: true, trim: true },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'under_review', 'action_required', 'approved', 'rejected', 'suspended'],
      default: 'draft',
      index: true,
    },
    rejectionReason: { type: String },
    actionRequiredMessage: { type: String },

    vehicleType: {
      type: String,
      enum: ['motorcycle', 'scooter', 'electric_scooter', 'bicycle'],
      default: 'motorcycle',
      index: true,
    },
    registrationNumber: { type: String, uppercase: true, trim: true },
    currentZone: { type: String, default: 'Indiranagar, Bengaluru', index: true },

    isOnline: { type: Boolean, default: false, index: true },
    isBusy: { type: Boolean, default: false, index: true },
    currentLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [77.5946, 12.9716] },
      updatedAt: { type: Date, default: Date.now },
    },

    rating: { type: Number, default: 5.0 },
    totalDeliveries: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    commissionPaid: { type: Number, default: 0 },
    outstandingPayout: { type: Number, default: 0 },

    documents: {
      aadhaar: {
        number: { type: String, default: '' },
        status: { type: String, enum: ['pending', 'verified', 'action_required', 'rejected'], default: 'pending' },
        frontUrl: { type: String, default: '' },
        backUrl: { type: String },
        rejectionReason: { type: String },
      },
      licence: {
        number: { type: String },
        expiryDate: { type: String },
        status: { type: String, enum: ['pending', 'verified', 'action_required', 'rejected'], default: 'pending' },
        frontUrl: { type: String },
        rejectionReason: { type: String },
      },
      rc: {
        number: { type: String },
        status: { type: String, enum: ['pending', 'verified', 'action_required', 'rejected'], default: 'pending' },
        frontUrl: { type: String },
        rejectionReason: { type: String },
      },
      vehiclePhotos: {
        vehicleUrl: { type: String, default: '' },
        numberPlateUrl: { type: String },
        status: { type: String, enum: ['pending', 'verified', 'action_required', 'rejected'], default: 'pending' },
        rejectionReason: { type: String },
      },
    },

    payoutAccount: {
      bankName: { type: String, default: '' },
      accountHolderName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      ifscCode: { type: String, default: '' },
      upiId: { type: String },
      isVerified: { type: Boolean, default: false },
    },

    registeredAt: { type: Date, default: Date.now },
    approvedAt: { type: Date },
    lastDeliveryAt: { type: Date },
  },
  { timestamps: true }
);

DeliveryRiderSchema.index({ currentLocation: '2dsphere' });
DeliveryRiderSchema.index({ status: 1, isOnline: 1, isBusy: 1, currentZone: 1 });

export const DeliveryRiderModel = model<IDeliveryRider>('DeliveryRider', DeliveryRiderSchema);
