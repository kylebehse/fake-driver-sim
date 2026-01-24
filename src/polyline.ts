/**
 * Polyline decoder and geographic utilities for the fake driver simulator.
 *
 * This module provides functions for:
 * - Decoding Google-encoded polyline strings into coordinate arrays
 * - Calculating bearing/heading between points
 * - Computing distances using the Haversine formula
 * - Interpolating positions along a path
 *
 * All functions work with the Coordinates interface for consistency.
 *
 * @see https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */

import type { Coordinates } from './types.js';

/**
 * Earth's radius in meters.
 * Used for distance calculations with the Haversine formula.
 */
const EARTH_RADIUS_METERS = 6371000;

/**
 * Converts degrees to radians.
 *
 * @param degrees - Angle in degrees
 * @returns Angle in radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Converts radians to degrees.
 *
 * @param radians - Angle in radians
 * @returns Angle in degrees
 */
function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Decodes a Google-encoded polyline string into an array of coordinates.
 *
 * Google's polyline encoding algorithm compresses a series of latitude/longitude
 * pairs into a compact ASCII string. This function reverses that process.
 *
 * The algorithm works by:
 * 1. Reading chunks of 5-bit values until a value less than 0x20 is found
 * 2. Combining the chunks into a signed integer
 * 3. Adding the delta to the running lat/lng values
 * 4. Dividing by 1e5 to get decimal degrees
 *
 * @param encoded - Google-encoded polyline string
 * @returns Array of Coordinates representing the decoded path
 *
 * @example
 * ```typescript
 * const points = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
 * // Returns array of { lat, lng } objects
 * ```
 *
 * @see https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */
export function decodePolyline(encoded: string): Coordinates[] {
  const coordinates: Coordinates[] = [];

  if (!encoded || encoded.length === 0) {
    return coordinates;
  }

  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    // Decode latitude
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    // Convert from two's complement if negative
    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    // Decode longitude
    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    // Convert from two's complement if negative
    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    // Convert to decimal degrees (polyline uses 5 decimal places of precision)
    coordinates.push({
      lat: lat / 1e5,
      lng: lng / 1e5,
    });
  }

  return coordinates;
}

/**
 * Calculates the initial bearing (heading) from one point to another.
 *
 * The bearing is the compass direction from the starting point to the
 * destination point, measured in degrees clockwise from true north.
 *
 * Uses spherical geometry to account for Earth's curvature, which is
 * important for longer distances but also provides accurate results
 * for short distances.
 *
 * @param from - Starting coordinate
 * @param to - Destination coordinate
 * @returns Bearing in degrees (0-360), where 0 is north, 90 is east, etc.
 *
 * @example
 * ```typescript
 * const bearing = calculateBearing(
 *   { lat: 40.7128, lng: -74.0060 }, // NYC
 *   { lat: 34.0522, lng: -118.2437 } // LA
 * );
 * // Returns approximately 273 degrees (west-ish)
 * ```
 */
export function calculateBearing(from: Coordinates, to: Coordinates): number {
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const deltaLng = toRadians(to.lng - from.lng);

  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);

  let bearing = toDegrees(Math.atan2(y, x));

  // Normalize to 0-360 range
  return (bearing + 360) % 360;
}

/**
 * Calculates the great-circle distance between two points using the Haversine formula.
 *
 * The Haversine formula determines the shortest distance over Earth's surface,
 * giving an "as-the-crow-flies" distance between two points. This is the standard
 * formula for calculating distances on a sphere.
 *
 * Formula:
 * a = sin^2(deltaLat/2) + cos(lat1) * cos(lat2) * sin^2(deltaLng/2)
 * c = 2 * atan2(sqrt(a), sqrt(1-a))
 * d = R * c
 *
 * @param p1 - First coordinate
 * @param p2 - Second coordinate
 * @returns Distance in meters
 *
 * @example
 * ```typescript
 * const distance = haversineDistance(
 *   { lat: 40.7128, lng: -74.0060 }, // NYC
 *   { lat: 40.7580, lng: -73.9855 }  // Times Square
 * );
 * // Returns approximately 5600 meters
 * ```
 */
