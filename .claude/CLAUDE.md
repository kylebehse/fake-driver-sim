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

## Integration
- Requires WebSocket server running (`apps/websocket`)
- Driver ID must exist in database (use seed endpoint)
- Dispatch page receives location broadcasts
