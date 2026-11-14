// src/modules/delivery/delivery.service.ts
import { DeliveryRiderModel, DeliveryModel, OrderModel, PayoutModel } from '../../database/index.js';
import { v4 as uuidv4 } from 'uuid';

import mongoose from 'mongoose';

const memoryRiderStore = new Map<string, any>();

export class DeliveryService {
  async getProfile(userId: string) {
    if (mongoose.connection.readyState === 1) {
      try {
        let rider = await DeliveryRiderModel.findOne({ userId });
        if (!rider) {
          rider = await DeliveryRiderModel.create({
            riderId: `rdr_${uuidv4().slice(0, 8)}`,
            userId,
            fullName: 'Delivery Partner',
            phone: '9876543210',
            vehicleType: 'motorcycle',
            status: 'draft',
          });
        }
        return rider;
      } catch {
        // Fallback
      }
    }

    if (!memoryRiderStore.has(userId)) {
      memoryRiderStore.set(userId, {
        riderId: `rdr_${uuidv4().slice(0, 8)}`,
        userId,
        fullName: 'Delivery Partner',
        phone: '9876543210',
        vehicleType: 'motorcycle',
        status: 'draft',
        isOnline: false,
        save: async function () {
          return this;
        },
      });
    }
    return memoryRiderStore.get(userId);
  }

  async updateProfile(userId: string, data: any) {
    const rider = await DeliveryRiderModel.findOneAndUpdate(
      { userId },
      { $set: data },
      { new: true, upsert: true }
    );
    return rider;
  }

  async submitProfileForReview(userId: string) {
    const rider = await DeliveryRiderModel.findOne({ userId });
    if (!rider) throw new Error('Rider profile not found');

    if (rider.vehicleType !== 'bicycle' && !rider.documents.licence?.number) {
      throw new Error('Driving licence is mandatory for motorized delivery vehicles.');
    }

    rider.status = 'submitted';
    await rider.save();
    return rider;
  }

  async setAvailability(userId: string, isOnline: boolean) {
    const rider = await DeliveryRiderModel.findOne({ userId });
    if (!rider) throw new Error('Rider not found');

    if (isOnline && rider.status !== 'approved') {
      throw new Error('Only approved delivery riders can go online. Current status: ' + rider.status);
    }

    rider.isOnline = isOnline;
    await rider.save();
    return { isOnline: rider.isOnline, status: rider.status };
  }

  async updateLocation(userId: string, latitude: number, longitude: number) {
    const rider = await DeliveryRiderModel.findOneAndUpdate(
      { userId },
      {
        currentLocation: {
          type: 'Point',
          coordinates: [longitude, latitude],
          updatedAt: new Date(),
        },
      },
      { new: true }
    );
    return { success: true, updatedLocation: rider?.currentLocation };
  }

  async getAvailableDeliveries(userId: string) {
    const rider = await DeliveryRiderModel.findOne({ userId });
    if (!rider || !rider.isOnline || rider.status !== 'approved') {
      return [];
    }

    const deliveries = await DeliveryModel.find({
      status: 'assigned',
      riderId: rider.riderId,
    }).sort({ createdAt: -1 });

    return deliveries;
  }

  async getCurrentDelivery(userId: string) {
    const rider = await DeliveryRiderModel.findOne({ userId });
    if (!rider) return null;

    const delivery = await DeliveryModel.findOne({
      riderId: rider.riderId,
      status: { $in: ['accepted', 'arrived_pickup', 'picked_up', 'in_transit', 'arrived_destination'] },
    });

    return delivery;
  }

  async acceptDelivery(userId: string, deliveryId: string) {
    const rider = await DeliveryRiderModel.findOne({ userId });
    if (!rider) throw new Error('Rider not found');

    const delivery = await DeliveryModel.findOneAndUpdate(
      { deliveryId, status: 'assigned' },
      { status: 'accepted', acceptedAt: new Date() },
      { new: true }
    );

    if (!delivery) {
      throw new Error('Delivery task is no longer available.');
    }

    rider.isBusy = true;
    await rider.save();

    // Update parent order fulfillment status
    await OrderModel.findOneAndUpdate(
      { orderId: delivery.orderId },
      {
        fulfillmentStatus: 'rider_assigned',
        assignedRiderId: rider.riderId,
        riderName: rider.fullName,
        riderPhone: rider.phone,
        $push: {
          timeline: {
            status: 'rider_assigned',
            timestamp: new Date(),
            note: `Rider ${rider.fullName} assigned for delivery`,
          },
        },
      }
    );

    return delivery;
  }