export function haversineDistance(p1: Coordinates, p2: Coordinates): number {
  const lat1 = toRadians(p1.lat);
  const lat2 = toRadians(p2.lat);
  const deltaLat = toRadians(p2.lat - p1.lat);
  const deltaLng = toRadians(p2.lng - p1.lng);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

/**
 * Linearly interpolates a position between two coordinates.
 *
 * This performs simple linear interpolation, which is accurate for small
 * distances (within a city block or so). For longer distances, great-circle
 * interpolation should be used instead, but linear interpolation is
 * sufficient for simulating driving along decoded polylines where points
 * are closely spaced.
 *
 * @param from - Starting coordinate
 * @param to - Ending coordinate
 * @param fraction - Interpolation factor (0-1), where 0 returns `from` and 1 returns `to`
 * @returns Interpolated coordinate
 *
 * @example
 * ```typescript
 * const midpoint = interpolatePosition(
 *   { lat: 40.0, lng: -74.0 },
 *   { lat: 41.0, lng: -73.0 },
 *   0.5
 * );
 * // Returns { lat: 40.5, lng: -73.5 }
 * ```
 */
export function interpolatePosition(
  from: Coordinates,
  to: Coordinates,
  fraction: number
): Coordinates {
  // Clamp fraction to [0, 1] range for safety
  const t = Math.max(0, Math.min(1, fraction));

  return {
    lat: from.lat + (to.lat - from.lat) * t,
    lng: from.lng + (to.lng - from.lng) * t,
  };
}

/**
 * Calculates the total length of a polyline path.
 *
 * Sums the Haversine distances between consecutive points in the path.
 * Useful for estimating route distances or calculating progress percentages.
 *
 * @param points - Array of coordinates representing the path
 * @returns Total distance in meters
 *
 * @example
 * ```typescript
 * const totalDistance = calculatePolylineLength(decodedPoints);
 * ```
 */
export function calculatePolylineLength(points: Coordinates[]): number {
  if (points.length < 2) {
    return 0;
  }

  let totalDistance = 0;

  for (let i = 0; i < points.length - 1; i++) {
    totalDistance += haversineDistance(points[i], points[i + 1]);
  }

  return totalDistance;
}

/**
 * Finds the closest point on a polyline to a given coordinate.
 *
 * Returns the index of the polyline segment containing the closest point
 * and the fraction along that segment where the closest point lies.
 *
 * @param point - The coordinate to find the closest point to
 * @param polyline - Array of coordinates representing the polyline
 * @returns Object containing segmentIndex and fraction, or null if polyline is empty
 *
 * @example
 * ```typescript
 * const closest = findClosestPointOnPolyline(currentPosition, routePolyline);
 * if (closest) {
 *   console.log(`Closest point is on segment ${closest.segmentIndex}`);
 * }
 * ```
 */
export function findClosestPointOnPolyline(
  point: Coordinates,
  polyline: Coordinates[]
): { segmentIndex: number; fraction: number; distance: number } | null {
  if (polyline.length === 0) {
    return null;
  }

  if (polyline.length === 1) {
    return {
      segmentIndex: 0,
      fraction: 0,
      distance: haversineDistance(point, polyline[0]),
    };
  }

  let minDistance = Infinity;
  let closestSegmentIndex = 0;
  let closestFraction = 0;

  for (let i = 0; i < polyline.length - 1; i++) {
    const segmentStart = polyline[i];
    const segmentEnd = polyline[i + 1];

    // Project point onto the line segment
    const { fraction, distance } = projectPointOntoSegment(
      point,
      segmentStart,
      segmentEnd
    );

    if (distance < minDistance) {
      minDistance = distance;
      closestSegmentIndex = i;
      closestFraction = fraction;
    }
  }

  return {
    segmentIndex: closestSegmentIndex,
    fraction: closestFraction,
    distance: minDistance,
  };
}

/**
 * Projects a point onto a line segment and returns the fraction and distance.
 *
 * @param point - The point to project
 * @param segmentStart - Start of the line segment
 * @param segmentEnd - End of the line segment
 * @returns Object with fraction (0-1) along segment and distance to projected point
 */
function projectPointOntoSegment(
  point: Coordinates,
  segmentStart: Coordinates,
  segmentEnd: Coordinates
): { fraction: number; distance: number } {
  const dx = segmentEnd.lng - segmentStart.lng;
  const dy = segmentEnd.lat - segmentStart.lat;

  // If segment is a point, return distance to that point
  if (dx === 0 && dy === 0) {
    return {
      fraction: 0,
      distance: haversineDistance(point, segmentStart),
    };
  }

  // Calculate the projection fraction
  const t =
    ((point.lng - segmentStart.lng) * dx + (point.lat - segmentStart.lat) * dy) /
    (dx * dx + dy * dy);

  // Clamp to [0, 1] to stay within segment
  const clampedT = Math.max(0, Math.min(1, t));

  // Get the projected point
  const projectedPoint = interpolatePosition(segmentStart, segmentEnd, clampedT);

  return {
    fraction: clampedT,
    distance: haversineDistance(point, projectedPoint),
  };
}
