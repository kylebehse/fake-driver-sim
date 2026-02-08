# Fake Driver Simulator

## Purpose
Development-only tool that simulates driver location pings to the WebSocket server. **Never deployed to production.**

## Location
`/apps/fake-driver-sim/`

## Key Files
- `src/index.ts` - Entry point, loads config from .env
- `src/simulator.ts` - WebSocket client, sends location_ping messages
- `src/routes.ts` - Predefined GPS paths for realistic movement

## Running
```bash
cd apps/fake-driver-sim
npm run dev
```

## WebSocket Protocol
1. Connect to `/ws/driver/{driverId}`
2. Send `auth` message with fake JWT token
3. Receive `connection_ack`
4. Send `location_ping` every N seconds
5. Respond to `heartbeat` with `pong`

## WebSocket Message Convention

All WebSocket message payload fields use **snake_case**, matching the REST API convention.

Outgoing message examples:
```json
{
  "type": "auth",
  "payload": { "token": "...", "driver_id": "DRV-001", "app_version": "1.0.0", "device_id": "sim" }
}
{
  "type": "location_ping",
  "payload": { "latitude": 37.77, "longitude": -122.41, "battery_level": 75 }
}
```

Internal TypeScript variables stay camelCase. Only the JSON payloads sent over the wire use snake_case.

## REST API Convention

All REST API request/response fields also use **snake_case**:
- Query params: `include_stops=true` (not includeStops)
- Request bodies: `arrived_at` (not arrivedAt)
- Responses from SvelteKit API are guaranteed snake_case via global hook

## Integration
- Requires WebSocket server running (`apps/websocket`)
- Driver ID must exist in database (use seed endpoint)
- Dispatch page receives location broadcasts
