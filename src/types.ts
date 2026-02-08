/**
 * Types for fake-driver-sim API integration
 *
 * These types match the route data structure returned by the SvelteKit API
 * and are used for road-following driver simulation.
 *
 * @see /openapi/schemas/route.yaml - Route schema definition
 * @see /openapi/schemas/stop.yaml - Stop schema definition
 */

// ============================================================================
// Core Coordinate Types
// ============================================================================

/**
 * Geographic coordinate pair representing a position on Earth.
 * Used throughout the simulator for positions and waypoints.
 */
export interface Coordinates {
  /** Latitude in decimal degrees (-90 to 90) */
  lat: number;
  /** Longitude in decimal degrees (-180 to 180) */
  lng: number;
}

/**
 * A point decoded from a Google-encoded polyline.
 * Extends Coordinates with an index to track position in the decoded array.
 */
export interface DecodedPoint extends Coordinates {
  /** Index position in the decoded polyline array (0-based) */
  index: number;
}

// ============================================================================
// Route Leg Types
// ============================================================================

/**
 * A segment of the route between two consecutive stops.
 * Each leg contains its own polyline for navigation between those stops.
 */
export interface RouteLeg {
  /** Index of the starting stop for this leg (0-based) */
  fromStopIndex: number;
  /** Index of the destination stop for this leg (0-based) */
  toStopIndex: number;
  /** Distance of this leg in meters */
  distanceMeters: number;
  /** Estimated travel duration for this leg in seconds */
  durationSeconds: number;
  /** Google-encoded polyline string for this leg's path */
  polyline: string;
}

// ============================================================================
// Stop Types
// ============================================================================

/**
 * Valid types of stops on a delivery route.
 * - depot_start: Starting depot where driver picks up packages
 * - delivery: Customer delivery location
 * - pickup: Customer pickup location
 * - depot_end: Ending depot where driver returns
 */
export type StopType = 'depot_start' | 'delivery' | 'pickup' | 'depot_end';

/**
 * Valid statuses for a stop.
 * - pending: Stop not yet started
 * - en_route: Driver is heading to this stop
 * - arrived: Driver has arrived at stop location
 * - completed: Delivery/pickup completed with proof
 * - failed: Delivery/pickup failed with exception
 * - skipped: Stop was skipped by dispatcher
 */
export type StopStatus = 'pending' | 'en_route' | 'arrived' | 'completed' | 'failed' | 'skipped';

/**
 * Customer information associated with a stop.
 */
export interface StopCustomer {
  /** Customer display name */
  name: string;
  /** Customer phone number (E.164 format preferred) */
  phone: string;
  /** Customer email address (optional) */
  email?: string;
  /** Business name if this is a commercial address */
  businessName?: string;
}

/**
 * A delivery or pickup stop on the route.
 * Contains all information needed to navigate to and service the stop.
 */
export interface RouteStop {
  /** Unique stop identifier (UUID) */
  id?: string;
  /** Position in the route sequence (1-based for API, 0-based internally) */
  sequenceNumber: number;
  /** Type of stop (depot, delivery, pickup) */
  type: StopType;
  /** Full formatted address string */
  address: string;
  /** Stop latitude in decimal degrees */
  latitude: number;
  /** Stop longitude in decimal degrees */
  longitude: number;
  /**
   * Recommended heading when approaching this stop in degrees (0-360).
   * Null if no specific approach direction is required.
   * Used to orient the driver correctly for curb-side delivery.
   */
  approachHeading: number | null;
  /** Expected time to complete this stop in seconds */
  serviceTimeSeconds: number;
  /** Number of packages to deliver/pickup at this stop */
  packageCount: number;
  /** Customer information (optional, not present for depot stops) */
  customer?: StopCustomer;
  /** Current status of this stop */
  status?: StopStatus;
  /** Special delivery instructions */
  deliveryInstructions?: string;
  /** Estimated arrival time (ISO 8601) */
  estimatedArrival?: string;
  /** Actual arrival time (ISO 8601) */
  arrivedAt?: string;
  /** Actual departure time (ISO 8601) */
  departedAt?: string;
  /** Distance from previous stop in meters */
  distanceFromPrevious?: number;
  /** Estimated drive time from previous stop in seconds */
  durationFromPrevious?: number;
}

