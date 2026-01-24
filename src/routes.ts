/**
 * Predefined GPS routes for simulation
 *
 * Each route is an array of waypoints that the simulator will follow.
 * The simulator interpolates between waypoints based on speed.
 * Routes are designed to loop continuously for 24-hour shift simulation.
 */

export interface Waypoint {
  lat: number;
  lng: number;
  // Optional: pause at this waypoint (simulating a delivery stop)
  pauseMs?: number;
}

/**
 * San Francisco delivery route (fallback/testing)
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
 * Brooklyn delivery route
 * Covers Brooklyn Heights, Carroll Gardens, and Park Slope
 * Loops continuously for 24-hour shift simulation
 */
export const brooklynRoute: Waypoint[] = [
  // Start: Brooklyn Heights (near depot_sample_002)
  { lat: 40.6892, lng: -73.9857 },
  // Head to Atlantic Ave
  { lat: 40.6901, lng: -73.9967, pauseMs: 8000 },
  // Court St delivery
  { lat: 40.6856, lng: -73.9930, pauseMs: 8000 },
  // Smith St
  { lat: 40.6789, lng: -73.9932, pauseMs: 8000 },
  // Carroll Gardens
  { lat: 40.6789, lng: -74.0012, pauseMs: 8000 },
  // Red Hook approach
  { lat: 40.6750, lng: -74.0050, pauseMs: 5000 },
  // Back toward Carroll
  { lat: 40.6789, lng: -73.9932 },
  // Cobble Hill
  { lat: 40.6850, lng: -73.9950, pauseMs: 8000 },
  // Park Slope entrance
  { lat: 40.6800, lng: -73.9750, pauseMs: 8000 },
  // 7th Ave Park Slope
  { lat: 40.6720, lng: -73.9780, pauseMs: 8000 },
  // Prospect Park West
  { lat: 40.6650, lng: -73.9790, pauseMs: 8000 },
  // Loop back via 4th Ave
  { lat: 40.6750, lng: -73.9850 },
  // Back to start
  { lat: 40.6892, lng: -73.9857 },
];

/**
 * Manhattan Midtown delivery route
 * Covers Midtown East, Murray Hill, and Kips Bay
 * Loops continuously for 24-hour shift simulation
 */
export const manhattanMidtownRoute: Waypoint[] = [
  // Start: Near depot_sample_001 (Manhattan Distribution Center)
  { lat: 40.7484, lng: -73.9857 },
  // Park Ave delivery
  { lat: 40.7510, lng: -73.9780, pauseMs: 8000 },
  // Madison Ave
  { lat: 40.7495, lng: -73.9825, pauseMs: 8000 },
  // Lexington Ave
  { lat: 40.7485, lng: -73.9765, pauseMs: 8000 },
  // Third Ave
  { lat: 40.7475, lng: -73.9755, pauseMs: 8000 },
  // Second Ave (Murray Hill)
  { lat: 40.7465, lng: -73.9745, pauseMs: 8000 },
  // First Ave (Kips Bay)
  { lat: 40.7455, lng: -73.9735, pauseMs: 8000 },
  // Head north on First
  { lat: 40.7520, lng: -73.9680 },
  // E 42nd St
  { lat: 40.7490, lng: -73.9700, pauseMs: 8000 },
  // Grand Central area
  { lat: 40.7527, lng: -73.9772, pauseMs: 8000 },
  // Back toward Park Ave
  { lat: 40.7510, lng: -73.9800 },
  // Return to start
  { lat: 40.7484, lng: -73.9857 },
];

/**
 * DUMBO delivery route
 * Covers DUMBO, Brooklyn Bridge Park, and Vinegar Hill
 * Smaller area for cargo bike deliveries
 * Loops continuously for 24-hour shift simulation
 */
export const dumboRoute: Waypoint[] = [
  // Start: DUMBO (Water St)
  { lat: 40.7030, lng: -73.9910 },
  // Front St
  { lat: 40.7025, lng: -73.9885, pauseMs: 8000 },
  // Brooklyn Bridge Park
  { lat: 40.7020, lng: -73.9960, pauseMs: 8000 },
  // Main St DUMBO
  { lat: 40.7035, lng: -73.9905, pauseMs: 8000 },
  // Plymouth St
  { lat: 40.7040, lng: -73.9875, pauseMs: 8000 },
  // Vinegar Hill
  { lat: 40.7050, lng: -73.9830, pauseMs: 8000 },
  // Navy Yard area
  { lat: 40.7010, lng: -73.9780, pauseMs: 8000 },
  // Flushing Ave
  { lat: 40.6980, lng: -73.9800, pauseMs: 8000 },
  // Loop back via Jay St
  { lat: 40.6930, lng: -73.9870 },
  // Adams St
  { lat: 40.6920, lng: -73.9860, pauseMs: 8000 },
  // Return to DUMBO
  { lat: 40.7030, lng: -73.9910 },
];

/**
 * Burlington VT downtown delivery route
 * Covers downtown Burlington, Church St, and waterfront
 * For Walmart Burlington tenant deliveries
 * Loops continuously for 24-hour shift simulation
 */
export const burlingtonDowntownRoute: Waypoint[] = [
  // Start: Church St (downtown Burlington)
  { lat: 44.4759, lng: -73.2121 },
  // Cherry St
  { lat: 44.4781, lng: -73.2189, pauseMs: 8000 },
  // Main St
  { lat: 44.4795, lng: -73.2132, pauseMs: 8000 },
  // Pine St
  { lat: 44.4730, lng: -73.2156, pauseMs: 8000 },
  // College St
  { lat: 44.4768, lng: -73.2073, pauseMs: 8000 },
  // St Paul St
  { lat: 44.4802, lng: -73.2198, pauseMs: 8000 },
  // Battery St (waterfront)
  { lat: 44.4815, lng: -73.2235, pauseMs: 8000 },
  // King St
  { lat: 44.4742, lng: -73.2089, pauseMs: 8000 },
  // Loop back via Pearl St
  { lat: 44.4825, lng: -73.2145, pauseMs: 8000 },
  // Return to Church St
  { lat: 44.4759, lng: -73.2121 },
];

/**
 * Burlington VT outer route
 * Covers Willard St, North Ave, and Shelburne Rd areas
 * For Walmart Burlington tenant deliveries
 * Loops continuously for 24-hour shift simulation
 */
export const burlingtonOuterRoute: Waypoint[] = [
  // Start: Maple St
  { lat: 44.4688, lng: -73.2043 },
  // Willard St
  { lat: 44.4688, lng: -73.1945, pauseMs: 8000 },
  // North Ave
  { lat: 44.4920, lng: -73.2201, pauseMs: 8000 },
  // Riverside Ave
  { lat: 44.4870, lng: -73.2290, pauseMs: 8000 },
  // Back to downtown area
  { lat: 44.4759, lng: -73.2121, pauseMs: 8000 },
  // Shelburne Rd (south)
  { lat: 44.4550, lng: -73.2089, pauseMs: 8000 },
  // Pine St (south)
  { lat: 44.4610, lng: -73.2156, pauseMs: 8000 },
  // Return via downtown
  { lat: 44.4730, lng: -73.2156, pauseMs: 8000 },
  // Back to start
  { lat: 44.4688, lng: -73.2043 },
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
