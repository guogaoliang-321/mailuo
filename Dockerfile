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
# Build shared → db → api
RUN pnpm --filter @meridian/shared build \
 && pnpm --filter @meridian/db build \
 && pnpm --filter @meridian/api build
# Build web (static export)
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @meridian/web build

# ── Runtime stage ──
FROM node:22-slim
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/
COPY --from=build /app/packages/db/dist ./packages/db/dist
COPY --from=build /app/packages/db/package.json ./packages/db/
COPY --from=build /app/packages/db/src/pg ./packages/db/src/pg
COPY --from=build /app/packages/api/dist ./packages/api/dist
COPY --from=build /app/packages/api/package.json ./packages/api/
COPY --from=build /app/packages/web/.next/standalone ./web-standalone
COPY --from=build /app/packages/web/.next/static ./web-standalone/packages/web/.next/static
COPY --from=build /app/package.json ./

ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "packages/api/dist/index.js"]
