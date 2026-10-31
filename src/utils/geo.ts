// src/utils/geo.ts
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Calculate Great-Circle distance between two coordinates in kilometers using Haversine formula
 */
export function calculateHaversineDistanceKm(pointA: Coordinates, pointB: Coordinates): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(pointB.latitude - pointA.latitude);
  const dLon = toRad(pointB.longitude - pointA.longitude);

  const lat1 = toRad(pointA.latitude);
  const lat2 = toRad(pointB.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c;
  return Math.round(distance * 100) / 100; // 2 decimal places
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Estimate travel time in minutes based on distance and vehicle average city speed
 */
export function estimateTravelTimeMinutes(
  distanceKm: number,
  vehicleType: string = 'Sedan'
): number {
  // Average city speeds (km/h) factoring in traffic
  const speedMap: Record<string, number> = {
    Bike: 28,
    motorcycle: 28,
    scooter: 26,
    electric_scooter: 24,
    bicycle: 15,
    Auto: 22,
    Mini: 24,
    Sedan: 25,
    SUV: 22,
    Luxury: 26,
  };

  const avgSpeed = speedMap[vehicleType] || 25;
  const bufferMinutes = 4; // Traffic buffer
  const travelMinutes = (distanceKm / avgSpeed) * 60;
  return Math.max(3, Math.round(travelMinutes + bufferMinutes));
}

export interface TaxiFareEstimate {
  vehicleType: string;
  baseFare: number;
  distanceKm: number;
  distanceFare: number;
  estimatedMinutes: number;
  timeFare: number;
  subtotal: number;
  tax: number;
  totalFare: number;
  surgeMultiplier: number;
}

/**
 * Calculate taxi ride fare based on vehicle category and distance
 */
export function calculateTaxiFare(
  distanceKm: number,
  vehicleType: 'Bike' | 'Auto' | 'Mini' | 'Sedan' | 'SUV' | 'Luxury',
  surgeMultiplier: number = 1.0
): TaxiFareEstimate {
  // Configurable base vehicle pricing
  const rates: Record<
    string,
    { base: number; minKm: number; perKm: number; perMin: number; minFare: number }
  > = {
    Bike: { base: 25, minKm: 1.5, perKm: 9, perMin: 1.0, minFare: 35 },
    Auto: { base: 35, minKm: 2.0, perKm: 13, perMin: 1.2, minFare: 50 },
    Mini: { base: 60, minKm: 3.0, perKm: 16, perMin: 1.5, minFare: 90 },
    Sedan: { base: 80, minKm: 3.0, perKm: 19, perMin: 2.0, minFare: 120 },
    SUV: { base: 120, minKm: 4.0, perKm: 24, perMin: 2.5, minFare: 180 },
    Luxury: { base: 250, minKm: 5.0, perKm: 38, perMin: 4.0, minFare: 350 },
  };

  const config = rates[vehicleType] || rates.Sedan;
  const estimatedMins = estimateTravelTimeMinutes(distanceKm, vehicleType);

  const chargeableKm = Math.max(0, distanceKm - config.minKm);
  const distanceFare = chargeableKm * config.perKm;
  const timeFare = estimatedMins * config.perMin;

  const rawSubtotal = (config.base + distanceFare + timeFare) * surgeMultiplier;
  const subtotal = Math.max(config.minFare, Math.round(rawSubtotal));
  const tax = Math.round(subtotal * 0.05); // 5% GST
  const totalFare = subtotal + tax;

  return {
    vehicleType,
    baseFare: config.base,
    distanceKm,
    distanceFare: Math.round(distanceFare),
    estimatedMinutes: estimatedMins,
    timeFare: Math.round(timeFare),
    subtotal,
    tax,
    totalFare,
    surgeMultiplier,
  };
}

/**
 * Calculate order delivery fee based on distance and order total
 */
export function calculateDeliveryFee(distanceKm: number, orderSubtotal: number): number {
  if (orderSubtotal >= 500 && distanceKm <= 5) {
    return 0; // Free delivery over ₹500 within 5km
  }

  const baseDelivery = 35;
  if (distanceKm <= 3) return baseDelivery;

  // ₹8 per km after 3km
  const extraKm = distanceKm - 3;
  return Math.round(baseDelivery + extraKm * 8);
}
