// src/modules/taxi/taxi.service.ts
import { v4 as uuidv4 } from 'uuid';
import { TaxiRideModel, TaxiDriverModel, UserModel } from '../../database/index.js';
import {
  calculateHaversineDistanceKm,
  calculateTaxiFare,
  Coordinates,
} from '../../utils/geo.js';

export class TaxiService {
  async getEstimates(pickup: Coordinates, destination: Coordinates) {
    const distanceKm = calculateHaversineDistanceKm(pickup, destination);

    const vehicleTypes = ['Bike', 'Auto', 'Mini', 'Sedan', 'SUV', 'Luxury'] as const;

    const estimates = vehicleTypes.map((type) => {
      const fare = calculateTaxiFare(distanceKm, type);
      return {
        id: type.toLowerCase(),
        name: type === 'Bike' ? 'UBS Bike Moto' : type === 'Auto' ? 'UBS Auto Rickshaw' : `UBS ${type}`,
        vehicleType: type,
        fare: fare.totalFare,
        baseFare: fare.baseFare,
        estimatedMinutes: fare.estimatedMinutes,
        distanceKm,
        etaMinutes: Math.min(10, Math.max(3, Math.round(distanceKm * 0.8))),
        currency: '₹',
      };
    });

    return {
      distanceKm,
      estimates,
    };
  }

  async getNearbyDrivers(pickup: Coordinates, vehicleType?: string) {
    const query: any = {
      status: 'approved',
      isOnline: true,
      isBusy: false,
      currentLocation: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [pickup.longitude, pickup.latitude],
          },
          $maxDistance: 10000, // 10km
        },
      },
    };

    if (vehicleType) {
      query.vehicleType = vehicleType;
    }

    const drivers = await TaxiDriverModel.find(query).limit(10);
    return drivers.map((d) => ({
      driverId: d.driverId,
      vehicleType: d.vehicleType,
      vehicleModel: d.vehicleModel,
      rating: d.rating,
      latitude: d.currentLocation.coordinates[1],
      longitude: d.currentLocation.coordinates[0],
      heading: d.currentLocation.heading || 0,
    }));
  }

  async bookRide(userId: string, data: {
    pickupAddress: string;
    pickupCoordinates: Coordinates;
    destinationAddress: string;
    destinationCoordinates: Coordinates;
    vehicleType: 'Bike' | 'Auto' | 'Mini' | 'Sedan' | 'SUV' | 'Luxury';
    paymentMethod?: 'razorpay' | 'cash' | 'wallet';
  }) {
    const user = await UserModel.findOne({ userId });
    const distanceKm = calculateHaversineDistanceKm(data.pickupCoordinates, data.destinationCoordinates);
    const fareEstimate = calculateTaxiFare(distanceKm, data.vehicleType);

    // Generate 4-digit passenger OTP
    const pickupOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const rideId = `RIDE-${Date.now().toString().slice(-6)}`;

    const ride = await TaxiRideModel.create({
      rideId,
      customerId: userId,
      customerName: user?.fullName || 'UBS Customer',
      customerPhone: user?.phone || '9876543210',
      vehicleType: data.vehicleType,
      pickupLocation: {
        address: data.pickupAddress,
        coordinates: [data.pickupCoordinates.longitude, data.pickupCoordinates.latitude],
      },
      destinationLocation: {
        address: data.destinationAddress,
        coordinates: [data.destinationCoordinates.longitude, data.destinationCoordinates.latitude],
      },
      distanceKm,
      estimatedMinutes: fareEstimate.estimatedMinutes,
      fare: {
        baseFare: fareEstimate.baseFare,
        distanceFare: fareEstimate.distanceFare,
        timeFare: fareEstimate.timeFare,
        subtotal: fareEstimate.subtotal,
        tax: fareEstimate.tax,
        totalFare: fareEstimate.totalFare,
        currency: 'INR',
        surgeMultiplier: 1.0,
      },
      pickupOtp,
      status: 'requested',
      paymentMethod: data.paymentMethod || 'cash',
      paymentStatus: 'pending',
    });

    return ride;
  }

  async getRide(rideId: string) {
    const ride = await TaxiRideModel.findOne({ rideId });
    if (!ride) throw new Error('Ride not found');

    let driver = null;
    if (ride.driverId) {
      driver = await TaxiDriverModel.findOne({ driverId: ride.driverId });
    }

    return {
      ride,
      driverCurrentLocation: driver?.currentLocation,
    };
  }

  async cancelRide(userId: string, rideId: string, reason?: string) {
    const ride = await TaxiRideModel.findOne({ rideId });
    if (!ride) throw new Error('Ride not found');

    if (ride.status === 'trip_started' || ride.status === 'completed') {
      throw new Error(`Ride cannot be cancelled while in ${ride.status} state.`);
    }

    ride.status = 'cancelled';
    ride.cancelledAt = new Date();
    ride.cancelledBy = 'customer';
    ride.cancellationReason = reason || 'Cancelled by passenger';
    await ride.save();

    if (ride.driverId) {
      await TaxiDriverModel.findOneAndUpdate({ driverId: ride.driverId }, { isBusy: false });
    }

    return ride;
  }
}

export const taxiService = new TaxiService();
