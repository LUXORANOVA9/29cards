# Database & Redis Setup Guide for 29Cards

## Prerequisites
- PostgreSQL 14+ installed and running
- Redis 6+ installed and running
- Windows Administrator privileges (for file permissions)

## PostgreSQL Setup

### 1. Install PostgreSQL
```bash
# Windows - Download from https://www.postgresql.org/download/windows/
# Or use Chocolatey:
choco install postgresql

# During installation, set:
# - Password: secure_password_change_me
# - Port: 5432
# - Username: postgres
```

### 2. Create Database
```sql
-- Connect to PostgreSQL as postgres user
CREATE USER sindhi_user WITH PASSWORD 'secure_password_change_me';
CREATE DATABASE sindhi_patta OWNER sindhi_user;
GRANT ALL PRIVILEGES ON DATABASE sindhi_patta TO sindhi_user;
```

### 3. Test Connection
```bash
psql -h localhost -U sindhi_user -d sindhi_patta -c "SELECT version();"
```

## Redis Setup

### 1. Install Redis
```bash
# Windows - Download from https://github.com/microsoftarchive/redis/releases
# Or use Chocolatey:
choco install redis-64

# Or use WSL2 for full Redis support
```

### 2. Start Redis Service
```bash
# Windows
redis-server

# Or as service
redis-server --service-install
redis-server --service-start
```

### 3. Test Connection
```bash
redis-cli ping
# Should return: PONG
```

## Environment Configuration

### 1. Environment Variables
Update `.env` file:
```bash
DATABASE_URL="postgresql://sindhi_user:secure_password_change_me@localhost:5432/sindhi_patta"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="production_jwt_secret_change_me_32_chars"
```

### 2. Database Setup Commands
```bash
cd packages/database

# Generate Prisma client (requires admin privileges)
npx prisma generate

# Push schema to database
npx prisma db push

# Seed initial data
npx prisma db seed
```

## Troubleshooting

### Permission Issues
```bash
# Run as Administrator on Windows
# Or fix file permissions:
chmod 644 .env
chmod 755 packages/database/prisma/schema.prisma
```

### Connection Issues
```bash
# Check PostgreSQL is running
netstat -an | findstr 5432

# Check Redis is running
netstat -an | findstr 6379

# Test PostgreSQL connection
psql -h localhost -U sindhi_user -d sindhi_patta

# Test Redis connection
redis-cli ping
```

## Docker Alternative (Recommended)

If you have Docker installed:
```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Run database setup
cd packages/database
npx prisma generate
npx prisma db push
npx prisma db seed
```

## Verification

Once setup is complete:
```bash
# Test database schema
npx prisma studio

# Test Redis
redis-cli
> set test "hello"
> get test
> del test
```

## Next Steps

After database setup:
1. Start all services manually for testing
2. Run the complete game flow
3. Deploy with Docker/Kubernetes

## Default Credentials

- Super Admin: `super@admin.com` / `password123`
- Panel Admin: `admin@demo.com` / `password123`  
- Players: `player1-4@demo.com` / `password123`