# Free-Tier Deployment Guide

## 1. Zero-Cost Architectural Philosophy

The foundational release of LAST CROWN is specifically architected to run with zero recurring cloud costs:

- No database required (stateless in-memory room registries).
- No paid sound or art assets (custom Web Audio synthesizers and procedural pixel graphics).
- No third-party authentication services.

## 2. Frontend Hosting (Next.js)

The frontend application (`apps/web`) can be deployed to free tiers of:

- **Vercel** (Hobby plan)
- **Cloudflare Pages**
- **Netlify** (Free plan)

Set environment variables in the hosting dashboard:

```env
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NEXT_PUBLIC_SERVER_WS_URL=wss://your-colyseus-server.example.com
NEXT_PUBLIC_SERVER_HTTP_URL=https://your-colyseus-server.example.com
```

## 3. Multiplayer Server Hosting (Colyseus)

Persistent WebSocket servers require long-running Node.js processes, which cannot be hosted on serverless functions.
Recommended free/low-cost platforms supporting WebSockets:

- **Render.com** (Free Web Service tier, supports WebSockets)
- **Fly.io** (Free allowance for small machines)
- **Railway** (Trial / free credit allowance)

Build and Start commands for the server:

- **Build Command**: `npm install && npm run build --workspace=@last-crown/server`
- **Start Command**: `npm run start --workspace=@last-crown/server`
- **Port**: Configure `SERVER_PORT` to `2567` (or `$PORT` mapped by the host).