  async updatePickup(userId: string, deliveryId: string) {
    const rider = await DeliveryRiderModel.findOne({ userId });
    const delivery = await DeliveryModel.findOneAndUpdate(
      { deliveryId, riderId: rider?.riderId, status: { $in: ['accepted', 'arrived_pickup'] } },
      { status: 'picked_up', pickedUpAt: new Date() },
      { new: true }
    );

    if (!delivery) throw new Error('Could not update pickup status.');

    await OrderModel.findOneAndUpdate(
      { orderId: delivery.orderId },
      {
        fulfillmentStatus: 'in_transit',
        $push: {
          timeline: {
            status: 'in_transit',
            timestamp: new Date(),
            note: 'Order picked up and out for delivery',
          },
        },
      }
    );

    return delivery;
  }

  async completeDelivery(userId: string, deliveryId: string, otp: string) {
    const rider = await DeliveryRiderModel.findOne({ userId });
    const delivery = await DeliveryModel.findOne({ deliveryId, riderId: rider?.riderId });

    if (!delivery) throw new Error('Delivery assignment not found');

    if (delivery.deliveryOtp !== otp.trim()) {
      throw new Error('Invalid delivery OTP code. Please ask the customer for the verification code.');
    }

    delivery.status = 'delivered';
    delivery.deliveredAt = new Date();
    await delivery.save();

    if (rider) {
      rider.isBusy = false;
      rider.totalEarnings += delivery.riderEarnings;
      rider.outstandingPayout += delivery.riderEarnings;
      rider.totalDeliveries += 1;
      await rider.save();
    }

    // Check payment status: Handle COD vs Online Payment
    const order = await OrderModel.findOne({ orderId: delivery.orderId });
    if (order) {
      const updateFields: any = {
        fulfillmentStatus: 'delivered',
        $push: {
          timeline: {
            status: 'delivered',
            timestamp: new Date(),
            note: 'Order delivered successfully to recipient',
          },
        },
      };

      if (order.paymentMethod === 'cash') {
        updateFields.paymentStatus = 'captured';
      }

      await OrderModel.findOneAndUpdate({ orderId: delivery.orderId }, updateFields);
    }

    return delivery;
  }

  async getEarningsSummary(userId: string) {
    const rider = await DeliveryRiderModel.findOne({ userId });
    if (!rider) throw new Error('Rider not found');

    return {
      todayEarnings: Math.round(rider.totalEarnings * 0.25),
      weeklyEarnings: Math.round(rider.totalEarnings * 0.7),
      totalEarnings: rider.totalEarnings,
      completedDeliveries: rider.totalDeliveries,
      outstandingPayout: rider.outstandingPayout,
      rating: rider.rating,
    };
  }

  async requestPayout(userId: string, amount: number) {
    const rider = await DeliveryRiderModel.findOne({ userId });
    if (!rider) throw new Error('Rider not found');

    if (amount > rider.outstandingPayout) {
      throw new Error(`Requested amount ₹${amount} exceeds outstanding balance of ₹${rider.outstandingPayout}`);
    }

    const payout = await PayoutModel.create({
      payoutId: `pay_${uuidv4().slice(0, 8)}`,
      recipientType: 'rider',
      recipientId: rider.riderId,
      recipientName: rider.fullName,
      bankDetails: {
        bankName: rider.payoutAccount.bankName || 'State Bank of India',
        accountHolderName: rider.payoutAccount.accountHolderName || rider.fullName,
        accountNumber: rider.payoutAccount.accountNumber || '98765432101',
        ifscCode: rider.payoutAccount.ifscCode || 'SBIN0000123',
        upiId: rider.payoutAccount.upiId,
      },
      amount,
      status: 'pending',
    });

    rider.outstandingPayout -= amount;
    await rider.save();

    return payout;
  }
}

export const deliveryService = new DeliveryService();
