// src/modules/taxi/taxi.service.ts
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { TaxiRideModel, TaxiDriverModel, UserModel, TaxiPricingModel, DEFAULT_TAXI_PRICING, ITaxiPricing } from '../../database/index.js';
import { VehicleCategory } from '../../database/TaxiDriver.js';
import { calculateHaversineDistanceKm, Coordinates } from '../../utils/geo.js';
import { googleMapsService } from '../../services/googleMapsService.js';
import { socketEvents } from '../../sockets/index.js';
import { logger } from '../../utils/logger.js';

function isDbConnected(): boolean {
  return mongoose.connection && mongoose.connection.readyState === 1;
}

function normalizeVehicleCategory(type?: string): VehicleCategory | undefined {
  if (!type || type.toLowerCase() === 'all') return undefined;
  const lower = type.toLowerCase();
  if (lower === 'bike' || lower === 'moto') return 'Bike';
  if (lower === 'auto') return 'Auto';
  if (lower === 'mini') return 'Mini';
  if (lower === 'sedan') return 'Sedan';
  if (lower === 'suv' || lower === 'xl') return 'SUV';
  if (lower === 'luxury' || lower === 'premier') return 'Luxury';
  return type as VehicleCategory;
}

function isNightHour(startHour: number, endHour: number): boolean {
  const currentHour = new Date().getHours();
  if (startHour > endHour) {
    // e.g. 22:00 to 05:00
    return currentHour >= startHour || currentHour < endHour;
  }
  return currentHour >= startHour && currentHour < endHour;
}

export class TaxiService {
  /**
   * Seed default pricing if none exists in database
   */
  async ensureDefaultPricing() {
    if (!isDbConnected()) return;
    try {
      const count = await TaxiPricingModel.countDocuments().maxTimeMS(2000);
      if (count === 0) {
        logger.info('Initializing default Taxi Pricing configurations in database...');
        await TaxiPricingModel.insertMany(DEFAULT_TAXI_PRICING);
      }
    } catch (err: any) {
      logger.warn({ error: err.message }, 'Failed to check or initialize default taxi pricing');
    }
  }

  /**
   * Retrieve all active pricing configurations for admin or public reference
   */
  async getPricing(includeInactive = false) {
    if (isDbConnected()) {
      try {
        await this.ensureDefaultPricing();
        const query = includeInactive ? {} : { isActive: true };
        const pricing = await TaxiPricingModel.find(query).sort({ baseFare: 1 }).maxTimeMS(2000);
        if (pricing && pricing.length > 0) return pricing;
      } catch (err: any) {
        logger.warn({ error: err.message }, 'Fallback to default pricing');
      }
    }
    return DEFAULT_TAXI_PRICING;
  }

  /**
   * Admin: Update or create vehicle pricing rules
   */
  async updatePricing(pricingList: Array<Partial<ITaxiPricing>>, updatedBy?: string) {
    const results = [];
    for (const item of pricingList) {
      if (!item.vehicleType) continue;

      const updated = await TaxiPricingModel.findOneAndUpdate(
        { vehicleType: item.vehicleType },
        {
          $set: {
            ...item,
            updatedBy: updatedBy || 'admin',
            updatedAt: new Date(),
          },
        },
        { new: true, upsert: true }
      );
      results.push(updated);
    }
    return results;
  }

