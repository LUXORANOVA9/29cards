FROM node:20-alpine

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json turbo.json ./
COPY packages ./packages
COPY services ./services
COPY apps ./apps

RUN npm install

# Generate Prisma client
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma

# Build all (simplest way to ensure dependencies are met)
RUN npm run build

# Expose port
EXPOSE 8080

CMD ["node", "services/api-gateway/dist/server.js"]
