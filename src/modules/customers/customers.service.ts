// src/modules/customers/customers.service.ts
import { v4 as uuidv4 } from 'uuid';
import { CustomerProfileModel, UserModel } from '../../database/index.js';

export class CustomersService {
  async getProfile(userId: string) {
    const user = await UserModel.findOne({ userId }).select('-passwordHash');
    let profile = await CustomerProfileModel.findOne({ userId });

    if (!profile) {
      profile = await CustomerProfileModel.create({
        userId,
        savedAddresses: [],
        walletBalance: 0,
      });
    }

    return {
      user,
      profile,
    };
  }

  async updateProfile(userId: string, data: { fullName?: string; email?: string; avatarUrl?: string }) {
    const user = await UserModel.findOneAndUpdate(
      { userId },
      {
        ...(data.fullName ? { fullName: data.fullName } : {}),
        ...(data.email ? { email: data.email } : {}),
        ...(data.avatarUrl ? { avatarUrl: data.avatarUrl } : {}),
      },
      { new: true }
    ).select('-passwordHash');

    return user;
  }

  async addAddress(userId: string, address: {
    label: 'Home' | 'Work' | 'Other';
    addressLine: string;
    city: string;
    state: string;
    postalCode: string;
    landmark?: string;
    latitude: number;
    longitude: number;
    isDefault?: boolean;
  }) {
    let profile = await CustomerProfileModel.findOne({ userId });
    if (!profile) {
      profile = await CustomerProfileModel.create({ userId, savedAddresses: [] });
    }

    if (address.isDefault) {
      profile.savedAddresses.forEach((addr) => {
        addr.isDefault = false;
      });
    }

    const newAddress = {
      id: `addr_${uuidv4().slice(0, 8)}`,
      label: address.label,
      addressLine: address.addressLine,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      landmark: address.landmark,
      location: {
        type: 'Point' as const,
        coordinates: [address.longitude, address.latitude] as [number, number],
      },
      isDefault: profile.savedAddresses.length === 0 ? true : !!address.isDefault,
    };

    profile.savedAddresses.push(newAddress);
    await profile.save();
    return profile.savedAddresses;
  }

  async deleteAddress(userId: string, addressId: string) {
    const profile = await CustomerProfileModel.findOne({ userId });
    if (!profile) throw new Error('Customer profile not found');

    profile.savedAddresses = profile.savedAddresses.filter((a) => a.id !== addressId) as any;
    await profile.save();
    return profile.savedAddresses;
  }
}

export const customersService = new CustomersService();
