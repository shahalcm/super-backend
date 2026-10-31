// src/database/TaxiRide.ts
import { Schema, model, Document } from 'mongoose';
import { VehicleCategory } from './TaxiDriver.js';

export type TaxiRideStatus =
  | 'requested'
  | 'accepted'
  | 'arriving'
  | 'arrived'
  | 'trip_started'
  | 'completed'
  | 'cancelled';

export interface ITaxiRide extends Document {
  rideId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;

  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  vehicleModel?: string;
  registrationNumber?: string;

  vehicleType: VehicleCategory;

  pickupLocation: {
    address: string;
    coordinates: [number, number]; // [lng, lat]
  };
  destinationLocation: {
    address: string;
    coordinates: [number, number]; // [lng, lat]
  };

  distanceKm: number;
  estimatedMinutes: number;

  fare: {
    baseFare: number;
    distanceFare: number;
    timeFare: number;
    subtotal: number;
    tax: number;
    totalFare: number;
    currency: string;
    surgeMultiplier: number;
  };

  pickupOtp: string; // 4-digit code given to passenger, entered by driver to start ride
  status: TaxiRideStatus;

  paymentMethod: 'razorpay' | 'cash' | 'wallet';
  paymentStatus: 'pending' | 'captured' | 'cash_collected' | 'refunded';

  declinedDriverIds: string[]; // Drivers who passed or timed out on this request

  driverCurrentLocation?: {
    type: 'Point';
    coordinates: [number, number];
    heading?: number;
    updatedAt: Date;
  };

  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  cancelledBy?: 'customer' | 'driver' | 'admin' | 'system';

  ratingByCustomer?: number;
  reviewByCustomer?: string;

  createdAt: Date;
  updatedAt: Date;
}

const TaxiRideSchema = new Schema<ITaxiRide>(
  {
    rideId: { type: String, required: true, unique: true, index: true },
    customerId: { type: String, required: true, index: true },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },

    driverId: { type: String, index: true },
    driverName: { type: String },
    driverPhone: { type: String },
    vehicleModel: { type: String },
    registrationNumber: { type: String },

    vehicleType: {
      type: String,
      enum: ['Bike', 'Auto', 'Mini', 'Sedan', 'SUV', 'Luxury'],
      required: true,
      index: true,
    },

    pickupLocation: {
      address: { type: String, required: true },
      coordinates: { type: [Number], required: true },
    },
    destinationLocation: {
      address: { type: String, required: true },
      coordinates: { type: [Number], required: true },
    },

    distanceKm: { type: Number, required: true },
    estimatedMinutes: { type: Number, required: true },

    fare: {
      baseFare: { type: Number, required: true },
      distanceFare: { type: Number, required: true },
      timeFare: { type: Number, required: true },
      subtotal: { type: Number, required: true },
      tax: { type: Number, required: true },
      totalFare: { type: Number, required: true },
      currency: { type: String, default: 'INR' },
      surgeMultiplier: { type: Number, default: 1.0 },
    },

    pickupOtp: { type: String, required: true },
    status: {
      type: String,
      enum: [
        'requested',
        'accepted',
        'arriving',
        'arrived',
        'trip_started',
        'completed',
        'cancelled',
      ],
      default: 'requested',
      index: true,
    },

    paymentMethod: {
      type: String,
      enum: ['razorpay', 'cash', 'wallet'],
      default: 'cash',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'captured', 'cash_collected', 'refunded'],
      default: 'pending',
    },

    declinedDriverIds: { type: [String], default: [] },

    driverCurrentLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number] },
      heading: { type: Number, default: 0 },
      updatedAt: { type: Date },
    },

    startedAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
    cancellationReason: { type: String },
    cancelledBy: { type: String, enum: ['customer', 'driver', 'admin', 'system'] },

    ratingByCustomer: { type: Number },
    reviewByCustomer: { type: String },
  },
  { timestamps: true }
);

TaxiRideSchema.index({ customerId: 1, createdAt: -1 });
TaxiRideSchema.index({ driverId: 1, status: 1 });

export const TaxiRideModel = model<ITaxiRide>('TaxiRide', TaxiRideSchema);
