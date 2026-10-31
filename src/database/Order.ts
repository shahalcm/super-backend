// src/database/Order.ts
import { Schema, model, Document } from 'mongoose';

export type OrderType = 'grocery' | 'food' | 'logistics' | 'hotel' | 'clinic';
export type PaymentStatus = 'pending' | 'authorized' | 'captured' | 'failed' | 'refunded' | 'partially_refunded';
export type FulfillmentStatus =
  | 'placed'
  | 'confirmed'
  | 'preparing'
  | 'ready_for_pickup'
  | 'rider_assigned'
  | 'in_transit'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'scheduled';

export interface IOrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  imageUrl?: string;
}

export interface IOrder extends Document {
  orderId: string;
  type: OrderType;
  customerId: string;
  customerName: string;
  customerPhone: string;

  partnerId?: string;
  partnerName?: string;
  partnerPhone?: string;

  assignedRiderId?: string;
  riderName?: string;
  riderPhone?: string;

  items: IOrderItem[];
  subtotal: number;
  tax: number;
  deliveryFee: number;
  discount: number;
  totalAmount: number;
  currency: string;

  paymentStatus: PaymentStatus;
  paymentMethod: 'razorpay' | 'wallet' | 'cash';
  fulfillmentStatus: FulfillmentStatus;

  pickupAddress: string;
  destinationAddress: string;
  deliveryAddress?: string;
  pickupLocation?: {
    type: 'Point';
    coordinates: [number, number];
  };
  destinationLocation?: {
    type: 'Point';
    coordinates: [number, number];
  };

  deliveryOtp?: string; // 4-digit code for rider verification at door
  notes?: string;

  bookingDetails?: {
    checkInDate?: string;
    checkOutDate?: string;
    roomType?: string;
    guestsCount?: number;
    doctorName?: string;
    clinicName?: string;
    appointmentSlot?: string;
    parcelWeightKg?: number;
  };

  timeline: {
    status: string;
    timestamp: Date;
    note: string;
  }[];

  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    type: {
      type: String,
      enum: ['grocery', 'food', 'logistics', 'hotel', 'clinic'],
      required: true,
      index: true,
    },
    customerId: { type: String, required: true, index: true },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },

    partnerId: { type: String, index: true },
    partnerName: { type: String },
    partnerPhone: { type: String },

    assignedRiderId: { type: String, index: true },
    riderName: { type: String },
    riderPhone: { type: String },

    items: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true, min: 0 },
        totalPrice: { type: Number, required: true, min: 0 },
        imageUrl: { type: String },
      },
    ],

    subtotal: { type: Number, required: true, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    deliveryFee: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },

    paymentStatus: {
      type: String,
      enum: ['pending', 'authorized', 'captured', 'failed', 'refunded', 'partially_refunded'],
      default: 'pending',
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ['razorpay', 'wallet', 'cash'],
      default: 'razorpay',
    },
    fulfillmentStatus: {
      type: String,
      enum: [
        'placed',
        'confirmed',
        'preparing',
        'ready_for_pickup',
        'rider_assigned',
        'in_transit',
        'delivered',
        'completed',
        'cancelled',
        'scheduled',
      ],
      default: 'placed',
      index: true,
    },

    pickupAddress: { type: String, default: '' },
    destinationAddress: { type: String, default: '' },
    deliveryAddress: { type: String },
    pickupLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [77.5946, 12.9716] },
    },
    destinationLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [77.5946, 12.9716] },
    },

    deliveryOtp: { type: String },
    notes: { type: String },

    bookingDetails: {
      checkInDate: { type: String },
      checkOutDate: { type: String },
      roomType: { type: String },
      guestsCount: { type: Number },
      doctorName: { type: String },
      clinicName: { type: String },
      appointmentSlot: { type: String },
      parcelWeightKg: { type: Number },
    },

    timeline: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        note: { type: String, default: '' },
      },
    ],
  },
  { timestamps: true }
);

OrderSchema.index({ customerId: 1, createdAt: -1 });
OrderSchema.index({ partnerId: 1, fulfillmentStatus: 1 });
OrderSchema.index({ assignedRiderId: 1, fulfillmentStatus: 1 });

export const OrderModel = model<IOrder>('Order', OrderSchema);