// ============================================================================
// Route Types
// ============================================================================

/**
 * Valid statuses for a route.
 * - draft: Route is being planned
 * - assigned: Route assigned to driver but not started
 * - in_progress: Driver is actively working the route
 * - completed: All stops completed or accounted for
 * - cancelled: Route was cancelled
 */
export type RouteStatus = 'draft' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';

/**
 * Route timing information.
 */
export interface RouteTiming {
  /** Scheduled start time (ISO 8601) */
  scheduledStartTime?: string;
  /** Scheduled end time (ISO 8601) */
  scheduledEndTime?: string;
  /** Actual start time (ISO 8601) */
  actualStartTime?: string;
  /** Actual end time (ISO 8601) */
  actualEndTime?: string;
  /** Estimated route duration in minutes */
  estimatedDuration?: number;
  /** Actual route duration in minutes (if completed) */
  actualDuration?: number;
  /** Minutes behind schedule (negative = ahead) */
  behindScheduleMinutes?: number;
}

/**
 * Route statistics.
 */
export interface RouteStats {
  /** Total number of stops */
  totalStops: number;
  /** Number of completed stops */
  completedStops: number;
  /** Number of failed stops (exceptions) */
  failedStops: number;
  /** Number of skipped stops */
  skippedStops: number;
  /** Stops not yet attempted */
  remainingStops: number;
  /** Total packages on route */
  totalPackages: number;
  /** Packages delivered */
  deliveredPackages: number;
  /** Route completion percentage (0-100) */
  completionPercentage: number;
}

/**
 * Starting/ending depot information for a route.
 */
export interface RouteDepot {
  /** Depot unique identifier (UUID) */
  id: string;
  /** Depot display name */
  name: string;
  /** Depot full address */
  address: string;
  /** Depot latitude */
  latitude: number;
  /** Depot longitude */
  longitude: number;
}

/**
 * Full route data as returned by the API.
 * Contains the complete polyline and all stops for navigation.
 */
export interface RouteData {
  /** Unique route identifier (UUID) */
  id: string;
  /** Route ID (may differ from id in some contexts) */
  routeId: string;
  /** Tenant this route belongs to (UUID) */
  tenantId?: string;
  /** Assigned driver ID (UUID) */
  driverId?: string;
  /** Route date (YYYY-MM-DD) */
  date?: string;
  /** Route display name */
  name?: string;
  /** Current route status */
  status: RouteStatus;
  /**
   * Initial heading in degrees (0-360) when starting the route.
   * Used to orient the driver at the beginning of navigation.
   */
  initialHeading: number;
  /**
   * Full route polyline (Google-encoded).
   * This is the complete path from depot through all stops.
   * Note: API field is 'routePolyline' - this maps to that.
   */
  routePolyline: string;
  /** Total route distance in meters */
  totalDistanceMeters: number;
  /** Total estimated route duration in seconds */
  totalDurationSeconds: number;
  /**
   * Route optimization score (0-100).
   * Higher scores indicate more efficient routing.
   */
  optimizationScore: number;
  /** Individual leg polylines between stops */
  legs: RouteLeg[];
  /** Ordered list of stops on this route */
  stops: RouteStop[];
  /** Starting/ending depot */
  depot?: RouteDepot;
  /** Route statistics */
  stats?: RouteStats;
  /** Route timing information */
  timing?: RouteTiming;
  /** Creation timestamp (ISO 8601) */
  createdAt?: string;
  /** Last update timestamp (ISO 8601) */
  updatedAt?: string;
}

// ============================================================================
// Driver Types
// ============================================================================

/**
 * Valid driver statuses.
 * - available: Driver is available for routes
 * - on_route: Driver is actively working a route
 * - break: Driver is on break
 * - offline: Driver is not available
 */
export type DriverStatus = 'available' | 'on_route' | 'break' | 'offline';

/**
 * Driver data as returned by the API.
 */
