// src/services/googleMapsService.ts
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { calculateHaversineDistanceKm, estimateTravelTimeMinutes, Coordinates } from '../utils/geo.js';

export interface RouteResult {
  distanceKm: number;
  durationMinutes: number;
  encodedPolyline?: string;
  points?: Array<{ latitude: number; longitude: number }>;
  source: 'google_directions' | 'haversine_estimate';
  summary?: string;
}

// In-memory route cache (keyed by rounded lat/lng coordinates) to avoid repeated API calls
const routeCache = new Map<string, { data: RouteResult; timestamp: number }>();
const ROUTE_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes TTL

/**
 * Decode Google Encoded Polyline into Array of LatLng coordinates
 */
export function decodePolyline(encoded: string): Array<{ latitude: number; longitude: number }> {
  const points: Array<{ latitude: number; longitude: number }> = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return points;
}

export class GoogleMapsService {
  private serverApiKey: string;
  private countryRestriction: string;

  constructor() {
    this.serverApiKey = env.GOOGLE_MAPS_SERVER_API_KEY || '';
    this.countryRestriction = env.GOOGLE_MAPS_COUNTRY_RESTRICTION || 'IN';
  }

  /**
   * Calculate driving route distance, travel duration, and polyline between pickup & destination
   */
  async getRoute(pickup: Coordinates, destination: Coordinates, vehicleType = 'Sedan'): Promise<RouteResult> {
    // Generate cache key rounded to 4 decimals (~11 meters)
    const cacheKey = `${pickup.latitude.toFixed(4)},${pickup.longitude.toFixed(4)}->${destination.latitude.toFixed(4)},${destination.longitude.toFixed(4)}`;
    const cached = routeCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < ROUTE_CACHE_TTL_MS) {
      return cached.data;
    }

    // Try modern Google Routes API (New) or Directions API if valid key is available
    if (this.serverApiKey && !this.serverApiKey.includes('placeholder')) {
      // 1. Try Google Routes API (New v2)
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const routesRes = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': this.serverApiKey,
            'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.description',
          },
          body: JSON.stringify({
            origin: { location: { latLng: { latitude: pickup.latitude, longitude: pickup.longitude } } },
            destination: { location: { latLng: { latitude: destination.latitude, longitude: destination.longitude } } },
            travelMode: 'DRIVE',
            routingPreference: 'TRAFFIC_AWARE',
            regionCode: this.countryRestriction.toUpperCase(),
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (routesRes.ok) {
          const data: any = await routesRes.json();
          if (Array.isArray(data.routes) && data.routes.length > 0) {
            const route = data.routes[0];
            const distanceMeters = route.distanceMeters || 0;
            // duration format: "1234s"
            let durationSeconds = 0;
            if (typeof route.duration === 'string') {
              durationSeconds = parseInt(route.duration.replace('s', ''), 10) || 0;
            } else if (typeof route.duration === 'number') {
              durationSeconds = route.duration;
            }

            const distanceKm = Math.round((distanceMeters / 1000) * 100) / 100;
            const durationMinutes = Math.max(2, Math.round(durationSeconds / 60));
            const encodedPolyline = route.polyline?.encodedPolyline || '';
            const points = encodedPolyline ? decodePolyline(encodedPolyline) : [];

            const result: RouteResult = {
              distanceKm,
              durationMinutes,
              encodedPolyline,
              points,
              source: 'google_routes_api_v2',
              summary: route.description || 'Google Routes V2',
            };

            routeCache.set(cacheKey, { data: result, timestamp: Date.now() });
            return result;
          }
        }
      } catch (err: any) {
        logger.debug({ error: err.message }, 'Routes API attempt skipped or failed, trying fallback');
      }

      // 2. Try legacy Google Maps Directions API
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const origin = `${pickup.latitude},${pickup.longitude}`;
        const dest = `${destination.latitude},${destination.longitude}`;
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${dest}&mode=driving&region=${this.countryRestriction.toLowerCase()}&key=${this.serverApiKey}`;

        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data: any = await res.json();
          if (data.status === 'OK' && Array.isArray(data.routes) && data.routes.length > 0) {
            const route = data.routes[0];
            const leg = route.legs?.[0];

            if (leg) {
              const distanceMeters = leg.distance?.value || 0;
              const durationSeconds = leg.duration?.value || 0;

              const distanceKm = Math.round((distanceMeters / 1000) * 100) / 100;
              const durationMinutes = Math.max(2, Math.round(durationSeconds / 60));
              const encodedPolyline = route.overview_polyline?.points || '';
              const points = encodedPolyline ? decodePolyline(encodedPolyline) : [];

              const result: RouteResult = {
                distanceKm,
                durationMinutes,
                encodedPolyline,
                points,
                source: 'google_directions',
                summary: route.summary || leg.start_address,
              };

              routeCache.set(cacheKey, { data: result, timestamp: Date.now() });
              return result;
            }
          }
        }
      } catch (err: any) {
        logger.debug({ error: err.message }, 'Failed Google Directions request, falling back to Haversine route');
      }
    }

    // Fallback: Precise Haversine calculation with speed model and road curvature factor
    const directDistance = calculateHaversineDistanceKm(pickup, destination);
    // Real roads in Indian cities/highways average 1.25x to 1.35x curvature factor over straight line
    const roadCurvatureFactor = directDistance < 5 ? 1.32 : directDistance < 20 ? 1.25 : 1.18;
    const distanceKm = Math.round(directDistance * roadCurvatureFactor * 100) / 100;
    const durationMinutes = estimateTravelTimeMinutes(distanceKm, vehicleType);

    // Generate basic interpolated polyline between pickup and destination
    const points: Array<{ latitude: number; longitude: number }> = [
      { latitude: pickup.latitude, longitude: pickup.longitude },
      {
        latitude: (pickup.latitude * 2 + destination.latitude) / 3,
        longitude: (pickup.longitude * 2 + destination.longitude) / 3,
      },
      {
        latitude: (pickup.latitude + destination.latitude * 2) / 3,
        longitude: (pickup.longitude + destination.longitude * 2) / 3,
      },
      { latitude: destination.latitude, longitude: destination.longitude },
    ];

    const fallbackResult: RouteResult = {
      distanceKm: Math.max(0.5, distanceKm),
      durationMinutes,
      points,
      source: 'haversine_estimate',
    };

    routeCache.set(cacheKey, { data: fallbackResult, timestamp: Date.now() });
    return fallbackResult;
  }
}

export const googleMapsService = new GoogleMapsService();
