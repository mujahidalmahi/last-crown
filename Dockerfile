# Multi-stage Docker build for LAST CROWN Authoritative Colyseus Game Server
FROM node:20-alpine AS builder
WORKDIR /app

# Copy root and workspace package files for caching
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/game-config/package*.json ./packages/game-config/
COPY packages/game-core/package*.json ./packages/game-core/
COPY apps/server/package*.json ./apps/server/
COPY apps/web/package*.json ./apps/web/

RUN npm ci

# Copy sources required for server build
COPY tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/server/ ./apps/server/

# Build shared packages and server
RUN npm run build:packages && npm run build --workspace=@last-crown/server

# Runner stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV SERVER_HOST=0.0.0.0
ENV PORT=2567

COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/game-config/package*.json ./packages/game-config/
COPY packages/game-core/package*.json ./packages/game-core/
COPY apps/server/package*.json ./apps/server/

RUN npm ci --omit=dev

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/game-config/dist ./packages/game-config/dist
COPY --from=builder /app/packages/game-core/dist ./packages/game-core/dist
COPY --from=builder /app/apps/server/dist ./apps/server/dist

EXPOSE 2567

CMD ["npm", "run", "start", "--workspace=@last-crown/server"]
