// src/database/TaxiDriver.ts
import { Schema, model, Document } from 'mongoose';

export type VehicleCategory = 'Bike' | 'Auto' | 'Mini' | 'Sedan' | 'SUV' | 'Luxury';
export type VerificationStatus = 'pending' | 'verified' | 'action_required' | 'rejected';
export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'action_required'
  | 'approved'
  | 'rejected'
  | 'suspended';

export interface ITaxiDriver extends Document {
  driverId: string;
  userId: string;
  fullName: string;
  phone: string;
  email?: string;
  status: ApplicationStatus;
  rejectionReason?: string;
  actionRequiredMessage?: string;

  vehicleType: VehicleCategory;
  vehicleModel: string;
  registrationNumber: string;

  isOnline: boolean;
  isBusy: boolean;
  currentLocation: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
    heading?: number;
    updatedAt: Date;
  };

  rating: number;
  totalRides: number;
  totalEarnings: number;
  commissionPaid: number;
  outstandingPayout: number;

  documents: {
    licence: {
      number: string;
      expiryDate: string;
      status: VerificationStatus;
      frontUrl: string;
      backUrl?: string;
      rejectionReason?: string;
    };
    rc: {
      number: string;
      expiryDate?: string;
      status: VerificationStatus;
      frontUrl: string;
      backUrl?: string;
      rejectionReason?: string;
    };
    vehiclePhotos: {
      front: string;
      rear: string;
      side?: string;
      interior?: string;
      numberPlate: string;
      status: VerificationStatus;
      plateMatchesRC: boolean;
      rejectionReason?: string;
    };
    insurance?: {
      number: string;
      expiryDate: string;
      status: VerificationStatus;
      documentUrl: string;
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
  lastRideAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TaxiDriverSchema = new Schema<ITaxiDriver>(
  {
    driverId: { type: String, required: true, unique: true, index: true },
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
      enum: ['Bike', 'Auto', 'Mini', 'Sedan', 'SUV', 'Luxury'],
      default: 'Sedan',
      index: true,
    },
    vehicleModel: { type: String, required: true },
    registrationNumber: { type: String, required: true, uppercase: true, trim: true },

    isOnline: { type: Boolean, default: false, index: true },
    isBusy: { type: Boolean, default: false, index: true },
    currentLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [77.5946, 12.9716] }, // default Bengaluru coordinates
      heading: { type: Number, default: 0 },
      updatedAt: { type: Date, default: Date.now },
    },

    rating: { type: Number, default: 5.0 },
    totalRides: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    commissionPaid: { type: Number, default: 0 },
    outstandingPayout: { type: Number, default: 0 },

    documents: {
      licence: {
        number: { type: String, default: '' },
        expiryDate: { type: String, default: '' },
        status: { type: String, enum: ['pending', 'verified', 'action_required', 'rejected'], default: 'pending' },
        frontUrl: { type: String, default: '' },
        backUrl: { type: String },
        rejectionReason: { type: String },
      },
      rc: {
        number: { type: String, default: '' },
        expiryDate: { type: String },
        status: { type: String, enum: ['pending', 'verified', 'action_required', 'rejected'], default: 'pending' },
        frontUrl: { type: String, default: '' },
        backUrl: { type: String },
        rejectionReason: { type: String },
      },
      vehiclePhotos: {
        front: { type: String, default: '' },
        rear: { type: String, default: '' },
        side: { type: String },
        interior: { type: String },
        numberPlate: { type: String, default: '' },
        status: { type: String, enum: ['pending', 'verified', 'action_required', 'rejected'], default: 'pending' },
        plateMatchesRC: { type: Boolean, default: false },
        rejectionReason: { type: String },
      },
      insurance: {
        number: { type: String },
        expiryDate: { type: String },
        status: { type: String, enum: ['pending', 'verified', 'action_required', 'rejected'], default: 'pending' },
        documentUrl: { type: String },
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
    lastRideAt: { type: Date },
  },
  { timestamps: true }
);

// 2dsphere index for geo queries
TaxiDriverSchema.index({ currentLocation: '2dsphere' });
// Compound index for driver matching
TaxiDriverSchema.index({ status: 1, isOnline: 1, isBusy: 1, vehicleType: 1 });

export const TaxiDriverModel = model<ITaxiDriver>('TaxiDriver', TaxiDriverSchema);
