// src/modules/drivers/drivers.service.ts
import { TaxiDriverModel, TaxiRideModel, PayoutModel, UserModel } from '../../database/index.js';
import { v4 as uuidv4 } from 'uuid';
import { socketEvents } from '../../sockets/index.js';
import { isTestPhoneNumber } from '../../config/twilio.js';
import mongoose from 'mongoose';

const memoryDriverStore = new Map<string, any>();

export class DriversService {
  async getProfile(userId: string) {
    if (mongoose.connection.readyState === 1) {
      try {
        let driver = await TaxiDriverModel.findOne({ userId });
        if (!driver) {
          const user = await UserModel.findOne({ userId });
          const isTest = isTestPhoneNumber(user?.phone || '');
          driver = await TaxiDriverModel.create({
            driverId: `drv_${uuidv4().slice(0, 8)}`,
            userId,
            fullName: user?.fullName || 'Driver Partner',
            phone: user?.phone || '',
            vehicleType: 'Sedan',
            vehicleModel: isTest ? 'Toyota Innova Crysta' : '',
            registrationNumber: isTest ? 'KA-01-MJ-9999' : '',
            status: isTest ? 'approved' : 'draft',
          });
        }
        return driver;
      } catch {
        // Fallback
      }
    }

    if (!memoryDriverStore.has(userId)) {
      memoryDriverStore.set(userId, {
        driverId: `drv_${uuidv4().slice(0, 8)}`,
        userId,
        fullName: 'Driver Partner',
        phone: '',
        vehicleType: 'Sedan',
        vehicleModel: '',
        registrationNumber: '',
        status: 'draft',
        isOnline: false,
        save: async function () {
          return this;
        },
      });
    }
    return memoryDriverStore.get(userId);
  }

  async updateProfile(userId: string, data: any) {
    const driver = await TaxiDriverModel.findOneAndUpdate(
      { userId },
      { $set: data },
      { new: true, upsert: true }
    );
    return driver;
  }

  async submitProfileForReview(userId: string) {
    const driver = await TaxiDriverModel.findOne({ userId });
    if (!driver) throw new Error('Driver profile not found');

    // Validate minimum required fields
    if (!driver.documents.licence.number || !driver.documents.rc.number) {
      throw new Error('Please upload driving licence and vehicle registration before submitting.');
    }

    driver.status = 'submitted';
    await driver.save();
    return driver;
  }

  async updateLicence(userId: string, data: { number: string; expiryDate: string; frontUrl: string; backUrl?: string }) {
    const driver = await TaxiDriverModel.findOneAndUpdate(
      { userId },
      {
        'documents.licence.number': data.number,
        'documents.licence.expiryDate': data.expiryDate,
        'documents.licence.frontUrl': data.frontUrl,
        'documents.licence.backUrl': data.backUrl,
        'documents.licence.status': 'pending',
      },
      { new: true }
    );
    return driver?.documents.licence;
  }

  async updateRC(userId: string, data: { number: string; expiryDate?: string; frontUrl: string; backUrl?: string }) {
    const driver = await TaxiDriverModel.findOneAndUpdate(
      { userId },
      {
        'documents.rc.number': data.number,
        'documents.rc.expiryDate': data.expiryDate,
        'documents.rc.frontUrl': data.frontUrl,
        'documents.rc.backUrl': data.backUrl,
        'documents.rc.status': 'pending',
        registrationNumber: data.number.toUpperCase(),
      },
      { new: true }
    );
    return driver?.documents.rc;
  }

  async updateVehiclePhotos(userId: string, data: { front: string; rear: string; side?: string; interior?: string; numberPlate: string }) {
    const driver = await TaxiDriverModel.findOneAndUpdate(
      { userId },
      {
        'documents.vehiclePhotos.front': data.front,
        'documents.vehiclePhotos.rear': data.rear,
        'documents.vehiclePhotos.side': data.side,
        'documents.vehiclePhotos.interior': data.interior,
        'documents.vehiclePhotos.numberPlate': data.numberPlate,
        'documents.vehiclePhotos.status': 'pending',
      },
      { new: true }
    );
    return driver?.documents.vehiclePhotos;
  }

  async setAvailability(userId: string, isOnline: boolean) {
    const driver = await this.getProfile(userId);
    if (!driver) throw new Error('Driver not found');

    if (isOnline && driver.status !== 'approved') {
      throw new Error('Only approved drivers can go online. Your profile is currently ' + driver.status);
    }

    driver.isOnline = isOnline;
    await driver.save();
    return { isOnline: driver.isOnline, status: driver.status };
  }

  async updateLocation(userId: string, latitude: number, longitude: number, heading = 0) {
    const driver = await TaxiDriverModel.findOneAndUpdate(
      { userId },
      {
        currentLocation: {
          type: 'Point',
          coordinates: [longitude, latitude],
          heading,
          updatedAt: new Date(),
        },
      },
      { new: true }
    );

    if (driver?.driverId) {
      const activeRide = await TaxiRideModel.findOne({
        driverId: driver.driverId,
        status: { $in: ['accepted', 'arriving', 'arrived', 'trip_started'] },
      });
      if (activeRide) {
        socketEvents.emitDriverLocation(activeRide.rideId, { latitude, longitude, heading });
      }
    }

    return { success: true, updatedLocation: driver?.currentLocation };
  }

  async getAvailableRides(userId: string) {
    const driver = await TaxiDriverModel.findOne({ userId });
    if (!driver || !driver.isOnline || driver.status !== 'approved') {
      return [];
    }

    const rides = await TaxiRideModel.find({
      status: 'requested',
      vehicleType: driver.vehicleType,
      declinedDriverIds: { $ne: driver.driverId },
    })
      .sort({ createdAt: -1 })
      .limit(5);

    return rides;
  }

