FROM node:22-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y \
    openssl \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable

# Workspace manifests first (frozen-lockfile requires all workspace importers)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/mobile/package.json ./apps/mobile/package.json
COPY apps/capacitor/package.json ./apps/capacitor/package.json
COPY apps/investor/package.json ./apps/investor/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json
COPY packages/shared-types/tsconfig.json ./packages/shared-types/tsconfig.json
COPY packages/shared-types/src ./packages/shared-types/src

RUN pnpm install --frozen-lockfile

# Build the workspace dependency before the app build
RUN pnpm --filter @kognitika/shared-types build

COPY prisma ./prisma
RUN pnpm exec prisma generate

COPY . .

RUN pnpm build

FROM node:22-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    openssl \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable \
    && groupadd -r kognitika && useradd -r -g kognitika kognitika

# Workspace manifests (frozen-lockfile requires all workspace importers)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/mobile/package.json ./apps/mobile/package.json
COPY apps/capacitor/package.json ./apps/capacitor/package.json
COPY apps/investor/package.json ./apps/investor/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json

# Schema must be present so prisma generate can run in this stage
COPY prisma ./prisma

RUN pnpm install --frozen-lockfile --prod \
    && pnpm exec prisma generate

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist

EXPOSE 3006

ENV NODE_ENV=production

USER kognitika

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:3006/api/health').then(r=>process.exit(r.status===200?0:1)).catch(()=>process.exit(1))"

# Avoid Corepack's per-user cache at runtime. The image runs as an unprivileged
# user and invokes the installed TypeScript runner directly.
CMD ["./node_modules/.bin/tsx", "server.ts"]
