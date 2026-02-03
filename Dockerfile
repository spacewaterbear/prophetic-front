# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Install dependencies with npm cache for faster rebuilds
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Accept build arguments for environment variables
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production \
    NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy configuration files first (change less frequently = better caching)
COPY package.json next.config.* tsconfig.json tailwind.config.* postcss.config.* components.json ./

# Copy source code (changes most frequently)
COPY src ./src

# Cache bust argument - pass --build-arg CACHEBUST=$(date +%s) to force rebuild
ARG CACHEBUST=1

# Build with npm cache
RUN --mount=type=cache,target=/root/.npm \
    npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

# Create non-root user in single layer
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# Health check for production orchestrators (k8s, docker swarm, etc.)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
