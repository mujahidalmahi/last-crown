import http from 'node:http';
import express, { Request, Response } from 'express';
import cors from 'cors';
import colyseus from 'colyseus';

const { Server, matchMaker } = colyseus;
import { WebSocketTransport } from '@colyseus/ws-transport';
import { PROTOCOL_VERSION, CreateRoomSchema, JoinRoomSchema } from '@last-crown/shared';
import { BattleRoom } from './rooms/BattleRoom.js';
import { PartyControllerRoom } from './rooms/PartyControllerRoom.js';
import { RoomRegistry } from './matchmaking/RoomRegistry.js';
import { InMemoryRateLimiter } from './security/RateLimiter.js';
import { serverEnv } from './config/env.js';
import { IceServerService } from './services/IceServerService.js';

const app = express();
app.use(express.json());

// CORS configuration
const allowedOrigins = serverEnv.SERVER_CORS_ORIGIN.split(',').map(o => o.trim());
app.use(
  cors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) => {
      const isLocalhost =
        !origin ||
        /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
        /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin) ||
        /^https?:\/\/0\.0\.0\.0(:\d+)?$/.test(origin);
      const isVercelDomain =
        origin &&
        (origin.endsWith('.vercel.app') ||
          (process.env.VERCEL_URL && origin.includes(process.env.VERCEL_URL)));
      if (
        isLocalhost ||
        allowedOrigins.includes('*') ||
        (origin && allowedOrigins.includes(origin)) ||
        isVercelDomain
      ) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  })
);

// Rate limiter for invite code verification to defeat brute force enumeration
const joinRateLimiter = new InMemoryRateLimiter({
  maxRequests: serverEnv.SERVER_RATE_LIMIT_JOIN_MAX,
  windowMs: serverEnv.SERVER_RATE_LIMIT_JOIN_WINDOW_MS,
});

// Rate limiter for room creation to defend server resources
const createRateLimiter = new InMemoryRateLimiter({
  maxRequests: serverEnv.SERVER_RATE_LIMIT_CREATE_MAX,
  windowMs: serverEnv.SERVER_RATE_LIMIT_CREATE_WINDOW_MS,
});

// Periodic background cleanup of stale registrations
const stalePruneInterval = setInterval(
  () => {
    const pruned = RoomRegistry.getInstance().pruneStaleRooms(60 * 60 * 1000);
    if (pruned > 0) {
      console.info(`[RoomRegistry] Pruned ${pruned} stale room records.`);
    }
  },
  5 * 60 * 1000
);
stalePruneInterval.unref();

// Health check endpoint with real-time operational telemetry
app.get('/health', (_req: Request, res: Response) => {
  const registry = RoomRegistry.getInstance();
  const mem = process.memoryUsage();
  res.json({
    status: 'ok',
    service: 'last-crown-server',
    protocolVersion: PROTOCOL_VERSION,
    uptimeSec: Math.floor(process.uptime()),
    activeMatches: registry.getActiveRoomCount(),
    totalConnectedPlayers: registry.getTotalPlayerCount(),
    maxCapacity: serverEnv.SERVER_MAX_CONCURRENT_ROOMS,
    memory: {
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      rssMb: Math.round(mem.rss / 1024 / 1024),
    },
    timestamp: Date.now(),
  });
});

// Server telemetry & metrics endpoint
app.get('/api/stats', (_req: Request, res: Response) => {
  const registry = RoomRegistry.getInstance();
  const mem = process.memoryUsage();
  res.json({
    activeMatches: registry.getActiveRoomCount(),
    totalConnectedPlayers: registry.getTotalPlayerCount(),
    maxCapacity: serverEnv.SERVER_MAX_CONCURRENT_ROOMS,
    memory: {
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      rssMb: Math.round(mem.rss / 1024 / 1024),
    },
    uptimeSec: Math.floor(process.uptime()),
    timestamp: Date.now(),
  });
});

