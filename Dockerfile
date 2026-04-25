FROM node:22-slim AS base
RUN npm install -g pnpm@10.8.1

# ── Build stage ──
FROM base AS build
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/
COPY packages/api/package.json packages/api/
COPY packages/web/package.json packages/web/
RUN pnpm install --frozen-lockfile
COPY packages/shared packages/shared
COPY packages/db packages/db
COPY packages/api packages/api
COPY packages/web packages/web
COPY tsconfig.base.json ./
RUN pnpm --filter @meridian/shared build \
 && pnpm --filter @meridian/db build \
 && pnpm --filter @meridian/api build
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @meridian/web build

# ── Runtime stage ──
FROM node:22-slim
WORKDIR /app

# API files
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/
COPY --from=build /app/packages/db/dist ./packages/db/dist
COPY --from=build /app/packages/db/package.json ./packages/db/
COPY --from=build /app/packages/db/src/pg ./packages/db/src/pg
COPY --from=build /app/packages/api/dist ./packages/api/dist
COPY --from=build /app/packages/api/package.json ./packages/api/
COPY --from=build /app/package.json ./

# Next.js standalone
COPY --from=build /app/packages/web/.next/standalone ./
COPY --from=build /app/packages/web/.next/static ./packages/web/.next/static
COPY --from=build /app/packages/web/public ./packages/web/public

# Startup script: start API on 4000, then Next.js on 8080
RUN echo '#!/bin/sh\nnode /app/packages/api/dist/index.js &\nHOSTNAME=0.0.0.0 PORT=8080 node /app/packages/web/server.js' > /app/start.sh && chmod +x /app/start.sh

ENV NODE_ENV=production
ENV API_URL=http://localhost:4000
EXPOSE 8080
CMD ["/app/start.sh"]
