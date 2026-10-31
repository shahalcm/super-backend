// src/database/PartnerBusiness.ts
import { Schema, model, Document } from 'mongoose';
import { VerificationStatus, ApplicationStatus } from './TaxiDriver.js';

export type PartnerCategory = 'grocery' | 'hotel' | 'clinic';

export interface IPartnerBusiness extends Document {
  partnerId: string;
  userId: string; // Owner User ID
  businessName: string;
  legalName: string;
  category: PartnerCategory;

  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;

  status: ApplicationStatus;
  rejectionReason?: string;
  actionRequiredMessage?: string;

  subscriptionPlan: string;
  subscriptionStatus: 'active' | 'trial' | 'past_due' | 'cancelled' | 'none';

  registrationFee: {
    amount: number;
    currency: string;
    isPaid: boolean;
    orderId?: string;
    paymentId?: string;
    paidAt?: Date;
  };

  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };

  operatingHours: {
    openTime: string;
    closeTime: string;
    isOpen: boolean;
  };

  categorySetup: {
    grocery?: {
      storeType: string;
      deliveryRadiusKm: number;
      minOrderValue: number;
    };
    hotel?: {
      totalRooms: number;
      baseStartingRate: number;
      checkInTime: string;
      checkOutTime: string;
    };
    clinic?: {
      doctorCount: number;
      averageConsultationMinutes: number;
      emergencyAvailable: boolean;
    };
  };

  documents: {
    id: string;
    type: string;
    label: string;
    fileName: string;
    fileUrl: string;
    status: VerificationStatus;
    uploadedAt: Date;
    rejectionReason?: string;
  }[];

  bankDetails: {
    bankName: string;
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    upiId?: string;
    isVerified: boolean;
  };

  totalOrders: number;
  totalRevenue: number;
  commissionPaid: number;
  outstandingBalance: number;
  rating: number;

  registeredAt: Date;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PartnerBusinessSchema = new Schema<IPartnerBusiness>(
  {
    partnerId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    businessName: { type: String, required: true, trim: true },
    legalName: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['grocery', 'hotel', 'clinic'],
      required: true,
      index: true,
    },

    ownerName: { type: String, required: true, trim: true },
    ownerPhone: { type: String, required: true, index: true },
    ownerEmail: { type: String, required: true, lowercase: true, trim: true },

    status: {
      type: String,
      enum: ['draft', 'submitted', 'under_review', 'action_required', 'approved', 'rejected', 'suspended'],
      default: 'draft',
      index: true,
    },
    rejectionReason: { type: String },
    actionRequiredMessage: { type: String },

    subscriptionPlan: { type: String, default: 'Standard' },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'trial', 'past_due', 'cancelled', 'none'],
      default: 'none',
    },

    registrationFee: {
      amount: { type: Number, default: 999 },
      currency: { type: String, default: 'INR' },
      isPaid: { type: Boolean, default: false },
      orderId: { type: String },
      paymentId: { type: String },
      paidAt: { type: Date },
    },

    address: { type: String, required: true },
    city: { type: String, required: true, index: true },
    state: { type: String, required: true },
    country: { type: String, default: 'India' },
    postalCode: { type: String, required: true },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [77.5946, 12.9716] },
    },

    operatingHours: {
      openTime: { type: String, default: '09:00' },
      closeTime: { type: String, default: '22:00' },
      isOpen: { type: Boolean, default: true },
    },

    categorySetup: {
      grocery: {
        storeType: { type: String, default: 'Supermarket' },
        deliveryRadiusKm: { type: Number, default: 8 },
        minOrderValue: { type: Number, default: 199 },
      },
      hotel: {
        totalRooms: { type: Number, default: 10 },
        baseStartingRate: { type: Number, default: 1999 },
        checkInTime: { type: String, default: '12:00' },
        checkOutTime: { type: String, default: '11:00' },
      },
      clinic: {
        doctorCount: { type: Number, default: 2 },
        averageConsultationMinutes: { type: Number, default: 20 },
        emergencyAvailable: { type: Boolean, default: false },
      },
    },

    documents: [
      {
        id: { type: String, required: true },
        type: { type: String, required: true },
        label: { type: String, required: true },
        fileName: { type: String, required: true },
        fileUrl: { type: String, required: true },
        status: { type: String, enum: ['pending', 'verified', 'action_required', 'rejected'], default: 'pending' },
        uploadedAt: { type: Date, default: Date.now },
        rejectionReason: { type: String },
      },
    ],

    bankDetails: {
      bankName: { type: String, default: '' },
      accountHolderName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      ifscCode: { type: String, default: '' },
      upiId: { type: String },
      isVerified: { type: Boolean, default: false },
    },

    totalOrders: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    commissionPaid: { type: Number, default: 0 },
    outstandingBalance: { type: Number, default: 0 },
    rating: { type: Number, default: 4.8 },

    registeredAt: { type: Date, default: Date.now },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

PartnerBusinessSchema.index({ location: '2dsphere' });
PartnerBusinessSchema.index({ status: 1, category: 1, city: 1 });

export const PartnerBusinessModel = model<IPartnerBusiness>(
  'PartnerBusiness',
  PartnerBusinessSchema
);
