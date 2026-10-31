// src/database/HotelRoom.ts
import { Schema, model, Document } from 'mongoose';

export interface IHotelRoom extends Document {
  roomId: string;
  partnerId: string;
  roomType: string;
  description: string;
  capacity: {
    adults: number;
    children: number;
  };
  pricePerNight: number;
  amenities: string[];
  images: string[];
  totalRooms: number;
  availableRooms: number;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const HotelRoomSchema = new Schema<IHotelRoom>(
  {
    roomId: { type: String, required: true, unique: true, index: true },
    partnerId: { type: String, required: true, index: true },
    roomType: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    capacity: {
      adults: { type: Number, default: 2 },
      children: { type: Number, default: 1 },
    },
    pricePerNight: { type: Number, required: true, min: 0 },
    amenities: { type: [String], default: [] },
    images: { type: [String], default: [] },
    totalRooms: { type: Number, default: 5, min: 1 },
    availableRooms: { type: Number, default: 5, min: 0 },
    isAvailable: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export const HotelRoomModel = model<IHotelRoom>('HotelRoom', HotelRoomSchema);
