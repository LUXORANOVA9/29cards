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

# Build all
RUN npm run build

# Expose port
EXPOSE 3000

WORKDIR /app/apps/web
CMD ["npm", "start"]
