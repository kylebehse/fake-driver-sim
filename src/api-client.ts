/**
 * API Client for Fake Driver Simulator
 *
 * Fetches route and driver data from the SvelteKit API backend.
 * Used by the driver simulator to get real route data including
 * polylines for road-following simulation.
 *
 * @module api-client
 * @see /openapi/api-spec.yaml - API specification
 */

import type {
  RouteData,
  RouteStop,
  DriverData,
  ApiResponse,
  PaginatedResponse,
} from './types.js';

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration options for the API client.
 */
export interface ApiClientConfig {
  /** Base URL of the SvelteKit API (e.g., 'http://localhost:5173') */
  baseUrl: string;
  /** Tenant ID for multi-tenant API requests */
  tenantId: string;
  /** Optional API key for authentication */
  apiKey?: string;
  /** Optional OAuth2 access token for authentication */
  accessToken?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Custom error class for API-related errors.
 * Provides additional context about the failed request.
 */
export class ApiError extends Error {
  /** HTTP status code of the failed request */
  public readonly statusCode: number;
  /** Error code from the API response (if available) */
  public readonly errorCode?: string;
  /** URL of the failed request */
  public readonly url: string;

  constructor(
    message: string,
    statusCode: number,
    url: string,
    errorCode?: string
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.url = url;
    this.errorCode = errorCode;
  }
}

// ============================================================================
// API Client Implementation
// ============================================================================

/**
 * API client for fetching route and driver data from the SvelteKit API.
 *
 * @example
 * ```typescript
 * const client = new ApiClient({
 *   baseUrl: 'http://localhost:5173',
 *   tenantId: 'tenant-uuid-here',
 * });
 *
 * // Fetch all active routes
 * const routes = await client.getActiveRoutes();
 *
 * // Fetch a specific driver's route
 * const driverRoute = await client.getDriverRoute('driver-uuid');
 * ```
 */
export class ApiClient {
  private readonly config: ApiClientConfig;
  private readonly defaultTimeout: number = 30000;

  /**
   * Creates a new API client instance.
   *
   * @param config - Configuration options for the client
   */
  constructor(config: ApiClientConfig) {
    this.config = config;

    // Validate required configuration
    if (!config.baseUrl) {
      throw new Error('ApiClient: baseUrl is required');
    }
    if (!config.tenantId) {
      throw new Error('ApiClient: tenantId is required');
    }

    // Remove trailing slash from baseUrl if present
    if (this.config.baseUrl.endsWith('/')) {
      this.config.baseUrl = this.config.baseUrl.slice(0, -1);
    }
  }

  // --------------------------------------------------------------------------
  // Private Helper Methods
  // --------------------------------------------------------------------------

  /**
   * Builds the full URL for an API endpoint.
   *
   * @param path - API path (without tenant prefix)
   * @param queryParams - Optional query parameters
   * @returns Full URL string
   */
  private buildUrl(
    path: string,
    queryParams?: Record<string, string | number | boolean | undefined>
  ): string {
    const baseEndpoint = `${this.config.baseUrl}/api/tenants/${this.config.tenantId}`;
    let url = `${baseEndpoint}${path}`;

    if (queryParams) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(queryParams)) {
        if (value !== undefined) {
          params.append(key, String(value));
        }
      }
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    return url;
  }

  /**
   * Builds request headers including authentication if configured.
   *
   * @returns Headers object
   */
  private buildHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (this.config.apiKey) {
      headers['X-API-Key'] = this.config.apiKey;
    }

    if (this.config.accessToken) {
      headers['Authorization'] = `Bearer ${this.config.accessToken}`;
    }