export interface DriverData {
  /** Unique driver identifier (UUID) */
  id: string;
  /** Driver's first name */
  givenName: string;
  /** Driver's last name */
  familyName: string;
  /** Tenant this driver belongs to (UUID) */
  tenantId: string;
  /** Current driver status */
  status: DriverStatus;
  /** Driver's currently assigned route (null if no active route) */
  route: RouteData | null;
  /** Driver's phone number */
  phone?: string;
  /** Driver's email address */
  email?: string;
  /** Driver's vehicle ID (UUID) */
  vehicleId?: string;
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Response metadata included with API responses.
 */
export interface ResponseMeta {
  /** Unique request identifier for tracing */
  requestId: string;
  /** Server timestamp (ISO 8601) */
  timestamp: string;
  /** API version */
  apiVersion?: string;
}

/**
 * Generic wrapper for API responses.
 * All API endpoints return this structure.
 *
 * @template T The type of data contained in the response
 */
export interface ApiResponse<T> {
  /** Indicates if the request was successful */
  success: boolean;
  /** Response data (present when success is true) */
  data?: T;
  /** Error message (present when success is false) */
  error?: string;
  /** Error details object (present when success is false) */
  errorDetails?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  /** Response metadata */
  meta?: ResponseMeta;
}

/**
 * Pagination metadata for list responses.
 */
export interface PaginationMeta {
  /** Cursor for the next page (null if no more pages) */
  cursor: string | null;
  /** Indicates if more pages are available */
  hasMore: boolean;
}

/**
 * Paginated list response wrapper.
 *
 * @template T The type of items in the list
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  /** Pagination information */
  pagination?: PaginationMeta;
}

// ============================================================================
// Simulation State Types
// ============================================================================

/**
 * Current location state for the simulation.
 * Tracks the simulated driver's position and movement.
 */
export interface LocationState {
  /** Current latitude in decimal degrees */
  lat: number;
  /** Current longitude in decimal degrees */
  lng: number;
  /** Current heading in degrees (0-360, 0 = North) */
  heading: number;
  /** Current speed in meters per second */
  speed: number;
}

/**
 * State for navigating along a decoded polyline.
 * Tracks progress through the polyline for road-following simulation.
 */
export interface PolylineNavigationState {
  /** Array of decoded polyline points */
  decodedPoints: Coordinates[];
  /** Index of the current point we're traveling from (0-based) */
  currentPointIndex: number;
  /**
   * Progress between current point and next point (0-1).
   * 0 = at current point, 1 = at next point.
   */
  segmentProgress: number;
  /** Total polyline distance in meters */
  totalDistance: number;
  /** Distance already traveled in meters */
  distanceTraveled: number;
}

/**
 * Extended navigation state including stop tracking.
 * Used when simulating a complete route with multiple stops.
 */
export interface RouteNavigationState extends PolylineNavigationState {
  /** Current route data */
  route: RouteData;
  /** Index of the current stop we're heading to (0-based) */
  currentStopIndex: number;
  /** Index of the current leg we're on (0-based) */
  currentLegIndex: number;
  /** Whether the driver is currently paused at a stop */
  isPaused: boolean;
  /** Timestamp when the pause started (for service time tracking) */
  pauseStartTime?: number;
}

// ============================================================================
// WebSocket Message Types
// ============================================================================

/**
 * Location ping message sent to the WebSocket server.
 * Sent periodically while the driver is active.
 * Field names use snake_case to match the wire format.
 */
export interface LocationPingPayload {
  /** Current latitude */
  latitude: number;
  /** Current longitude */
  longitude: number;
  /** GPS accuracy in meters */
  accuracy: number;
  /** Current heading in degrees (0-360) */
  heading: number;
  /** Current speed in meters per second */
  speed: number;
  /** Device battery level (0-100) */
  battery_level: number;
  /** Altitude in meters (optional) */
  altitude?: number;
  /** Client-side timestamp (ISO 8601) */
  timestamp?: string;
}

/**
 * WebSocket message structure for location pings.
 */
export interface LocationPingMessage {
  type: 'location_ping';
  payload: LocationPingPayload;
}

/**
 * Authentication message sent when connecting to WebSocket.
 * Field names use snake_case to match the wire format.
 */
export interface AuthMessage {
  type: 'auth';
  payload: {
    /** JWT token for authentication */
    token: string;
    /** Driver ID */
    driver_id: string;
    /** Platform identifier */
    platform: string;
    /** Application version */
    app_version: string;
    /** Device identifier */
    device_id: string;
  };
}

/**
 * Union type for all outgoing WebSocket messages from the simulator.
 */
export type SimulatorOutgoingMessage = LocationPingMessage | AuthMessage | { type: 'pong' };
