// src/database/Delivery.ts
import { Schema, model, Document } from 'mongoose';

export type DeliveryStatus =
  | 'assigned'
  | 'accepted'
  | 'arrived_pickup'
  | 'picked_up'
  | 'in_transit'
  | 'arrived_destination'
  | 'delivered'
  | 'failed'
  | 'cancelled';

export interface IDelivery extends Document {
  deliveryId: string;
  orderId: string;
  orderType: 'grocery' | 'food' | 'logistics';
  riderId: string;
  riderName: string;
  riderPhone: string;

  sender: {
    name: string;
    phone: string;
    address: string;
    location: {
      type: 'Point';
      coordinates: [number, number];
    };
  };

  recipient: {
    name: string;
    phone: string;
    address: string;
    location: {
      type: 'Point';
      coordinates: [number, number];
    };
  };

  distanceKm: number;
  riderEarnings: number;
  commission: number;

  status: DeliveryStatus;
  deliveryOtp: string;
  proofOfDeliveryPhotoUrl?: string;

  declinedRiderIds: string[];

  assignedAt: Date;
  acceptedAt?: Date;
  pickedUpAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DeliverySchema = new Schema<IDelivery>(
  {
    deliveryId: { type: String, required: true, unique: true, index: true },
    orderId: { type: String, required: true, index: true },
    orderType: { type: String, enum: ['grocery', 'food', 'logistics'], required: true },
    riderId: { type: String, required: true, index: true },
    riderName: { type: String, required: true },
    riderPhone: { type: String, required: true },

    sender: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
      location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true },
      },
    },

    recipient: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
      location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true },
      },
    },

    distanceKm: { type: Number, required: true },
    riderEarnings: { type: Number, required: true },
    commission: { type: Number, default: 0 },

    status: {
      type: String,
      enum: [
        'assigned',
        'accepted',
        'arrived_pickup',
        'picked_up',
        'in_transit',
        'arrived_destination',
        'delivered',
        'failed',
        'cancelled',
      ],
      default: 'assigned',
      index: true,
    },

    deliveryOtp: { type: String, required: true },
    proofOfDeliveryPhotoUrl: { type: String },

    declinedRiderIds: { type: [String], default: [] },

    assignedAt: { type: Date, default: Date.now },
    acceptedAt: { type: Date },
    pickedUpAt: { type: Date },
    deliveredAt: { type: Date },
  },
  { timestamps: true }
);

DeliverySchema.index({ riderId: 1, status: 1 });

export const DeliveryModel = model<IDelivery>('Delivery', DeliverySchema);
