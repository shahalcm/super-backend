// src/database/TaxiPricing.ts
import { Schema, model, Document } from 'mongoose';
import { VehicleCategory } from './TaxiDriver.js';

export interface ITaxiPricing extends Document {
  pricingId: string;
  vehicleType: VehicleCategory;
  name: string;
  description: string;
  baseFare: number; // ₹ base fare
  minKm: number; // minimum km included in base fare
  pricePerKm: number; // ₹ per km after minKm
  pricePerMinute: number; // ₹ per minute travel time
  minimumFare: number; // minimum trip fare
  bookingFee: number; // flat platform booking fee
  waitingChargePerMinute: number; // ₹/min for waiting
  freeWaitingTimeMinutes: number; // free waiting minutes before charge
  nightSurchargePercent: number; // % extra during night hours (e.g., 20)
  nightStartHour: number; // 24-hr format (e.g., 22 for 10 PM)
  nightEndHour: number; // 24-hr format (e.g., 5 for 5 AM)
  peakHourSurchargeMultiplier: number; // e.g., 1.25 for peak traffic hours
  cancellationFee: number; // ₹ charged if cancelled after threshold
  surgeMultiplier: number; // live surge factor (default 1.0)
  isActive: boolean;
  currency: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TaxiPricingSchema = new Schema<ITaxiPricing>(
  {
    pricingId: { type: String, required: true, unique: true, index: true },
    vehicleType: {
      type: String,
      enum: ['Bike', 'Auto', 'Mini', 'Sedan', 'SUV', 'Luxury'],
      required: true,
      unique: true,
      index: true,
    },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    baseFare: { type: Number, required: true, min: 0 },
    minKm: { type: Number, required: true, default: 2.0, min: 0 },
    pricePerKm: { type: Number, required: true, min: 0 },
    pricePerMinute: { type: Number, required: true, default: 1.0, min: 0 },
    minimumFare: { type: Number, required: true, min: 0 },
    bookingFee: { type: Number, required: true, default: 0, min: 0 },
    waitingChargePerMinute: { type: Number, required: true, default: 2.0, min: 0 },
    freeWaitingTimeMinutes: { type: Number, required: true, default: 5, min: 0 },
    nightSurchargePercent: { type: Number, required: true, default: 15, min: 0 },
    nightStartHour: { type: Number, required: true, default: 22, min: 0, max: 23 },
    nightEndHour: { type: Number, required: true, default: 5, min: 0, max: 23 },
    peakHourSurchargeMultiplier: { type: Number, required: true, default: 1.0, min: 1.0 },
    cancellationFee: { type: Number, required: true, default: 30, min: 0 },
    surgeMultiplier: { type: Number, required: true, default: 1.0, min: 1.0 },
    isActive: { type: Boolean, default: true, index: true },
    currency: { type: String, default: 'INR' },
    updatedBy: { type: String },
  },
  { timestamps: true }
);

export const TaxiPricingModel = model<ITaxiPricing>('TaxiPricing', TaxiPricingSchema);

export const DEFAULT_TAXI_PRICING: Array<Partial<ITaxiPricing>> = [
  {
    pricingId: 'price_bike',
    vehicleType: 'Bike',
    name: 'UBS Bike Moto',
    description: 'Fast, affordable solo two-wheeler commute',
    baseFare: 25,
    minKm: 1.5,
    pricePerKm: 9,
    pricePerMinute: 1.0,
    minimumFare: 35,
    bookingFee: 0,
    waitingChargePerMinute: 1.0,
    freeWaitingTimeMinutes: 3,
    nightSurchargePercent: 15,
    nightStartHour: 22,
    nightEndHour: 5,
    peakHourSurchargeMultiplier: 1.0,
    cancellationFee: 15,
    surgeMultiplier: 1.0,
    isActive: true,
    currency: 'INR',
  },
  {
    pricingId: 'price_auto',
    vehicleType: 'Auto',
    name: 'UBS Auto Rickshaw',
    description: 'Local 3-wheeler everyday travel with verified meter rates',
    baseFare: 35,
    minKm: 2.0,
    pricePerKm: 13,
    pricePerMinute: 1.2,
    minimumFare: 50,
    bookingFee: 0,
    waitingChargePerMinute: 1.5,
    freeWaitingTimeMinutes: 5,
    nightSurchargePercent: 15,
    nightStartHour: 22,
    nightEndHour: 5,
    peakHourSurchargeMultiplier: 1.0,
    cancellationFee: 20,
    surgeMultiplier: 1.0,
    isActive: true,
    currency: 'INR',
  },
  {
    pricingId: 'price_mini',
    vehicleType: 'Mini',
    name: 'UBS Mini',
    description: 'Pocket-friendly AC compact hatchback for city trips',
    baseFare: 60,
    minKm: 3.0,
    pricePerKm: 16,
    pricePerMinute: 1.5,
    minimumFare: 90,
    bookingFee: 0,
    waitingChargePerMinute: 2.0,
    freeWaitingTimeMinutes: 5,
    nightSurchargePercent: 20,
    nightStartHour: 22,
    nightEndHour: 5,
    peakHourSurchargeMultiplier: 1.0,
    cancellationFee: 30,
    surgeMultiplier: 1.0,
    isActive: true,
    currency: 'INR',
  },
  {
    pricingId: 'price_sedan',
    vehicleType: 'Sedan',
    name: 'UBS Prime Sedan',
    description: 'Spacious, high-comfort sedans with top-rated captains',
    baseFare: 80,
    minKm: 3.0,
    pricePerKm: 19,
    pricePerMinute: 2.0,
    minimumFare: 120,
    bookingFee: 0,
    waitingChargePerMinute: 2.5,
    freeWaitingTimeMinutes: 5,
    nightSurchargePercent: 20,
    nightStartHour: 22,
    nightEndHour: 5,
    peakHourSurchargeMultiplier: 1.0,
    cancellationFee: 40,
    surgeMultiplier: 1.0,
    isActive: true,
    currency: 'INR',
  },
  {
    pricingId: 'price_suv',
    vehicleType: 'SUV',
    name: 'UBS SUV XL',
    description: '6-seater premium SUVs for family & airport luggage',
    baseFare: 120,
    minKm: 4.0,
    pricePerKm: 24,
    pricePerMinute: 2.5,
    minimumFare: 180,
    bookingFee: 0,
    waitingChargePerMinute: 3.0,
    freeWaitingTimeMinutes: 7,
    nightSurchargePercent: 20,
    nightStartHour: 22,
    nightEndHour: 5,
    peakHourSurchargeMultiplier: 1.0,
    cancellationFee: 50,
    surgeMultiplier: 1.0,
    isActive: true,
    currency: 'INR',
  },
  {
    pricingId: 'price_luxury',
    vehicleType: 'Luxury',
    name: 'UBS Luxury Premier',
    description: 'Executive chauffeur-driven luxury fleet for special journeys',
    baseFare: 250,
    minKm: 5.0,
    pricePerKm: 38,
    pricePerMinute: 4.0,
    minimumFare: 350,
    bookingFee: 0,
    waitingChargePerMinute: 5.0,
    freeWaitingTimeMinutes: 10,
    nightSurchargePercent: 25,
    nightStartHour: 22,
    nightEndHour: 5,
    peakHourSurchargeMultiplier: 1.0,
    cancellationFee: 100,
    surgeMultiplier: 1.0,
    isActive: true,
    currency: 'INR',
  },
];
