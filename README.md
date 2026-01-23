# Fake Driver Simulator

A development-only tool that simulates driver location pings to the WebSocket server. This allows testing the dispatch map and tracking features without running the Flutter driver app.

## Why This Exists

- **Zero production contamination** - This is a separate app that never gets deployed
- **Tests the real path** - Connects via WebSocket exactly like the Flutter driver app
- **No environment variable risk** - No `DEMO_MODE` flags in production code

## Setup

```bash
cd apps/fake-driver-sim
npm install
cp .env.example .env
# Edit .env with your driver ID from seeded data
```

## Usage

```bash
# Start the simulator (uses .env configuration)
npm run dev

# Or override specific values
DRIVER_ID=drv_xyz123 npm run dev
```

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `WS_URL` | WebSocket server URL | `ws://localhost:3001` |
| `DRIVER_ID` | Driver ID to simulate | `drv_test_001` |
| `TENANT_ID` | Tenant ID for the driver | `tenant_test_002` |
| `PING_INTERVAL_MS` | How often to send location pings | `3000` |
| `SIM_MODE` | `stationary`, `linear`, or `delivery_route` | `delivery_route` |
| `START_LAT` | Starting latitude | `37.7749` (SF) |
| `START_LNG` | Starting longitude | `-122.4194` (SF) |
| `SPEED_MPS` | Speed in meters/second | `10` (~22 mph) |

## Simulation Modes

### `stationary`
Driver stays in one place. Good for basic connection testing.

### `linear`
Driver moves in a square pattern around the starting point.

### `delivery_route`
Driver follows a realistic delivery route through San Francisco with pauses at "delivery stops".

## Testing Flow

1. Start the WebSocket server: `cd apps/websocket && npm run dev`
2. Start the SvelteKit app: `cd apps/svelte/svelte-delivery-app && npm run dev`
3. Seed test data: `curl -X POST http://localhost:5173/api/tenants/tenant_test_002/seed-dispatch`
4. Start the simulator: `cd apps/fake-driver-sim && npm run dev`
5. Open dispatch page: `http://localhost:5173/t/tenant_test_002/dispatch`

You should see the driver appear on the map and move along the route.

## Notes

- This app is **never deployed** - it's for local development only
- The WebSocket server must be running before starting the simulator
- In dev mode, the WebSocket server accepts fake JWT tokens
