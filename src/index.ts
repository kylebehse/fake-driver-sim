#!/usr/bin/env node
/**
 * Fake Driver Simulator
 *
 * Simulates a driver sending location pings to the WebSocket server.
 * For development and testing only - never deployed to production.
 *
 * Usage:
 *   npm run dev                    # Uses .env configuration
 *   DRIVER_ID=xyz npm run dev      # Override driver ID
 */

import { config } from 'dotenv';
import { DriverSimulator, SimulatorConfig } from './simulator.js';

// Load .env file
config();

// Safety: prevent running against production
const envMode = process.env.ENV_MODE || 'local';
if (envMode === 'live' || envMode === 'production') {
  console.error('========================================');
  console.error('  ERROR: Simulator cannot run against production!');
  console.error(`  ENV_MODE is set to "${envMode}"`);
  console.error('  Set ENV_MODE to local, dev, or test.');
  console.error('========================================');
  process.exit(1);
}

if (envMode === 'test') {
  console.warn('========================================');
  console.warn('  WARNING: Running against TEST environment');
  console.warn('  Fake data will be written to test server');
  console.warn('========================================');
  console.warn('');
}

// Parse configuration from environment
const simulatorConfig: SimulatorConfig = {
  wsUrl: process.env.WS_URL || 'ws://localhost:3001',
  driverId: process.env.DRIVER_ID || 'drv_test_001',
  tenantId: process.env.TENANT_ID || 'tenant_test_002',
  pingIntervalMs: parseInt(process.env.PING_INTERVAL_MS || '3000', 10),
  mode: (process.env.SIM_MODE as SimulatorConfig['mode']) || 'delivery_route',
  startLat: parseFloat(process.env.START_LAT || '37.7749'),
  startLng: parseFloat(process.env.START_LNG || '-122.4194'),
  speedMps: parseFloat(process.env.SPEED_MPS || '10')
};

console.log('========================================');
console.log('  Fake Driver Simulator');
console.log('========================================');
console.log('');
console.log('Configuration:');
console.log(`  WebSocket URL: ${simulatorConfig.wsUrl}`);
console.log(`  Driver ID:     ${simulatorConfig.driverId}`);
console.log(`  Tenant ID:     ${simulatorConfig.tenantId}`);
console.log(`  Mode:          ${simulatorConfig.mode}`);
console.log(`  Ping interval: ${simulatorConfig.pingIntervalMs}ms`);
console.log(`  Speed:         ${(simulatorConfig.speedMps * 2.237).toFixed(1)} mph`);
console.log('');

const simulator = new DriverSimulator(simulatorConfig);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Simulator] Shutting down...');
  simulator.disconnect();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[Simulator] Shutting down...');
  simulator.disconnect();
  process.exit(0);
});

// Connect and start simulation
async function main() {
  try {
    await simulator.connect();
    console.log('');
    console.log('[Simulator] Running... Press Ctrl+C to stop');
    console.log('');

    // Keep the process alive - this Promise never resolves
    // The process will only exit via SIGINT/SIGTERM handlers
    await new Promise(() => {});
  } catch (error) {
    console.error('[Simulator] Failed to start:', error);
    process.exit(1);
  }
}

main();
