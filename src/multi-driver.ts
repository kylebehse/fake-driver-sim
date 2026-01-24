#!/usr/bin/env node
/**
 * Multi-Driver Simulator
 *
 * Simulates multiple drivers sending location pings simultaneously.
 * Each driver follows a different route to create realistic fleet movement.
 * For development and testing only - never deployed to production.
 *
 * Usage:
 *   npm run dev:multi          # Simulate all 4 drivers
 *   DRIVERS=2 npm run dev:multi  # Simulate only 2 drivers
 */

import { config } from 'dotenv';
import { DriverSimulator, SimulatorConfig } from './simulator.js';
import {
  sfDeliveryRoute,
  brooklynRoute,
  manhattanMidtownRoute,
  dumboRoute,
  burlingtonDowntownRoute,
  burlingtonOuterRoute
} from './routes.js';

// Load .env file
config();

// Driver configurations with different routes
interface DriverConfig {
  id: string;
  tenantId: string;
  name: string;
  vehicle: string;
  route: 'sf' | 'brooklyn' | 'manhattan' | 'dumbo' | 'burlington_downtown' | 'burlington_outer';
}

const DRIVER_CONFIGS: DriverConfig[] = [
  // Acme Delivery Co (tenant_test_001) - NYC area
  {
    id: 'drv_sample_001',
    tenantId: 'tenant_test_001',
    name: 'Mike Johnson',
    vehicle: 'Ford Transit (Van)',
    route: 'manhattan'
  },
  {
    id: 'drv_sample_002',
    tenantId: 'tenant_test_001',
    name: 'Sarah Williams',
    vehicle: 'Mercedes Sprinter',
    route: 'brooklyn'
  },
  {
    id: 'drv_test_001',
    tenantId: 'tenant_test_001',
    name: 'Test Driver One',
    vehicle: 'Isuzu Box Truck',
    route: 'dumbo'
  },
  {
    id: 'drv_test_002',
    tenantId: 'tenant_test_001',
    name: 'Test Driver Two',
    vehicle: 'Cargo Bike',
    route: 'sf' // Using SF route as a fallback - will work anywhere
  },
  // Walmart Burlington (tenant_test_002) - Burlington, VT area
  {
    id: 'drv_walmart_001',
    tenantId: 'tenant_test_002',
    name: 'Rob Anderson',
    vehicle: 'Ford E-Transit (Electric)',
    route: 'burlington_downtown'
  },
  {
    id: 'drv_walmart_002',
    tenantId: 'tenant_test_002',
    name: 'Jen Thompson',
    vehicle: 'Mercedes eSprinter',
    route: 'burlington_outer'
  }
];

// Get route waypoints based on route name
function getRouteWaypoints(routeName: string) {
  switch (routeName) {
    case 'brooklyn':
      return brooklynRoute;
    case 'manhattan':
      return manhattanMidtownRoute;
    case 'dumbo':
      return dumboRoute;
    case 'burlington_downtown':
      return burlingtonDowntownRoute;
    case 'burlington_outer':
      return burlingtonOuterRoute;
    case 'sf':
    default:
      return sfDeliveryRoute;
  }
}

// Main function
async function main() {
  const wsUrl = process.env.WS_URL || 'ws://localhost:3001';
  const numDrivers = parseInt(process.env.DRIVERS || '4', 10);
  const pingIntervalMs = parseInt(process.env.PING_INTERVAL_MS || '3000', 10);
  const speedMps = parseFloat(process.env.SPEED_MPS || '8'); // Slightly slower for multi-driver

  console.log('========================================');
  console.log('  Multi-Driver Fleet Simulator');
  console.log('========================================');
  console.log('');
  console.log('Configuration:');
  console.log(`  WebSocket URL: ${wsUrl}`);
  console.log(`  Drivers:       ${Math.min(numDrivers, DRIVER_CONFIGS.length)}`);
  console.log(`  Ping interval: ${pingIntervalMs}ms`);
  console.log(`  Speed:         ${(speedMps * 2.237).toFixed(1)} mph`);
  console.log('');
  console.log('Drivers to simulate:');

  const driversToSimulate = DRIVER_CONFIGS.slice(0, numDrivers);

  driversToSimulate.forEach((driver, i) => {
    console.log(`  ${i + 1}. ${driver.name} (${driver.id})`);
    console.log(`     Vehicle: ${driver.vehicle}`);
    console.log(`     Route:   ${driver.route}`);
  });

  console.log('');
  console.log('Starting simulators...');
  console.log('');

  const simulators: DriverSimulator[] = [];

  for (const driver of driversToSimulate) {
    const route = getRouteWaypoints(driver.route);
    const startPosition = route[0];

    const config: SimulatorConfig = {
      wsUrl,
      driverId: driver.id,
      tenantId: driver.tenantId,
      pingIntervalMs,
      mode: 'delivery_route',
      startLat: startPosition.lat,
      startLng: startPosition.lng,
      speedMps,
      // Pass the specific route for this driver
      customRoute: route
    };

    const simulator = new DriverSimulator(config);
    simulators.push(simulator);

    try {
      await simulator.connect();
      console.log(`[${driver.name}] Connected and simulating`);
    } catch (error) {
      console.error(`[${driver.name}] Failed to connect:`, error);
    }

    // Stagger connections slightly to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('');
  console.log('========================================');
  console.log(`  ${simulators.length} drivers running`);
  console.log('  Press Ctrl+C to stop all simulators');
  console.log('========================================');
  console.log('');

  // Handle graceful shutdown
  const shutdown = () => {
    console.log('\n[Multi-Sim] Shutting down all simulators...');
    simulators.forEach(sim => sim.disconnect());
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Keep process alive
  await new Promise(() => {});
}

main().catch(error => {
  console.error('[Multi-Sim] Fatal error:', error);
  process.exit(1);
});
