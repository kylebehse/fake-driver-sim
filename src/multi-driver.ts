#!/usr/bin/env node
/**
 * Multi-Driver Simulator
 *
 * Simulates multiple drivers sending location pings simultaneously.
 * Fetches active routes from the SvelteKit API and simulates each driver
 * following their assigned route using road-following polylines.
 *
 * For development and testing only - never deployed to production.
 *
 * Usage:
 *   npm run dev:multi          # Simulate all active routes
 *   TENANT_ID=xxx npm run dev:multi  # Simulate routes for specific tenant
 */

import { config } from 'dotenv';
import { ApiClient, createApiClient } from './api-client.js';
import { DriverSimulator } from './simulator.js';
import type { RouteData } from './types.js';

// Load .env file
config();

// ============================================================================
// Configuration
// ============================================================================

interface MultiDriverConfig {
  /** SvelteKit API base URL */
  apiUrl: string;
  /** Tenant ID to fetch routes for */
  tenantId: string;
  /** WebSocket server URL */
  wsUrl: string;
  /** Location ping interval in milliseconds */
  pingIntervalMs: number;
  /** Simulated driver speed in meters per second */
  speedMps: number;
}

/**
 * Loads configuration from environment variables with defaults.
 */
function loadConfig(): MultiDriverConfig {
  return {
    apiUrl: process.env.API_URL || 'http://localhost:5173',
    tenantId: process.env.TENANT_ID || 'tenant_test_002',
    wsUrl: process.env.WS_URL || 'ws://localhost:3001',
    pingIntervalMs: parseInt(process.env.PING_INTERVAL_MS || '3000', 10),
    speedMps: parseFloat(process.env.SPEED_MPS || '8'),
  };
}

// ============================================================================
// Main Function
// ============================================================================

async function main(): Promise<void> {
  const config = loadConfig();

  console.log('========================================');
  console.log('  Multi-Driver Fleet Simulator');
  console.log('========================================');
  console.log('');
  console.log('Configuration:');
  console.log(`  API URL:       ${config.apiUrl}`);
  console.log(`  Tenant ID:     ${config.tenantId}`);
  console.log(`  WebSocket URL: ${config.wsUrl}`);
  console.log(`  Ping interval: ${config.pingIntervalMs}ms`);
  console.log(`  Speed:         ${(config.speedMps * 2.237).toFixed(1)} mph`);
  console.log('');

  // Create API client
  let apiClient: ApiClient;
  try {
    apiClient = createApiClient({
      baseUrl: config.apiUrl,
      tenantId: config.tenantId,
    });
  } catch (error) {
    console.error('[Multi-Sim] Failed to create API client:', error);
    process.exit(1);
  }

  // Verify API connectivity
  console.log('[Multi-Sim] Checking API connectivity...');
  const isHealthy = await apiClient.healthCheck();
  if (!isHealthy) {
    console.error('[Multi-Sim] API is not reachable. Please ensure the SvelteKit server is running.');
    console.error(`[Multi-Sim] Attempted URL: ${config.apiUrl}/api/tenants/${config.tenantId}/routes`);
    process.exit(1);
  }
  console.log('[Multi-Sim] API connection verified.');
  console.log('');

  // Fetch active routes from API
  console.log('[Multi-Sim] Fetching active routes from API...');
  let routes: RouteData[];
  try {
    routes = await apiClient.getActiveRoutes();
  } catch (error) {
    console.error('[Multi-Sim] Failed to fetch routes from API:', error);
    process.exit(1);
  }

  // Check if we have routes to simulate
  if (routes.length === 0) {
    console.log('[Multi-Sim] No active routes found for tenant:', config.tenantId);
    console.log('[Multi-Sim] To simulate drivers, create routes with status "in_progress" in the API.');
    console.log('[Multi-Sim] Exiting...');
    process.exit(0);
  }

  console.log(`[Multi-Sim] Found ${routes.length} active route(s)`);
  console.log('');
  console.log('Routes to simulate:');
  routes.forEach((route, i) => {
    console.log(`  ${i + 1}. Route: ${route.name || route.id}`);
    console.log(`     Driver ID: ${route.driverId || 'unassigned'}`);
    console.log(`     Stops:     ${route.stops?.length || 0}`);
    console.log(`     Status:    ${route.status}`);
  });
  console.log('');
  console.log('Starting simulators...');
  console.log('');

  const simulators: DriverSimulator[] = [];
  let connectedCount = 0;

  for (const route of routes) {
    // Skip routes without drivers assigned
    if (!route.driverId) {
      console.warn(`[Multi-Sim] Skipping route ${route.id} - no driver assigned`);
      continue;
    }

    // Skip routes without polylines
    if (!route.routePolyline) {
      console.warn(`[Multi-Sim] Skipping route ${route.id} - no polyline data`);
      continue;
    }

    try {
      // Create simulator from route data using the factory method
      const simulator = DriverSimulator.fromRouteData(
        route,
        config.wsUrl,
        config.tenantId,
        {
          pingIntervalMs: config.pingIntervalMs,
          speedMps: config.speedMps,
        }
      );

      simulators.push(simulator);

      try {
        await simulator.connect();
        connectedCount++;
        console.log(`[${route.driverId}] Connected and simulating route ${route.name || route.id}`);
      } catch (error) {
        console.error(`[${route.driverId}] Failed to connect:`, error);
        // Continue with other drivers - don't fail the whole simulation
      }

      // Stagger connections slightly to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`[Multi-Sim] Failed to create simulator for route ${route.id}:`, error);
      // Continue with other routes
    }
  }

  // Check if any simulators connected
  if (connectedCount === 0) {
    console.error('[Multi-Sim] No simulators could connect. Please check:');
    console.error('  - WebSocket server is running at', config.wsUrl);
    console.error('  - Routes have valid polyline data');
    console.error('  - Routes have drivers assigned');
    process.exit(1);
  }

  console.log('');
  console.log('========================================');
  console.log(`  ${connectedCount} driver(s) running`);
  console.log('  Press Ctrl+C to stop all simulators');
  console.log('========================================');
  console.log('');

  // Handle graceful shutdown
  const shutdown = (): void => {
    console.log('\n[Multi-Sim] Shutting down all simulators...');
    simulators.forEach(sim => sim.disconnect());
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Keep process alive
  await new Promise(() => {});
}

// ============================================================================
// Entry Point
// ============================================================================

main().catch(error => {
  console.error('[Multi-Sim] Fatal error:', error);
  process.exit(1);
});
