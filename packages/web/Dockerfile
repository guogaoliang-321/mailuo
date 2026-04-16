FROM node:22-slim AS base
RUN npm install -g pnpm@10.8.1

FROM base AS build
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY packages/web/package.json packages/web/
RUN pnpm install --frozen-lockfile
COPY packages/shared packages/shared
COPY packages/web packages/web
COPY tsconfig.base.json ./
RUN pnpm --filter @meridian/shared build && pnpm --filter @meridian/web build

FROM base AS runtime
WORKDIR /app
COPY --from=build /app/packages/web/.next/standalone ./
COPY --from=build /app/packages/web/.next/static ./packages/web/.next/static
COPY --from=build /app/packages/web/public ./packages/web/public 2>/dev/null || true
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "packages/web/server.js"]
