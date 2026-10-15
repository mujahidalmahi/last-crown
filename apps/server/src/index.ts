import http from 'node:http';
import express, { Request, Response } from 'express';
import cors from 'cors';
import colyseus from 'colyseus';

const { Server, matchMaker } = colyseus;
import { WebSocketTransport } from '@colyseus/ws-transport';
import { PROTOCOL_VERSION, CreateRoomSchema, JoinRoomSchema } from '@last-crown/shared';
import { BattleRoom } from './rooms/BattleRoom.js';
import { RoomRegistry } from './matchmaking/RoomRegistry.js';
import { InMemoryRateLimiter } from './security/RateLimiter.js';
import { serverEnv } from './config/env.js';

const app = express();
app.use(express.json());

// CORS configuration
const allowedOrigins = serverEnv.SERVER_CORS_ORIGIN.split(',').map(o => o.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      const isVercelDomain =
        origin &&
        (origin.endsWith('.vercel.app') ||
          (process.env.VERCEL_URL && origin.includes(process.env.VERCEL_URL)));
      if (
        !origin ||
        allowedOrigins.includes('*') ||
        allowedOrigins.includes(origin) ||
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

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'last-crown-server',
    protocolVersion: PROTOCOL_VERSION,
    uptimeSec: Math.floor(process.uptime()),
    timestamp: Date.now(),
  });
});

// Private room creation endpoint
app.post('/api/rooms/create', async (req: Request, res: Response) => {
  try {
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

// Create HTTP and Colyseus Game Server
const server = http.createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({
    server,
    pingInterval: 5000,
    pingMaxRetries: 3,
  }),
});

// Register BattleRoom definition
gameServer.define('battle', BattleRoom);

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
