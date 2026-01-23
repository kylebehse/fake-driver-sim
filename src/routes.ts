/**
 * Predefined GPS routes for simulation
 *
 * Each route is an array of waypoints that the simulator will follow.
 * The simulator interpolates between waypoints based on speed.
 */

export interface Waypoint {
  lat: number;
  lng: number;
  // Optional: pause at this waypoint (simulating a delivery stop)
  pauseMs?: number;
}

/**
 * San Francisco delivery route
 * Starts downtown, makes several stops in residential areas
 */
export const sfDeliveryRoute: Waypoint[] = [
  // Start: Downtown SF (Market St)
  { lat: 37.7749, lng: -122.4194 },
  // Head toward Mission District
  { lat: 37.7599, lng: -122.4148, pauseMs: 5000 },
  // Stop 1: Valencia St
  { lat: 37.7579, lng: -122.4211, pauseMs: 8000 },
  // Continue to Noe Valley
  { lat: 37.7502, lng: -122.4337, pauseMs: 5000 },
  // Stop 2: 24th St
  { lat: 37.7515, lng: -122.4283, pauseMs: 8000 },
  // Head to Castro
  { lat: 37.7609, lng: -122.4350 },
  // Stop 3: Castro St
  { lat: 37.7625, lng: -122.4351, pauseMs: 8000 },
  // Return toward downtown via Market
  { lat: 37.7683, lng: -122.4268 },
  { lat: 37.7749, lng: -122.4194 },
];

/**
 * Generic square route for testing
 * Creates a 1km x 1km square around a starting point
 */
export function generateSquareRoute(centerLat: number, centerLng: number): Waypoint[] {
  const offset = 0.005; // ~500m
  return [
    { lat: centerLat + offset, lng: centerLng - offset },
    { lat: centerLat + offset, lng: centerLng + offset, pauseMs: 5000 },
    { lat: centerLat - offset, lng: centerLng + offset, pauseMs: 5000 },
    { lat: centerLat - offset, lng: centerLng - offset, pauseMs: 5000 },
    { lat: centerLat + offset, lng: centerLng - offset },
  ];
}

/**
 * Calculate bearing between two points (for heading)
 */
export function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;

  const y = Math.sin(dLng) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
            Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);

  let bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360;
}

/**
 * Calculate distance between two points in meters (Haversine)
 */
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Interpolate position between two points
 * @param fraction 0-1, where 0 is start and 1 is end
 */
export function interpolatePosition(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
  fraction: number
): { lat: number; lng: number } {
  return {
    lat: lat1 + (lat2 - lat1) * fraction,
    lng: lng1 + (lng2 - lng1) * fraction
  };
}
