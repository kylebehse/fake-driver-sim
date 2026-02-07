import WebSocket from 'ws';
import {
  type Waypoint,
  calculateBearing as legacyCalculateBearing,
  calculateDistance as legacyCalculateDistance,
  interpolatePosition as legacyInterpolatePosition,
  sfDeliveryRoute,
  generateSquareRoute
} from './routes.js';
import {
  decodePolyline,
  calculateBearing,
  haversineDistance,
  interpolatePosition
} from './polyline.js';
import type { Coordinates, RouteData } from './types.js';

export type { Waypoint };

export interface SimulatorConfig {
  wsUrl: string;
  driverId: string;
  tenantId: string;
  pingIntervalMs: number;
  mode: 'stationary' | 'linear' | 'delivery_route' | 'polyline';
  startLat: number;
  startLng: number;
  speedMps: number;
  // Optional: custom route waypoints (overrides mode-based route selection for legacy modes)
  customRoute?: Waypoint[];
  // Optional: Google-encoded polyline string for 'polyline' mode
  routePolyline?: string;
  // Optional: initial heading in degrees (0-360) when starting the route
  initialHeading?: number;
}

interface LocationState {
  lat: number;
  lng: number;
  heading: number;
  speed: number;
}

export class DriverSimulator {
  private config: SimulatorConfig;
  private ws: WebSocket | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private moveInterval: NodeJS.Timeout | null = null;
  private connected = false;
  private authenticated = false;

  // Movement state
  private currentLocation: LocationState;
  private route: Waypoint[] = [];
  private currentWaypointIndex = 0;
  private segmentProgress = 0; // 0-1 progress between waypoints
  private isPaused = false;

  // Polyline mode state
  private polylinePoints: Coordinates[] = [];
  private currentPointIndex = 0;

  constructor(config: SimulatorConfig) {
    this.config = config;
    this.currentLocation = {
      lat: config.startLat,
      lng: config.startLng,
      heading: config.initialHeading ?? 0,
      speed: 0
    };

    // Initialize route based on mode
    this.initializeRoute();
  }

  /**
   * Factory method to create a simulator from API route data.
   * Automatically extracts the polyline and initial heading from the route.
   *
   * @param route - RouteData object from the API
   * @param wsUrl - WebSocket server URL
   * @param tenantId - Tenant ID for authentication
   * @param config - Optional partial config to override defaults
   * @returns Configured DriverSimulator instance
   */
  static fromRouteData(
    route: RouteData,
    wsUrl: string,
    tenantId: string,
    config?: Partial<SimulatorConfig>
  ): DriverSimulator {
    // Decode polyline to get starting position
    const decodedPoints = decodePolyline(route.routePolyline);
    const startPoint = decodedPoints[0] ?? { lat: 0, lng: 0 };

    return new DriverSimulator({
      wsUrl,
      driverId: route.driverId ?? `driver-${route.id}`,
      tenantId,
      pingIntervalMs: config?.pingIntervalMs ?? 5000,
      mode: 'polyline',
      startLat: startPoint.lat,
      startLng: startPoint.lng,
      speedMps: config?.speedMps ?? 13.4, // ~30 mph default
      routePolyline: route.routePolyline,
      initialHeading: route.initialHeading,
      ...config
    });
  }