  /**
   * Calculate route distance, duration and dynamic fare estimates using database-configured pricing
   */
  async getEstimates(pickup: Coordinates, destination: Coordinates) {
    await this.ensureDefaultPricing();

    // 1. Calculate actual route distance and duration using Google Maps
    const route = await googleMapsService.getRoute(pickup, destination);
    const distanceKm = route.distanceKm;
    const durationMinutes = route.durationMinutes;

    // 2. Fetch active dynamic pricing configurations from database
    let pricingList: any[] = [];
    if (isDbConnected()) {
      try {
        pricingList = await TaxiPricingModel.find({ isActive: true }).sort({ baseFare: 1 }).maxTimeMS(2000);
      } catch (err: any) {
        logger.warn({ error: err.message }, 'Failed to query dynamic pricing from DB, using defaults');
      }
    }
    if (!pricingList || pricingList.length === 0) {
      pricingList = DEFAULT_TAXI_PRICING as any[];
    }

    // 3. Compute dynamic fare for each vehicle category
    const estimates = pricingList.map((pricing) => {
      const chargeableKm = Math.max(0, distanceKm - pricing.minKm);
      const distanceFare = chargeableKm * pricing.pricePerKm;
      const timeFare = durationMinutes * pricing.pricePerMinute;

      let rawFare = pricing.baseFare + distanceFare + timeFare + (pricing.bookingFee || 0);

      // Night surcharge calculation
      const nightActive = isNightHour(pricing.nightStartHour, pricing.nightEndHour);
      let nightSurcharge = 0;
      if (nightActive && pricing.nightSurchargePercent > 0) {
        nightSurcharge = (rawFare * pricing.nightSurchargePercent) / 100;
        rawFare += nightSurcharge;
      }

      // Peak hour / live surge multiplier
      const effectiveSurge = Math.max(pricing.surgeMultiplier || 1.0, pricing.peakHourSurchargeMultiplier || 1.0);
      rawFare = rawFare * effectiveSurge;

      // Minimum fare enforcement
      const subtotal = Math.max(pricing.minimumFare, Math.round(rawFare));
      const tax = Math.round(subtotal * 0.05); // 5% GST
      const totalFare = subtotal + tax;

      // Estimated driver ETA to pickup
      const etaMinutes = Math.min(12, Math.max(2, Math.round(distanceKm * 0.4) + 2));

      return {
        id: pricing.vehicleType.toLowerCase(),
        name: pricing.name,
        description: pricing.description,
        vehicleType: pricing.vehicleType,
        fare: totalFare,
        baseFare: pricing.baseFare,
        pricePerKm: pricing.pricePerKm,
        minimumFare: pricing.minimumFare,
        estimatedMinutes: durationMinutes,
        distanceKm,
        etaMinutes,
        breakdown: {
          baseFare: pricing.baseFare,
          distanceFare: Math.round(distanceFare),
          timeFare: Math.round(timeFare),
          bookingFee: pricing.bookingFee || 0,
          nightSurcharge: Math.round(nightSurcharge),
          tax,
          subtotal,
          totalFare,
          surgeMultiplier: effectiveSurge,
        },
        currency: '₹',
      };
    });

    return {
      distanceKm,
      durationMinutes,
      encodedPolyline: route.encodedPolyline,
      points: route.points,
      routeSummary: route.summary,
      routeSource: route.source,
      estimates,
    };
  }

