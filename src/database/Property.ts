// src/database/Property.ts
import { Schema, model, Document } from 'mongoose';

export type PropertyType = 'villa' | 'apartment' | 'house' | 'commercial' | 'plot';
export type ListingType = 'sale' | 'rent';
export type PropertyStatus = 'pending_payment' | 'under_review' | 'approved' | 'rejected';
export type PropertyApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface IProperty extends Document {
  propertyId: string; // PR-10001
  title: string;
  description: string;
  propertyType: PropertyType;
  listingType: ListingType;
  category: string;
  price: number;
  location: string;
  address: string;
  city: string;
  state: string;
  images: string[];
  bedrooms?: number;
  bathrooms?: number;
  area: string; // e.g. '2400 sq.ft'
  amenities: string[];
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  postedBy: string;

  userId: string;
  userPhone?: string;
  userName?: string;

  // Payment & Listing Fee details
  listingFeeAmount: number;
  isPaid: boolean;
  paymentId?: string;
  paymentOrderId?: string;
  paidAt?: Date;

  // Admin Review / Approval
  status: PropertyStatus;
  approvalStatus: PropertyApprovalStatus;
  rejectionReason?: string;
  reviewedAt?: Date;
  reviewedBy?: string;

  featured: boolean;
  viewsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const PropertySchema = new Schema<IProperty>(
  {
    propertyId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    propertyType: {
      type: String,
      enum: ['villa', 'apartment', 'house', 'commercial', 'plot'],
      default: 'villa',
      index: true,
    },
    listingType: {
      type: String,
      enum: ['sale', 'rent'],
      default: 'sale',
      index: true,
    },
    category: {
      type: String,
      default: 'Residential',
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    location: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
      default: 'Manjeri',
      index: true,
    },
    state: {
      type: String,
      required: true,
      default: 'Kerala',
    },
    images: {
      type: [String],
      default: [],
    },
    bedrooms: {
      type: Number,
      default: 0,
    },
    bathrooms: {
      type: Number,
      default: 0,
    },
    area: {
      type: String,
      required: true,
    },
    amenities: {
      type: [String],
      default: [],
    },
    contactName: {
      type: String,
      required: true,
    },
    contactPhone: {
      type: String,
      required: true,
    },
    contactEmail: {
      type: String,
    },
    postedBy: {
      type: String,
      default: 'Direct Owner',
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    userPhone: {
      type: String,
    },
    userName: {
      type: String,
    },

    // Payment Tracking
    listingFeeAmount: {
      type: Number,
      required: true,
      default: 50,
    },
    isPaid: {
      type: Boolean,
      default: false,
      index: true,
    },
    paymentId: {
      type: String,
    },
    paymentOrderId: {
      type: String,
    },
    paidAt: {
      type: Date,
    },

    // Approval Workflow
    status: {
      type: String,
      enum: ['pending_payment', 'under_review', 'approved', 'rejected'],
      default: 'pending_payment',
      index: true,
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    rejectionReason: {
      type: String,
    },
    reviewedAt: {
      type: Date,
    },
    reviewedBy: {
      type: String,
    },

    featured: {
      type: Boolean,
      default: false,
    },
    viewsCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const PropertyModel = model<IProperty>('Property', PropertySchema);
