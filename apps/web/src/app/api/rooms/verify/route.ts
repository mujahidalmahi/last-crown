import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const isVercel = Boolean(process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV);
  const serverUrl =
    process.env.SERVER_URL ||
    process.env.NEXT_PUBLIC_SERVER_HTTP_URL ||
    (isVercel ? null : 'http://localhost:2567');

  if (!serverUrl) {
    return NextResponse.json(
      {
        error:
          'Multiplayer server is not configured on this Vercel deployment. Real-time duels require a persistent WebSocket server (e.g. Render, Railway, or Fly.io). Configure SERVER_URL in Vercel settings, or enjoy the game in Offline Mode.',
      },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const targetUrl = `${serverUrl}/api/rooms/verify`;

    const serverRes = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await serverRes.json().catch(() => ({}));
    return NextResponse.json(data, { status: serverRes.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Game server is currently unreachable';
    return NextResponse.json(
      {
        error: `Cannot connect to game server at ${serverUrl}. Make sure the Colyseus server is running. (${message})`,
      },
      { status: 503 }
    );
  }
}
