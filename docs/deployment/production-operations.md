# Production Operations & Deployment Runbook

This guide outlines enterprise deployment, container orchestration, reverse proxy configuration, and monitoring for **Last-Crown**.

---

## 1. Containerization & Docker Execution

The root [`Dockerfile`](../../Dockerfile) provides a multi-stage Alpine build for `@last-crown/server`:

```bash
# 1. Build the production Docker image
docker build -t last-crown-server:latest -f Dockerfile .

# 2. Run the production container with resource limits
docker run -d \
  --name last-crown-server \
  --restart unless-stopped \
  -p 2567:2567 \
  -e PORT=2567 \
  -e NODE_ENV=production \
  -e CORS_ALLOWED_ORIGINS="https://last-crown.top" \
  --memory="512m" \
  --cpus="1.0" \
  last-crown-server:latest
```

---

## 2. Reverse Proxy & SSL/WSS Termination

Colyseus requires persistent WebSocket connections. When hosting behind Nginx or Caddy:

### Nginx Configuration

```nginx
# /etc/nginx/conf.d/last-crown.conf
upstream colyseus_backend {
    server 127.0.0.1:2567;
    keepalive 64;
}

server {
    listen 443 ssl http2;
    server_name server.last-crown.top;

    ssl_certificate /etc/letsencrypt/live/server.last-crown.top/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/server.last-crown.top/privkey.pem;

    location / {
        proxy_pass http://colyseus_backend;
        proxy_http_version 1.1;

        # WebSocket Upgrade Headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Client IP Propagation
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket Timeout Settings
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

### Caddy Configuration

```caddy
server.last-crown.top {
    reverse_proxy localhost:2567 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
}
```

---

## 3. Environment Variables Reference

| Variable                        | Target Application | Required | Default                 | Description                                       |
| :------------------------------ | :----------------- | :------- | :---------------------- | :------------------------------------------------ |
| `PORT`                          | `server`           | No       | `2567`                  | Port for the Colyseus game server                 |
| `NODE_ENV`                      | Both               | Yes      | `production`            | Node.js runtime environment                       |
| `CORS_ALLOWED_ORIGINS`          | `server`           | Yes      | `http://localhost:3000` | Comma-separated list of allowed web origins       |
| `SERVER_ROOM_EMPTY_TIMEOUT_SEC` | `server`           | No       | `300`                   | Auto-dispose unjoined rooms after seconds         |
| `NEXT_PUBLIC_SERVER_HTTP_URL`   | `web`              | Yes      | `http://localhost:2567` | HTTP base URL for server health and verification  |
| `NEXT_PUBLIC_SERVER_WS_URL`     | `web`              | Yes      | `ws://localhost:2567`   | WebSocket base URL for Colyseus multiplayer rooms |
| `CLOUDFLARE_TURN_KEY_ID`        | Both               | No       | `""`                    | Cloudflare Calls / TURN authentication key ID     |
| `CLOUDFLARE_TURN_KEY_API_TOKEN` | Both               | No       | `""`                    | Cloudflare Calls / TURN API authorization token   |

---

## 4. Health Checks & Synthetic Monitoring

### Server Health Endpoint

- **URL**: `GET https://server.last-crown.top/health`
- **Response**: `200 OK`
  ```json
  {
    "status": "ok",
    "uptime": 14285.3,
    "activeRooms": 3,
    "timestamp": 1740000000000
  }
  ```
- **Recommended Alert Rule**: Alert if 3 consecutive failures over 60 seconds (HTTP status $\ne 200$).

### Web App Verification Endpoint

- **URL**: `POST https://last-crown.top/api/rooms/verify` with body `{"inviteCode": "TEST"}`
- **Expected Response**: `200 OK` with `{"valid": false}`.