    return headers;
  }

  /**
   * Makes an HTTP request to the API with timeout and error handling.
   *
   * @param url - Full URL to request
   * @param options - Fetch options
   * @returns Parsed JSON response
   * @throws ApiError if the request fails
   */
  private async request<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    const timeout = this.config.timeout ?? this.defaultTimeout;

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      console.log(`[ApiClient] Fetching: ${url}`);

      const response = await fetch(url, {
        ...options,
        headers: this.buildHeaders(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Parse response body
      let body: unknown;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        body = await response.json();
      } else {
        body = await response.text();
      }

      // Handle non-success status codes
      if (!response.ok) {
        const errorMessage =
          typeof body === 'object' && body !== null && 'error' in body
            ? String((body as Record<string, unknown>).error)
            : `HTTP ${response.status}: ${response.statusText}`;

        const errorCode =
          typeof body === 'object' &&
          body !== null &&
          'errorDetails' in body &&
          typeof (body as Record<string, unknown>).errorDetails === 'object' &&
          (body as Record<string, unknown>).errorDetails !== null
            ? String(
                (
                  (body as Record<string, unknown>)
                    .errorDetails as Record<string, unknown>
                ).code
              )
            : undefined;

        console.error(
          `[ApiClient] Request failed: ${response.status} ${response.statusText}`,
          body
        );

        throw new ApiError(errorMessage, response.status, url, errorCode);
      }

      return body as T;
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle abort (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(`[ApiClient] Request timed out after ${timeout}ms: ${url}`);
        throw new ApiError(`Request timed out after ${timeout}ms`, 408, url);
      }

      // Re-throw ApiError as-is
      if (error instanceof ApiError) {
        throw error;
      }

      // Handle other errors (network errors, etc.)
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[ApiClient] Request failed: ${message}`, error);
      throw new ApiError(`Request failed: ${message}`, 0, url);
    }
  }

  // --------------------------------------------------------------------------
  // Public API Methods
  // --------------------------------------------------------------------------

  /**
   * Fetches all active routes for the tenant.
   *
   * Active routes are those with status 'assigned' or 'in_progress'.
   * Returns routes with full polyline data for simulation.
   *
   * @returns Array of active route data with polylines
   * @throws ApiError if the request fails
   *
   * @example
   * ```typescript
   * const routes = await client.getActiveRoutes();
   * console.log(`Found ${routes.length} active routes`);
   * for (const route of routes) {
   *   console.log(`Route ${route.id}: ${route.stops.length} stops`);
   * }
   * ```
   */
  async getActiveRoutes(): Promise<RouteData[]> {
    const url = this.buildUrl('/routes', { status: 'in_progress' });

    try {
      // API returns { data: RouteData[], meta: { next_cursor, has_more } }
      const response = await this.request<{ data: RouteData[]; meta: { next_cursor: string | null; has_more: boolean } }>(url);

      const routes = response.data ?? [];
      console.log(
        `[ApiClient] getActiveRoutes: Found ${routes.length} active routes`
      );

      return routes;
    } catch (error) {
      console.error('[ApiClient] getActiveRoutes failed:', error);
      throw error;
    }
  }

  /**
   * Fetches routes with a specific status.
   *
   * @param status - Route status to filter by
   * @returns Array of route data matching the status
   * @throws ApiError if the request fails
   *
   * @example
   * ```typescript
   * // Get all assigned but not yet started routes
   * const assignedRoutes = await client.getRoutesByStatus('assigned');
   * ```
   */
  async getRoutesByStatus(
    status: 'draft' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
  ): Promise<RouteData[]> {
    const url = this.buildUrl('/routes', { status });

    try {
      // API returns { data: RouteData[], meta: { next_cursor, has_more } }
      const response = await this.request<{ data: RouteData[]; meta: { next_cursor: string | null; has_more: boolean } }>(url);

      const routes = response.data ?? [];
      console.log(
        `[ApiClient] getRoutesByStatus(${status}): Found ${routes.length} routes`
      );

      return routes;
    } catch (error) {
      console.error(`[ApiClient] getRoutesByStatus(${status}) failed:`, error);
      throw error;
    }
  }

  /**
   * Fetches a specific driver's currently active route.
   *
   * Returns the route with full details including polyline and stops.
   * Returns null if the driver has no active route assigned.
   *
   * @param driverId - UUID of the driver
   * @returns Route data or null if no active route
   * @throws ApiError if the request fails (other than 404)
   *
   * @example
   * ```typescript
   * const route = await client.getDriverRoute('driver-uuid');
   * if (route) {
   *   console.log(`Driver has route with ${route.stops.length} stops`);
   * } else {
   *   console.log('Driver has no active route');
   * }
   * ```
   */
  async getDriverRoute(driverId: string): Promise<RouteData | null> {
    const url = this.buildUrl(`/drivers/${driverId}/routes`);

    try {
      // The API returns a DriverRoutesResponse with todayRoute, upcomingRoutes, etc.
      const response = await this.request<
        ApiResponse<{
          driverId: string;
          todayRoute: RouteData | null;
          upcomingRoutes: RouteData[];
          recentRoutes: RouteData[];
        }>
      >(url);

      if (!response.success) {
        console.error(
          `[ApiClient] getDriverRoute(${driverId}): API returned success=false`
        );
        return null;
      }

      const todayRoute = response.data?.todayRoute ?? null;
      console.log(
        `[ApiClient] getDriverRoute(${driverId}): ${
          todayRoute ? `Found route ${todayRoute.id}` : 'No active route'
        }`
      );

      return todayRoute;
    } catch (error) {
      // Return null for 404 (driver not found or no route)
      if (error instanceof ApiError && error.statusCode === 404) {
        console.log(
          `[ApiClient] getDriverRoute(${driverId}): Driver or route not found`
        );
        return null;
      }

      console.error(`[ApiClient] getDriverRoute(${driverId}) failed:`, error);
      throw error;
    }
  }

  /**
   * Fetches detailed information for a specific route by ID.
   *
   * Returns the full route with all stops and polyline data.
   *
   * @param routeId - UUID of the route
   * @returns Route data or null if not found
   * @throws ApiError if the request fails (other than 404)
   *
   * @example
   * ```typescript
   * const route = await client.getRouteById('route-uuid');
   * if (route) {
   *   console.log(`Route polyline: ${route.polyline.substring(0, 50)}...`);
   * }
   * ```
   */
  async getRouteById(routeId: string): Promise<RouteData | null> {
    const url = this.buildUrl(`/routes/${routeId}`, { include_stops: true });

    try {
      const response = await this.request<ApiResponse<RouteData>>(url);

      if (!response.success) {
        console.error(
          `[ApiClient] getRouteById(${routeId}): API returned success=false`
        );
        return null;
      }

      const route = response.data ?? null;
      console.log(
        `[ApiClient] getRouteById(${routeId}): ${
          route ? `Found route with ${route.stops.length} stops` : 'Not found'
        }`
      );

      return route;
    } catch (error) {
      // Return null for 404 (route not found)
      if (error instanceof ApiError && error.statusCode === 404) {
        console.log(`[ApiClient] getRouteById(${routeId}): Route not found`);
        return null;
      }

      console.error(`[ApiClient] getRouteById(${routeId}) failed:`, error);
      throw error;
    }
  }

  /**
   * Fetches all drivers with their currently assigned routes.
   *
   * This is useful for running simulations for multiple drivers.
   * Only returns drivers with active routes (status 'in_progress' or 'assigned').
   *
   * @returns Array of drivers with embedded route data
   * @throws ApiError if the request fails
   *
   * @example
   * ```typescript
   * const drivers = await client.getDriversWithRoutes();
   * const activeDrivers = drivers.filter(d => d.route !== null);
   * console.log(`${activeDrivers.length} drivers have active routes`);
   * ```
   */
  async getDriversWithRoutes(): Promise<DriverData[]> {
    // First, get all active routes
    const routes = await this.getActiveRoutes();

    // If no active routes, return empty array
    if (routes.length === 0) {
      console.log('[ApiClient] getDriversWithRoutes: No active routes found');
      return [];
    }

    // Build driver data from routes
    // Note: This is a simplified implementation. A more complete version
    // would fetch full driver details from a drivers endpoint.
    const driversMap = new Map<string, DriverData>();

    for (const route of routes) {
      if (route.driverId && !driversMap.has(route.driverId)) {
        // Create a minimal driver object from route data
        // In production, you might want to fetch full driver details
        const driver: DriverData = {
          id: route.driverId,
          givenName: 'Driver',
          familyName: route.driverId.substring(0, 8),
          tenantId: route.tenantId ?? this.config.tenantId,
          status: 'on_route',
          route: route,
        };
        driversMap.set(route.driverId, driver);
      } else if (route.driverId) {
        // Update existing driver's route if they have multiple
        // (shouldn't happen normally, but handle it gracefully)
        const existingDriver = driversMap.get(route.driverId);
        if (existingDriver && existingDriver.route === null) {
          existingDriver.route = route;
        }
      }
    }

    const drivers = Array.from(driversMap.values());
    console.log(
      `[ApiClient] getDriversWithRoutes: Found ${drivers.length} drivers with routes`
    );

    return drivers;
  }

  /**
   * Fetches a route with its stops by route ID.
   * The route detail endpoint already returns stops inline.
   * Used to get stop coordinates for proximity detection.
   */
  async getRouteWithStops(routeId: string): Promise<RouteData | null> {
    const url = this.buildUrl(`/routes/${routeId}`);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await this.request<any>(url);
      // API wraps response in { data: {...} } - extract the route data
      const raw = response?.data ?? response;
      if (!raw || !raw.id) return null;

      // Map the inline stops to RouteStop format if they exist
      // API guarantees snake_case responses via global hook
      const stops: RouteStop[] = [];
      if (raw.stops && Array.isArray(raw.stops)) {
        for (const s of raw.stops) {
          stops.push({
            id: s.id,
            sequenceNumber: s.sequence_number,
            type: s.sequence_number === 1 ? 'depot_start' : 'delivery',
            address: s.address || '',
            latitude: s.latitude ?? 0,
            longitude: s.longitude ?? 0,
            approachHeading: null,
            serviceTimeSeconds: 120,
            packageCount: s.package_count ?? 1,
            status: s.status || 'pending',
            customer: s.customer_name ? { name: s.customer_name, phone: s.customer_phone || '' } : undefined,
          });
        }
      }

      const routeData: RouteData = {
        ...raw,
        routePolyline: raw.route_polyline ?? '',
        routeId: raw.route_id ?? raw.id,
        initialHeading: raw.initial_heading ?? 0,
        totalDistanceMeters: raw.total_distance_meters ?? 0,
        totalDurationSeconds: raw.total_duration_seconds ?? 0,
        optimizationScore: raw.optimization_score ?? 0,
        legs: raw.legs ?? [],
        stops,
      };

      console.log(`[ApiClient] getRouteWithStops(${routeId}): ${stops.length} stops`);
      return routeData;
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 404) return null;
      throw error;
    }
  }

  /**
   * PATCH a stop to update its status (e.g., to 'arrived').
   */
  async patchStop(routeId: string, stopId: string, data: Record<string, unknown>): Promise<boolean> {
    const url = this.buildUrl(`/routes/${routeId}/stops/${stopId}`);

    try {
      await this.request<ApiResponse<unknown>>(url, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      console.log(`[ApiClient] PATCH stop ${stopId} success`);
      return true;
    } catch (error) {
      console.error(`[ApiClient] PATCH stop ${stopId} failed:`, error);
      return false;
    }
  }

  /**
   * Submit a proof of delivery for a stop.
   */
  async submitPod(stopId: string, data: {
    recipient_name: string;
    gps_latitude: number;
    gps_longitude: number;
    notes?: string;
  }): Promise<boolean> {
    const url = this.buildUrl(`/stops/${stopId}/pod`);

    try {
      await this.request<ApiResponse<unknown>>(url, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      console.log(`[ApiClient] POST POD for stop ${stopId} success`);
      return true;
    } catch (error) {
      console.error(`[ApiClient] POST POD for stop ${stopId} failed:`, error);
      return false;
    }
  }

  /**
   * Health check to verify API connectivity.
   *
   * Makes a lightweight request to verify the API is reachable
   * and the tenant is valid.
   *
   * @returns True if API is healthy, false otherwise
   *
   * @example
   * ```typescript
   * const isHealthy = await client.healthCheck();
   * if (!isHealthy) {
   *   console.error('API is not reachable');
   * }
   * ```
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Use the routes endpoint with limit=1 as a lightweight health check
      const url = this.buildUrl('/routes', { limit: 1 });
      await this.request<{ data: RouteData[]; meta: { next_cursor: string | null; has_more: boolean } }>(url);
      console.log('[ApiClient] Health check passed');
      return true;
    } catch (error) {
      console.error('[ApiClient] Health check failed:', error);
      return false;
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Creates a new API client instance with the given configuration.
 *
 * @param config - Configuration options
 * @returns Configured API client instance
 *
 * @example
 * ```typescript
 * const client = createApiClient({
 *   baseUrl: process.env.API_BASE_URL ?? 'http://localhost:5173',
 *   tenantId: process.env.TENANT_ID ?? 'default-tenant',
 * });
 * ```
 */
export function createApiClient(config: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}
