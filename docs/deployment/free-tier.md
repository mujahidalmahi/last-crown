# Free-Tier Deployment Guide

## 1. Zero-Cost Architectural Philosophy

The foundational release of LAST CROWN is specifically architected to run with zero recurring cloud costs:

- **No database required**: In-memory authoritative room registries and matchmaking.
- **No paid assets**: Procedural pixel art and dynamic Web Audio synthesizers.
- **No third-party auth**: Secure 6-character room invitation codes.
- **Offline / Practice Mode**: 100% client-side Phaser combat with intelligent bot AI, requiring zero server infrastructure.

---

## 2. Frontend Hosting (Next.js on Vercel)

The frontend application (`apps/web`) is deployed on **Vercel** (Hobby plan, $0/month).

### Monorepo Build Settings

Vercel uses the root `vercel.json` automatically:

- **Framework Preset**: Next.js
- **Build Command**: `npm run build:packages && npm run build --workspace=@last-crown/web`
- **Output Directory**: `apps/web/.next`

### Vercel Environment Variables

In your Vercel Project Dashboard (**Settings** → **Environment Variables**):

| Variable                      | Description                          | Example Value                            |
| ----------------------------- | ------------------------------------ | ---------------------------------------- |
| `NEXT_PUBLIC_APP_URL`         | Your public Vercel domain            | `https://last-crown.vercel.app`          |
| `NEXT_PUBLIC_SERVER_HTTP_URL` | Colyseus server HTTPS address        | `https://last-crown-server.onrender.com` |
| `NEXT_PUBLIC_SERVER_WS_URL`   | Colyseus server WSS address          | `wss://last-crown-server.onrender.com`   |
| `SERVER_URL`                  | Server address for Next.js API proxy | `https://last-crown-server.onrender.com` |

---

## 3. Multiplayer Server Hosting (Colyseus on Render)

Persistent real-time multiplayer with 20Hz tick simulation and WebSockets requires a long-running Node.js process, which cannot run on serverless functions.

### Deploying to Render.com (Free Tier)

Render provides free persistent Web Services with native WebSocket and SSL support (`wss://`).

#### Option A: 1-Click Blueprint via `render.yaml`

1. Push this repository to GitHub.
2. In the [Render Dashboard](https://dashboard.render.com), click **New +** → **Blueprint**.
3. Select your repository. Render automatically reads `render.yaml` and provisions the Web Service!
4. Click **Apply**.

#### Option B: Manual Web Service Setup on Render

- **Name**: `last-crown-server`
- **Region**: Oregon (or nearest to your players)
- **Branch**: `master` (or `main`)
- **Runtime**: `Node`
- **Build Command**: `npm ci --include=dev && npm run build:packages && npm run build --workspace=@last-crown/server`
- **Start Command**: `npm run start --workspace=@last-crown/server`
- **Plan**: `Free`
- **Environment Variables**:
  - `NODE_ENV`: `production`
  - `SERVER_HOST`: `0.0.0.0`
  - `SERVER_CORS_ORIGIN`: `*` (or your Vercel domain `https://your-domain.vercel.app`)

Once deployed, copy your Render URL (e.g. `https://last-crown-server.onrender.com`), paste it into your Vercel Environment Variables, and trigger a redeployment on Vercel.

---

## 4. Alternate Server Hosts (Railway & Fly.io)

You can also deploy using the included production `Dockerfile`:

### Railway

1. **New Project** → **Deploy from GitHub repo**.
2. Railway detects the `Dockerfile` automatically.
3. Add environment variable `SERVER_CORS_ORIGIN=*`.

### Fly.io

```bash
fly launch --dockerfile Dockerfile
fly deploy
```
