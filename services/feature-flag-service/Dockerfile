FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY services/feature-flag-service/package*.json ./services/feature-flag-service/

# Install dependencies
RUN npm ci

# Copy source code
COPY services/feature-flag-service/ ./services/feature-flag-service/
COPY packages/feature-flag-sdk/ ./packages/feature-flag-sdk/

# Build the SDK first
WORKDIR /app/packages/feature-flag-sdk
RUN npm run build

# Build the feature flag service
WORKDIR /app/services/feature-flag-service
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY services/feature-flag-service/package*.json ./services/feature-flag-service/

# Install only production dependencies
RUN npm ci --only=production

# Copy built service
COPY --from=builder /app/services/feature-flag-service/dist ./services/feature-flag-service/dist
COPY --from=builder /app/services/feature-flag-service/prisma ./services/feature-flag-service/prisma

# Generate Prisma client
WORKDIR /app/services/feature-flag-service
RUN npx prisma generate

# Expose port
EXPOSE 3004

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3004/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Run the service
CMD ["node", "dist/server.js"]