  /**
   * Search nearby available taxi drivers using MongoDB 2dsphere geospatial indexing
   */
  async getNearbyDrivers(pickup: Coordinates, vehicleType?: string) {
    const targetCategory = normalizeVehicleCategory(vehicleType);

    const query: any = {
      status: 'approved',
      isOnline: true,
      isBusy: false,
    };

    if (targetCategory) {
      query.vehicleType = targetCategory;
    }

    let drivers = [];
    try {
      // Geospatial $near query on 2dsphere index: [longitude, latitude]
      const geoQuery = {
        ...query,
        currentLocation: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [pickup.longitude, pickup.latitude],
            },
            $maxDistance: 30000, // 30km radius
          },
        },
      };
      drivers = await TaxiDriverModel.find(geoQuery).limit(25);
    } catch {
      // Fallback query if index is building
      drivers = await TaxiDriverModel.find(query).limit(50);
    }

    // Map each driver with precise distance from pickup
    const mapped = drivers
      .map((d) => {
        const coords = d.currentLocation?.coordinates || [77.5946, 12.9716];
        const driverCoord: Coordinates = {
          longitude: coords[0],
          latitude: coords[1],
        };
        const distanceKm = Math.round(calculateHaversineDistanceKm(pickup, driverCoord) * 10) / 10;
        const etaMinutes = Math.max(2, Math.round(distanceKm * 2.2));

        return {
          driverId: d.driverId,
          fullName: d.fullName,
          phone: d.phone,
          vehicleType: d.vehicleType,
          vehicleModel: d.vehicleModel,
          registrationNumber: d.registrationNumber,
          rating: d.rating || 5.0,
          totalRides: d.totalRides || 0,
          latitude: coords[1],
          longitude: coords[0],
          heading: d.currentLocation?.heading || 0,
          distanceKm,
          etaMinutes,
        };
      })
      .filter((d) => d.distanceKm <= 35)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 15);

    return mapped;
  }

  /**
   * Book a ride with dynamic backend fare validation and driver broadcast
   */
  async bookRide(userId: string, data: any) {
    await this.ensureDefaultPricing();
    const user = await UserModel.findOne({ userId });

    // Extract pickup coordinates
    let pickupCoords: Coordinates = { latitude: 12.9716, longitude: 77.5946 };
    if (data.pickupCoordinates) {
      pickupCoords = data.pickupCoordinates;
    } else if (Array.isArray(data.pickupLocation)) {
      pickupCoords = { longitude: data.pickupLocation[0], latitude: data.pickupLocation[1] };
    } else if (data.pickupLocation?.latitude && data.pickupLocation?.longitude) {
      pickupCoords = data.pickupLocation;
    }

    // Extract destination coordinates
    let destCoords: Coordinates = { latitude: 12.9250, longitude: 77.6835 };
    if (data.destinationCoordinates) {
      destCoords = data.destinationCoordinates;
    } else if (Array.isArray(data.destinationLocation)) {
      destCoords = { longitude: data.destinationLocation[0], latitude: data.destinationLocation[1] };
    } else if (data.destinationLocation?.latitude && data.destinationLocation?.longitude) {
      destCoords = data.destinationLocation;
    }

    const rawVehicle = data.vehicleType || data.vehicleClass || 'Sedan';
    const normalizedCategory = normalizeVehicleCategory(rawVehicle) || 'Sedan';

    // 1. Calculate actual route distance
    const route = await googleMapsService.getRoute(pickupCoords, destCoords);
    const distanceKm = route.distanceKm;
    const durationMinutes = route.durationMinutes;

    // 2. Fetch active pricing for category
    let pricing = null;
    if (isDbConnected()) {
      try {
        pricing = (await TaxiPricingModel.findOne({ vehicleType: normalizedCategory, isActive: true }).maxTimeMS(2000)) ||
          (await TaxiPricingModel.findOne({ vehicleType: 'Sedan' }).maxTimeMS(2000));
      } catch (err: any) {
        logger.warn({ error: err.message }, 'Failed to query pricing from DB in requestRide');
      }
    }

    const pConfig = pricing || DEFAULT_TAXI_PRICING.find((p) => p.vehicleType === normalizedCategory) || DEFAULT_TAXI_PRICING[3]; // default Sedan

    const chargeableKm = Math.max(0, distanceKm - (pConfig.minKm || 2.0));
    const distanceFare = chargeableKm * (pConfig.pricePerKm || 19);
    const timeFare = durationMinutes * (pConfig.pricePerMinute || 2.0);

    let rawFare = (pConfig.baseFare || 80) + distanceFare + timeFare + (pConfig.bookingFee || 0);

    const nightActive = isNightHour(pConfig.nightStartHour || 22, pConfig.nightEndHour || 5);
    const nightPercent = pConfig.nightSurchargePercent ?? 0;
    if (nightActive && nightPercent > 0) {
      rawFare += (rawFare * nightPercent) / 100;
    }

    const effectiveSurge = Math.max(pConfig.surgeMultiplier || 1.0, pConfig.peakHourSurchargeMultiplier || 1.0);
    rawFare = rawFare * effectiveSurge;

    const subtotal = Math.max(pConfig.minimumFare || 120, Math.round(rawFare));
    const tax = Math.round(subtotal * 0.05);
    const totalFare = subtotal + tax;

    // Generate 4-digit passenger OTP
    const pickupOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const rideId = `RIDE-${Date.now().toString().slice(-6)}`;

    const ride = await TaxiRideModel.create({
      rideId,
      customerId: userId,
      customerName: user?.fullName || 'UBS Customer',
      customerPhone: user?.phone || '9876543210',
      vehicleType: normalizedCategory,
      pickupLocation: {
        address: data.pickupAddress || 'Pickup Point',
        coordinates: [pickupCoords.longitude, pickupCoords.latitude],
      },
      destinationLocation: {
        address: data.destinationAddress || 'Drop Point',
        coordinates: [destCoords.longitude, destCoords.latitude],
      },
      distanceKm,
      estimatedMinutes: durationMinutes,
      fare: {
        baseFare: pConfig.baseFare || 80,
        distanceFare: Math.round(distanceFare),
        timeFare: Math.round(timeFare),
        subtotal,
        tax,
        totalFare,
        currency: 'INR',
        surgeMultiplier: effectiveSurge,
      },
      pickupOtp,
      status: 'requested',
      paymentMethod: data.paymentMethod || 'cash',
      paymentStatus: 'pending',
    });

    // Broadcast ride to drivers pool via Socket.IO
    socketEvents.emitRideRequested({
      rideId: ride.rideId,
      customerId: ride.customerId,
      customerName: ride.customerName,
      customerPhone: ride.customerPhone,
      vehicleType: ride.vehicleType,
      pickupLocation: ride.pickupLocation,
      destinationLocation: ride.destinationLocation,
      distanceKm: ride.distanceKm,
      estimatedMinutes: ride.estimatedMinutes,
      fare: ride.fare,
      paymentMethod: ride.paymentMethod,
      createdAt: ride.createdAt,
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
      driver: driver
        ? {
            driverId: driver.driverId,
            name: driver.fullName,
            phone: driver.phone,
            vehicleType: driver.vehicleType,
            vehicleModel: driver.vehicleModel,
            vehicleNumber: driver.registrationNumber,
            rating: driver.rating || 5.0,
            photo: driver.documents?.vehiclePhotos?.front,
          }
        : undefined,
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

    socketEvents.emitRideCancelled(rideId, reason);

    return ride;
  }
}

export const taxiService = new TaxiService();