// Private room creation endpoint
app.post('/api/rooms/create', async (req: Request, res: Response) => {
  try {
    const clientIp =
      (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const rateLimitResult = createRateLimiter.isAllowed(clientIp);
    if (!rateLimitResult.allowed) {
      res.status(429).json({
        error: 'Too many room creation requests. Please wait before creating another duel.',
        retryAfterMs: rateLimitResult.resetMs,
      });
      return;
    }

    if (RoomRegistry.getInstance().getActiveRoomCount() >= serverEnv.SERVER_MAX_CONCURRENT_ROOMS) {
      res.status(503).json({
        error: 'Server is currently at maximum battle room capacity. Please try again shortly.',
      });
      return;
    }

    const parseResult = CreateRoomSchema.safeParse(req.body);
    if (!parseResult.success) {
      res
        .status(400)
        .json({ error: 'Invalid room configuration', details: parseResult.error.format() });
      return;
    }

    const { isPrivate, warriorPreset, playerName } = parseResult.data;
    const room = await matchMaker.createRoom('battle', {
      isPrivate,
      warriorPreset,
      playerName,
    });

    const inviteCode =
      RoomRegistry.getInstance().getCodeByRoomId(room.roomId) ||
      RoomRegistry.getInstance().registerRoom(room.roomId);

    res.json({
      roomId: room.roomId,
      inviteCode,
      protocolVersion: PROTOCOL_VERSION,
    });
  } catch (err) {
    console.error('Error creating room:', err);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// Quick Match (Public Matchmaking) endpoint
app.post('/api/rooms/quickmatch', async (req: Request, res: Response) => {
  try {
    const clientIp =
      (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const rateLimitResult = createRateLimiter.isAllowed(clientIp);
    if (!rateLimitResult.allowed) {
      res.status(429).json({
        error: 'Too many match requests. Please wait a moment before queueing again.',
        retryAfterMs: rateLimitResult.resetMs,
      });
      return;
    }

    if (RoomRegistry.getInstance().getActiveRoomCount() >= serverEnv.SERVER_MAX_CONCURRENT_ROOMS) {
      res.status(503).json({
        error: 'Server is currently at maximum battle capacity. Please try again shortly.',
      });
      return;
    }

    const playerName = req.body?.playerName || 'Challenger';
    const warriorPreset = req.body?.warriorPreset || 'knight';

    const reservation = await matchMaker.joinOrCreate('battle', {
      isPrivate: false,
      warriorPreset,
      playerName,
    });

    res.json({
      roomId: reservation.room.roomId,
      sessionId: reservation.sessionId,
      protocolVersion: PROTOCOL_VERSION,
    });
  } catch (err) {
    console.error('Error during quickmatch matchmaking:', err);
    res.status(500).json({ error: 'Failed to find quick match' });
  }
});

// Private room verification endpoint
app.post('/api/rooms/verify', (req: Request, res: Response) => {
  const clientIp =
    (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  const rateLimitResult = joinRateLimiter.isAllowed(clientIp);

  if (!rateLimitResult.allowed) {
    res.status(429).json({
      error: 'Too many join attempts. Please wait before trying again.',
      retryAfterMs: rateLimitResult.resetMs,
    });
    return;
  }

  const parseResult = JoinRoomSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: 'Invalid join payload', details: parseResult.error.format() });
    return;
  }

  const { inviteCode } = parseResult.data;
  const registration = RoomRegistry.getInstance().getRoomByCode(inviteCode);

  if (!registration) {
    res.status(404).json({ error: 'Room not found or invite code has expired.' });
    return;
  }

  if (registration.playerCount >= 2) {
    res.status(409).json({ error: 'Room is already full.' });
    return;
  }

  res.json({
    valid: true,
    roomId: registration.roomId,
    inviteCode: registration.inviteCode,
  });
});

// WebRTC ICE / TURN servers endpoint (Cloudflare Realtime TURN with fallback)
app.get('/api/ice-servers', async (_req: Request, res: Response) => {
  try {
    const iceServers = await IceServerService.getIceServers();
    res.json({ iceServers });
  } catch {
    res.json({ iceServers: IceServerService.getDefaultIceServers() });
  }
});

// Create HTTP and Colyseus Game Server
const server = http.createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({
    server,
    pingInterval: 5000,
    pingMaxRetries: 3,
    maxPayload: 32 * 1024,
  }),
});

// Register BattleRoom definition with isolation filtering
gameServer.define('battle', BattleRoom).filterBy(['isPrivate', 'arenaId']);

// Register PartyControllerRoom for phone controllers and 2-player couch co-op
gameServer.define('party', PartyControllerRoom).filterBy(['partyCode']);

// Server startup
export function startServer(): Promise<http.Server> {
  return new Promise(resolve => {
    server.listen(serverEnv.SERVER_PORT, serverEnv.SERVER_HOST, () => {
      console.info(
        `[LAST CROWN] Authoritative Game Server running on ${serverEnv.SERVER_HOST}:${serverEnv.SERVER_PORT}`
      );
      resolve(server);
    });
  });
}

// Express global error handler
app.use((err: unknown, _req: Request, res: Response, _next: express.NextFunction) => {
  const errorMessage = err instanceof Error ? err.message : 'Internal Server Error';
  console.error('[LAST CROWN Error Handler]:', errorMessage);
  res.status(500).json({ error: errorMessage });
});

// Start if executed directly
if (process.env.NODE_ENV !== 'test') {
  startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });

  // Graceful shutdown on process termination signals
  const handleShutdown = (signal: string) => {
    console.info(`[LAST CROWN] Received ${signal}. Gracefully stopping server...`);
    gameServer.gracefullyShutdown().finally(() => {
      server.close(() => {
        console.info('[LAST CROWN] HTTP server closed.');
        process.exit(0);
      });
    });
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

export { app, server, gameServer };
export default app;
