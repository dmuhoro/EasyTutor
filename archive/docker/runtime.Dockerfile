# COGNITIVE RUNTIME PLATFORM - DOCKERFILE
# Optimized for production-grade AI-native execution.

FROM node:20-slim AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npx tsc --outDir dist

# Production stage
FROM node:20-slim

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built artifacts
COPY --from=builder /app/dist ./dist

# Environment defaults
ENV NODE_ENV=production
ENV PLATFORM_PORT=3000

# Expose port
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node dist/scripts/qa/healthcheck.js

# Entrypoint
CMD ["node", "dist/src/api/governedApiGateway.js"]
