# Fake Driver Simulator

A development-only tool that simulates driver location pings to the WebSocket server. This allows testing the dispatch map and tracking features without running the Flutter driver app.

## Why This Exists

- **Zero production contamination** - This is a separate app that never gets deployed
- **Tests the real path** - Connects via WebSocket exactly like the Flutter driver app
- **No environment variable risk** - No `DEMO_MODE` flags in production code
- **Road-following routes** - Drivers stay on roads using Google-encoded polylines from the API

## How It Works

The simulator fetches route data from the SvelteKit API, which includes pre-computed Google-encoded polylines. These polylines represent actual driving routes on roads, so simulated drivers follow realistic paths instead of cutting through buildings.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  SvelteKit API  │────▶│  Fake Driver    │────▶│ WebSocket Server│
│  (route data)   │     │  Simulator      │     │ (location pings)│
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
   Polylines from        Decode polyline,        Broadcast to
   Google Directions     navigate along path     dispatch dashboard
```

## Setup

```bash
cd apps/fake-driver-sim
npm install
cp .env.example .env
# Edit .env with your configuration
```

## Usage

### Multi-Driver Mode (Recommended)

Simulates all drivers with active routes for a tenant:

```bash
npm run dev:multi
```

This mode:
1. Connects to the SvelteKit API
2. Fetches all active routes for the tenant
3. Creates a simulator for each driver with an active route
4. Each driver follows their assigned polyline

### Single Driver Mode

For testing a specific driver:

```bash
npm run dev
```

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `API_URL` | SvelteKit API URL | `http://localhost:5173` |
| `WS_URL` | WebSocket server URL | `ws://localhost:3001` |
| `TENANT_ID` | Tenant to simulate | `tenant_test_002` |
| `DRIVER_ID` | Driver ID (single mode) | `drv_test_001` |
| `PING_INTERVAL_MS` | Location ping interval | `3000` |
| `SPEED_MPS` | Speed in meters/second | `8` (~18 mph) |

## Simulation Modes

### `polyline` (default in multi-driver mode)
Driver follows a Google-encoded polyline from the API. This ensures drivers stay on roads.

### `stationary`
Driver stays in one place. Good for basic connection testing.

### `linear`
Driver moves in a square pattern around the starting point.

### `delivery_route` (legacy)
Driver follows predefined waypoints. May cut through buildings.

## Testing Flow

1. Start the WebSocket server: `cd apps/websocket && npm run dev`
2. Start the SvelteKit app: `cd apps/svelte/svelte-delivery-app && npm run dev`
3. Seed test data: `curl -X POST http://localhost:5173/api/tenants/tenant_test_002/seed-dispatch`
4. Start the multi-driver simulator: `cd apps/fake-driver-sim && npm run dev:multi`
5. Open dispatch page: `http://localhost:5173/t/tenant_test_002/dispatch`

You should see drivers appear on the map and move along their routes, staying on roads.

## Road-Following Implementation

The road-following feature uses pre-computed polylines stored in the database:

1. **Fixture generation** - Run `npm run seed:generate` in the SvelteKit app to generate route data with Google Directions API polylines
2. **Seed data** - The `/api/tenants/{tenantId}/seed-dispatch` endpoint loads the fixture into the database
3. **API fetch** - The simulator fetches routes from `/api/tenants/{tenantId}/routes`
4. **Polyline navigation** - Each simulator decodes the polyline and navigates along the points

### Polyline Format
Routes use Google's [Encoded Polyline Algorithm](https://developers.google.com/maps/documentation/utilities/polylinealgorithm). A single string encodes the entire route as a series of lat/lng coordinates at 5 decimal precision.

Example: `spvwF||sbM\`CxA_@lA...` decodes to hundreds of coordinate pairs following the actual road geometry.

## Notes

- This app is **never deployed** - it's for local development only
- The WebSocket server must be running before starting the simulator
- In dev mode, the WebSocket server accepts fake JWT tokens
- Routes must have status `in_progress` to be simulated
- Polylines are generated once per address set (cached)