  async getActiveRide(userId: string) {
    const driver = await TaxiDriverModel.findOne({ userId });
    if (!driver) return null;

    const ride = await TaxiRideModel.findOne({
      driverId: driver.driverId,
      status: { $in: ['accepted', 'arriving', 'arrived', 'trip_started'] },
    });

    return ride;
  }

  async acceptRide(userId: string, rideId: string) {
    const driver = await TaxiDriverModel.findOne({ userId });
    if (!driver) throw new Error('Driver not found');

    // Atomic assignment using findOneAndUpdate to prevent race condition
    const ride = await TaxiRideModel.findOneAndUpdate(
      { rideId, status: 'requested' },
      {
        status: 'accepted',
        driverId: driver.driverId,
        driverName: driver.fullName,
        driverPhone: driver.phone,
        vehicleModel: driver.vehicleModel,
        registrationNumber: driver.registrationNumber,
      },
      { new: true }
    );

    if (!ride) {
      throw new Error('Ride is no longer available or was accepted by another driver.');
    }

    driver.isBusy = true;
    await driver.save();

    // Broadcast driver assigned event to customer
    socketEvents.emitDriverAssigned(ride.rideId, {
      driverId: driver.driverId,
      name: driver.fullName,
      phone: driver.phone,
      vehicleType: driver.vehicleType,
      vehicleModel: driver.vehicleModel,
      vehicleNumber: driver.registrationNumber,
      rating: driver.rating || 5.0,
      customerId: ride.customerId,
    });

    return ride;
  }

  async declineRide(userId: string, rideId: string) {
    const driver = await TaxiDriverModel.findOne({ userId });
    if (!driver) throw new Error('Driver not found');

    await TaxiRideModel.findOneAndUpdate(
      { rideId },
      { $addToSet: { declinedDriverIds: driver.driverId } }
    );
    return { success: true };
  }

  async updateRideArrived(userId: string, rideId: string) {
    const driver = await TaxiDriverModel.findOne({ userId });
    const ride = await TaxiRideModel.findOneAndUpdate(
      { rideId, driverId: driver?.driverId, status: { $in: ['accepted', 'arriving'] } },
      { status: 'arrived' },
      { new: true }
    );
    if (!ride) throw new Error('Could not update status to arrived.');
    socketEvents.emitDriverArrived(ride.rideId);
    return ride;
  }

  async startRide(userId: string, rideId: string, otp: string) {
    const driver = await TaxiDriverModel.findOne({ userId });
    const ride = await TaxiRideModel.findOne({ rideId, driverId: driver?.driverId });

    if (!ride) throw new Error('Ride not found.');
    if (ride.pickupOtp !== otp.trim()) {
      throw new Error('Invalid passenger pickup OTP. Please ask the passenger for the 4-digit code.');
    }

    ride.status = 'trip_started';
    ride.startedAt = new Date();
    await ride.save();
    socketEvents.emitRideStarted(ride.rideId);
    return ride;
  }

  async completeRide(userId: string, rideId: string) {
    const driver = await TaxiDriverModel.findOne({ userId });
    const ride = await TaxiRideModel.findOne({ rideId, driverId: driver?.driverId, status: 'trip_started' });

    if (!ride) throw new Error('Active trip not found.');

    ride.status = 'completed';
    ride.completedAt = new Date();
    ride.paymentStatus = ride.paymentMethod === 'cash' ? 'cash_collected' : 'captured';
    await ride.save();

    if (driver) {
      driver.isBusy = false;
      const earnings = Math.round(ride.fare.totalFare * 0.85); // 85% to driver, 15% platform commission
      driver.totalEarnings += earnings;
      driver.commissionPaid += ride.fare.totalFare - earnings;
      driver.outstandingPayout += earnings;
      driver.totalRides += 1;
      await driver.save();
    }

    socketEvents.emitRideCompleted(ride.rideId, {
      rideId: ride.rideId,
      finalFare: ride.fare.totalFare,
      status: 'completed',
    });

    return ride;
  }

  async getEarningsSummary(userId: string) {
    const driver = await TaxiDriverModel.findOne({ userId });
    if (!driver) throw new Error('Driver not found');

    return {
      todayEarnings: Math.round(driver.totalEarnings * 0.2), // sample daily slice
      weeklyEarnings: Math.round(driver.totalEarnings * 0.6),
      totalEarnings: driver.totalEarnings,
      completedRides: driver.totalRides,
      commissionPaid: driver.commissionPaid,
      outstandingPayout: driver.outstandingPayout,
      rating: driver.rating,
    };
  }

  async requestPayout(userId: string, amount: number) {
    const driver = await TaxiDriverModel.findOne({ userId });
    if (!driver) throw new Error('Driver not found');

    if (amount > driver.outstandingPayout) {
      throw new Error(`Requested amount ₹${amount} exceeds outstanding balance of ₹${driver.outstandingPayout}`);
    }

    const payout = await PayoutModel.create({
      payoutId: `pay_${uuidv4().slice(0, 8)}`,
      recipientType: 'driver',
      recipientId: driver.driverId,
      recipientName: driver.fullName,
      bankDetails: {
        bankName: driver.payoutAccount.bankName || 'HDFC Bank',
        accountHolderName: driver.payoutAccount.accountHolderName || driver.fullName,
        accountNumber: driver.payoutAccount.accountNumber || '1234567890',
        ifscCode: driver.payoutAccount.ifscCode || 'HDFC0000001',
        upiId: driver.payoutAccount.upiId,
      },
      amount,
      status: 'pending',
    });

    driver.outstandingPayout -= amount;
    await driver.save();

    return payout;
  }
}

export const driversService = new DriversService();
