import path from 'node:path';
import fs from 'node:fs';
import { NextResponse } from 'next/server';
import dotenv from 'dotenv';

export const dynamic = 'force-dynamic';

function loadEnvFallback() {
  if (process.env.TURN_URL || process.env.EXPRESSTURN_URL) return;

  const candidates = [
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), 'apps/web/.env.local'),
    path.resolve(process.cwd(), 'apps/server/.env'),
    path.resolve(process.cwd(), '.env'),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        const content = fs.readFileSync(p, 'utf-8');
        const parsed = dotenv.parse(content);
        for (const [k, v] of Object.entries(parsed)) {
          if (!process.env[k]) {
            process.env[k] = v;
          }
        }
      } catch {}
    }
  }
}

interface CachedIceServers {
  data: { iceServers: { urls: string | string[]; username?: string; credential?: string }[] };
  expiresAt: number;
}
let cachedTurnResponse: CachedIceServers | null = null;

export async function GET() {
  loadEnvFallback();
  const isVercel = Boolean(process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV);
  const serverUrl =
    process.env.SERVER_URL ||
    process.env.NEXT_PUBLIC_SERVER_HTTP_URL ||
    (isVercel ? null : 'http://localhost:2567');

  // Try proxying to Colyseus server first if available
  if (serverUrl) {
    try {
      const res = await fetch(`${serverUrl}/api/ice-servers`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch {}
  }

  // Check in-memory cached TURN credentials first
  if (cachedTurnResponse && Date.now() < cachedTurnResponse.expiresAt) {
    return NextResponse.json(cachedTurnResponse.data);
  }

  // Fallback to Cloudflare Realtime TURN if configured on web, or standard robust public STUN
  const keyId = process.env.CLOUDFLARE_TURN_KEY_ID;
  const apiToken = process.env.CLOUDFLARE_TURN_API_TOKEN;

  if (keyId && apiToken) {
    try {
      const response = await fetch(
        `https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate-ice-servers`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ttl: 86400 }),
        }
      );

      if (response.ok) {
        const data = (await response.json()) as {
          iceServers?: { urls: string | string[]; username?: string; credential?: string }[];
        };
        if (data && Array.isArray(data.iceServers) && data.iceServers.length > 0) {
          const finalData = {
            iceServers: [
              { urls: 'stun:stun.cloudflare.com:3478' },
              { urls: 'stun:stun.l.google.com:19302' },
              ...data.iceServers,
            ],
          };
          cachedTurnResponse = {
            data: finalData,
            expiresAt: Date.now() + 12 * 60 * 60 * 1000,
          };
          return NextResponse.json(finalData);
        }
      }
    } catch {}
  }

  // Default STUN servers + dynamic TURN if configured in environment
  const iceServers: { urls: string | string[]; username?: string; credential?: string }[] = [
    { urls: 'stun:stun.l.google.com:19302' },
  ];

  const turnUrl = process.env.TURN_URL || process.env.EXPRESSTURN_URL;
  const turnUsername = process.env.TURN_USERNAME || process.env.EXPRESSTURN_USERNAME;
  const turnCredential =
    process.env.TURN_CREDENTIAL ||
    process.env.TURN_PASSWORD ||
    process.env.EXPRESSTURN_PASSWORD ||
    process.env.EXPRESSTURN_CREDENTIAL;

  if (turnUrl && turnUsername && turnCredential) {
    const baseTurnHost = turnUrl.replace(/^(turn:|turns:|stun:)/, '').split('?')[0];
    iceServers.push({
      urls: [`turn:${baseTurnHost}`, `turn:${baseTurnHost}?transport=tcp`],
      username: turnUsername,
      credential: turnCredential,
    });
  }

  return NextResponse.json({ iceServers });
}
