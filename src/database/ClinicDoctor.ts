// src/database/ClinicDoctor.ts
import { Schema, model, Document } from 'mongoose';

export interface IClinicDoctor extends Document {
  doctorId: string;
  partnerId: string;
  fullName: string;
  specialty: string;
  qualification: string;
  experienceYears: number;
  consultationFee: number;
  availableDays: string[];
  timeSlots: string[];
  isAvailable: boolean;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ClinicDoctorSchema = new Schema<IClinicDoctor>(
  {
    doctorId: { type: String, required: true, unique: true, index: true },
    partnerId: { type: String, required: true, index: true },
    fullName: { type: String, required: true, trim: true },
    specialty: { type: String, required: true, index: true },
    qualification: { type: String, required: true },
    experienceYears: { type: Number, default: 5 },
    consultationFee: { type: Number, required: true, min: 0 },
    availableDays: {
      type: [String],
      default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    },
    timeSlots: {
      type: [String],
      default: ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '04:00 PM', '05:00 PM'],
    },
    isAvailable: { type: Boolean, default: true, index: true },
    avatarUrl: { type: String },
  },
  { timestamps: true }
);

export const ClinicDoctorModel = model<IClinicDoctor>('ClinicDoctor', ClinicDoctorSchema);
