// src/modules/auth/auth.validators.ts
import { z } from 'zod';

export const sendOtpSchema = z.object({
  phone: z.string().min(8, 'Phone number must be at least 8 digits').max(15),
  countryCode: z.string().default('+91'),
  role: z
    .enum([
      'CUSTOMER',
      'TAXI_DRIVER',
      'DELIVERY_RIDER',
      'PARTNER_OWNER',
      'PARTNER_STAFF',
      'ADMIN',
      'SUPER_ADMIN',
    ])
    .default('CUSTOMER'),
});

export const verifyOtpSchema = z.object({
  phone: z.string().min(8).max(15),
  otp: z.string().length(6, 'OTP must be exactly 6 digits'),
  role: z
    .enum([
      'CUSTOMER',
      'TAXI_DRIVER',
      'DELIVERY_RIDER',
      'PARTNER_OWNER',
      'PARTNER_STAFF',
      'ADMIN',
      'SUPER_ADMIN',
    ])
    .default('CUSTOMER'),
});

export const registerSchema = z.object({
  phone: z.string().min(8).max(15),
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  role: z
    .enum([
      'CUSTOMER',
      'TAXI_DRIVER',
      'DELIVERY_RIDER',
      'PARTNER_OWNER',
      'PARTNER_STAFF',
      'ADMIN',
      'SUPER_ADMIN',
    ])
    .default('CUSTOMER'),
  vehicleType: z.string().optional(),
  partnerCategory: z.enum(['grocery', 'hotel', 'clinic']).optional(),
  address: z
    .object({
      fullAddress: z.string().optional(),
      houseNumber: z.string().optional(),
      street: z.string().optional(),
      locality: z.string().optional(),
      city: z.string().optional(),
      district: z.string().optional(),
      state: z.string().optional(),
      pincode: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
  location: z
    .object({
      type: z.literal('Point').default('Point'),
      coordinates: z.tuple([z.number(), z.number()]), // [longitude, latitude]
    })
    .optional(),
  locationSource: z.enum(['gps', 'pincode', 'manual']).optional(),
});

export const resetPasswordSchema = z.object({
  phone: z.string().min(8).max(15),
  otp: z.string().length(6, 'OTP must be exactly 6 digits'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});


export const loginPasswordSchema = z.object({
  phoneOrEmail: z.string().min(3),
  password: z.string().min(6),
  role: z
    .enum([
      'CUSTOMER',
      'TAXI_DRIVER',
      'DELIVERY_RIDER',
      'PARTNER_OWNER',
      'PARTNER_STAFF',
      'ADMIN',
      'SUPER_ADMIN',
    ])
    .optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(10),
});