  private initializeRoute(): void {
    // Handle polyline mode separately
    if (this.config.mode === 'polyline') {
      if (!this.config.routePolyline) {
        console.warn('[Simulator] Polyline mode requires routePolyline config. Falling back to stationary.');
        this.polylinePoints = [{ lat: this.config.startLat, lng: this.config.startLng }];
        return;
      }

      // Decode the polyline into coordinate points
      this.polylinePoints = decodePolyline(this.config.routePolyline);

      if (this.polylinePoints.length === 0) {
        console.warn('[Simulator] Decoded polyline is empty. Falling back to stationary.');
        this.polylinePoints = [{ lat: this.config.startLat, lng: this.config.startLng }];
        return;
      }

      // Update starting position to match polyline start
      this.currentLocation.lat = this.polylinePoints[0].lat;
      this.currentLocation.lng = this.polylinePoints[0].lng;
      this.currentPointIndex = 0;
      this.segmentProgress = 0;

      console.log(`[Simulator] Initialized polyline mode with ${this.polylinePoints.length} points`);
      return;
    }

    // Legacy mode: If a custom route is provided, use it
    if (this.config.customRoute && this.config.customRoute.length > 0) {
      this.route = this.config.customRoute;
      // Update starting position to match route
      this.currentLocation.lat = this.route[0].lat;
      this.currentLocation.lng = this.route[0].lng;
      return;
    }

    switch (this.config.mode) {
      case 'stationary':
        // No route needed - stay in place
        this.route = [{ lat: this.config.startLat, lng: this.config.startLng }];
        break;
      case 'linear':
        // Generate a simple square route
        this.route = generateSquareRoute(this.config.startLat, this.config.startLng);
        break;
      case 'delivery_route':
        // Use the SF delivery route
        this.route = sfDeliveryRoute;
        // Update starting position to match route
        this.currentLocation.lat = this.route[0].lat;
        this.currentLocation.lng = this.route[0].lng;
        break;
    }
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `${this.config.wsUrl}/ws/driver/${this.config.driverId}`;
      console.log(`[Simulator] Connecting to ${url}...`);

      this.ws = new WebSocket(url);

      this.ws.on('open', () => {
        console.log('[Simulator] Connected, sending auth...');
        this.connected = true;
        this.sendAuth();
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);

          if (message.type === 'connection_ack') {
            this.authenticated = true;
            console.log('[Simulator] Authenticated successfully');
            this.startSimulation();
            resolve();
          }
        } catch (e) {
          console.error('[Simulator] Failed to parse message:', e);
        }
      });

      this.ws.on('close', (code, reason) => {
        console.log(`[Simulator] Disconnected: ${code} - ${reason}`);
        this.connected = false;
        this.authenticated = false;
        this.stopSimulation();
      });

      this.ws.on('error', (error) => {
        console.error('[Simulator] WebSocket error:', error);
        reject(error);
      });

      // Timeout if we don't authenticate in time
      setTimeout(() => {
        if (!this.authenticated) {
          reject(new Error('Authentication timeout'));
          this.disconnect();
        }
      }, 15000);
    });
  }

  private sendAuth(): void {
    // Create a fake JWT-like token for dev mode
    // The WebSocket server in dev mode parses the payload directly
    const payload = {
      sub: this.config.driverId,
      driverId: this.config.driverId,
      tenantId: this.config.tenantId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600
    };

    const fakeToken = [
      Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
      Buffer.from(JSON.stringify(payload)).toString('base64url'),
      'fake_signature_for_dev'
    ].join('.');

    this.send({
      type: 'auth',
      payload: {
        token: fakeToken,
        driverId: this.config.driverId,
        platform: 'simulator',
        appVersion: '1.0.0',
        deviceId: 'fake-driver-sim'
      }
    });
  }

  private handleMessage(message: { type: string; payload?: unknown }): void {
    switch (message.type) {
      case 'connection_ack':
        console.log('[Simulator] Connection acknowledged:', message.payload);
        break;
      case 'heartbeat':
        // Respond to heartbeat
        this.send({ type: 'pong' });
        break;
      case 'location_ack':
        // Location was received
        break;
      case 'error':
        console.error('[Simulator] Server error:', message.payload);
        break;
      default:
        console.log(`[Simulator] Received: ${message.type}`);
    }
  }

  private send(message: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private startSimulation(): void {
    console.log(`[Simulator] Starting simulation in '${this.config.mode}' mode`);
    console.log(`[Simulator] Initial position: ${this.currentLocation.lat.toFixed(6)}, ${this.currentLocation.lng.toFixed(6)}`);

    // Send initial location immediately
    this.sendLocationPing();

    // Start periodic location pings
    this.pingInterval = setInterval(() => {
      this.sendLocationPing();
    }, this.config.pingIntervalMs);

    // Start movement simulation (faster than pings for smooth movement)
    if (this.config.mode !== 'stationary') {
      const moveIntervalMs = 1000; // Update position every second
      this.moveInterval = setInterval(() => {
        this.updatePosition(moveIntervalMs / 1000);
      }, moveIntervalMs);
    }
  }

  private stopSimulation(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.moveInterval) {
      clearInterval(this.moveInterval);
      this.moveInterval = null;
    }
  }

  private updatePosition(deltaSeconds: number): void {
    // Route to the appropriate update method based on mode
    if (this.config.mode === 'polyline') {
      this.updatePositionPolyline(deltaSeconds);
    } else {
      this.updatePositionLegacy(deltaSeconds);
    }
  }

  /**
   * Updates position along a decoded polyline (road-following mode).
   * Navigates through polyline points without pause support (stops are handled separately).
   */
  private updatePositionPolyline(deltaSeconds: number): void {
    if (this.polylinePoints.length < 2) {
      this.currentLocation.speed = 0;
      return;
    }

    const currentPoint = this.polylinePoints[this.currentPointIndex];
    const nextIndex = this.currentPointIndex + 1;

    // Check if we've reached the end of the polyline
    if (nextIndex >= this.polylinePoints.length) {
      // Loop back to the start
      console.log('[Simulator] Polyline route completed, starting again');
      this.currentPointIndex = 0;
      this.segmentProgress = 0;
      return;
    }

    const nextPoint = this.polylinePoints[nextIndex];

    // Calculate segment distance using polyline.ts haversineDistance
    const segmentDistance = haversineDistance(currentPoint, nextPoint);

    const distanceTraveled = this.config.speedMps * deltaSeconds;
    const progressIncrement = segmentDistance > 0 ? distanceTraveled / segmentDistance : 1;

    this.segmentProgress += progressIncrement;

    // Check if we've reached the next point
    while (this.segmentProgress >= 1 && this.currentPointIndex + 1 < this.polylinePoints.length) {
      // Move to next segment
      this.currentPointIndex++;
      this.segmentProgress -= 1;

      // Recalculate for the new segment
      if (this.currentPointIndex + 1 < this.polylinePoints.length) {
        const newCurrent = this.polylinePoints[this.currentPointIndex];
        const newNext = this.polylinePoints[this.currentPointIndex + 1];
        const newSegmentDistance = haversineDistance(newCurrent, newNext);

        if (newSegmentDistance > 0) {
          // Convert remaining progress to new segment
          const remainingDistance = this.segmentProgress * segmentDistance;
          this.segmentProgress = remainingDistance / newSegmentDistance;
        }
      }
    }

    // Check if we've reached the end
    if (this.currentPointIndex + 1 >= this.polylinePoints.length) {
      console.log('[Simulator] Polyline route completed, starting again');
      this.currentPointIndex = 0;
      this.segmentProgress = 0;
      return;
    }

    // Interpolate current position using polyline.ts functions
    const fromPoint = this.polylinePoints[this.currentPointIndex];
    const toPoint = this.polylinePoints[this.currentPointIndex + 1];

    const pos = interpolatePosition(fromPoint, toPoint, Math.min(this.segmentProgress, 1));

    // Calculate heading toward next point
    const heading = calculateBearing(
      { lat: this.currentLocation.lat, lng: this.currentLocation.lng },
      toPoint
    );

    this.currentLocation = {
      lat: pos.lat,
      lng: pos.lng,
      heading,
      speed: this.config.speedMps
    };
  }

  /**
   * Updates position along legacy waypoint-based routes.
   * Supports pause at waypoints for delivery stops.
   */
  private updatePositionLegacy(deltaSeconds: number): void {
    if (this.isPaused || this.route.length < 2) {
      this.currentLocation.speed = 0;
      return;
    }

    const currentWaypoint = this.route[this.currentWaypointIndex];
    const nextIndex = (this.currentWaypointIndex + 1) % this.route.length;
    const nextWaypoint = this.route[nextIndex];

    // Calculate segment distance and progress increment using legacy functions
    const segmentDistance = legacyCalculateDistance(
      currentWaypoint.lat, currentWaypoint.lng,
      nextWaypoint.lat, nextWaypoint.lng
    );

    const distanceTraveled = this.config.speedMps * deltaSeconds;
    const progressIncrement = segmentDistance > 0 ? distanceTraveled / segmentDistance : 1;

    this.segmentProgress += progressIncrement;

    // Check if we've reached the next waypoint
    if (this.segmentProgress >= 1) {
      this.currentWaypointIndex = nextIndex;
      this.segmentProgress = 0;

      // Check for pause at waypoint
      if (nextWaypoint.pauseMs && nextWaypoint.pauseMs > 0) {
        console.log(`[Simulator] Pausing at waypoint ${nextIndex} for ${nextWaypoint.pauseMs}ms (delivery stop)`);
        this.isPaused = true;
        this.currentLocation.speed = 0;
        setTimeout(() => {
          this.isPaused = false;
          console.log('[Simulator] Resuming movement');
        }, nextWaypoint.pauseMs);
      }

      // Check if we've completed the route
      if (nextIndex === 0) {
        console.log('[Simulator] Route completed, starting again');
      }
    }

    // Interpolate current position using legacy functions
    const pos = legacyInterpolatePosition(
      currentWaypoint.lat, currentWaypoint.lng,
      nextWaypoint.lat, nextWaypoint.lng,
      Math.min(this.segmentProgress, 1)
    );

    // Calculate heading toward next waypoint using legacy function
    const heading = legacyCalculateBearing(
      this.currentLocation.lat, this.currentLocation.lng,
      nextWaypoint.lat, nextWaypoint.lng
    );

    this.currentLocation = {
      lat: pos.lat,
      lng: pos.lng,
      heading,
      speed: this.isPaused ? 0 : this.config.speedMps
    };
  }

  private sendLocationPing(): void {
    // Add some realistic noise to the location
    const noise = 0.00001; // ~1 meter
    const lat = this.currentLocation.lat + (Math.random() - 0.5) * noise;
    const lng = this.currentLocation.lng + (Math.random() - 0.5) * noise;

    const ping = {
      type: 'location_ping',
      payload: {
        latitude: lat,
        longitude: lng,
        accuracy: 5 + Math.random() * 10, // 5-15 meters
        heading: this.currentLocation.heading,
        speed: this.currentLocation.speed,
        batteryLevel: 75 + Math.floor(Math.random() * 20) // 75-95%
      }
    };

    this.send(ping);
    console.log(`[Simulator] Sent ping: ${lat.toFixed(6)}, ${lng.toFixed(6)} | heading: ${this.currentLocation.heading.toFixed(0)}° | speed: ${(this.currentLocation.speed * 2.237).toFixed(1)} mph`);
  }

  disconnect(): void {
    this.stopSimulation();
    if (this.ws) {
      this.ws.close(1000, 'Simulator stopped');
      this.ws = null;
    }
  }

  getStatus(): object {
    const baseStatus = {
      connected: this.connected,
      authenticated: this.authenticated,
      mode: this.config.mode,
      location: this.currentLocation,
      segmentProgress: this.segmentProgress,
      isPaused: this.isPaused
    };

    if (this.config.mode === 'polyline') {
      return {
        ...baseStatus,
        pointIndex: this.currentPointIndex,
        totalPoints: this.polylinePoints.length
      };
    }

    return {
      ...baseStatus,
      waypointIndex: this.currentWaypointIndex,
      totalWaypoints: this.route.length
    };
  }
}
