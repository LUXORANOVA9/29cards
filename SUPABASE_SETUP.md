# Supabase Setup for 29cards

## 1. Create Supabase Project
```bash
# Install Supabase CLI
npm install -g supabase

# Initialize project
supabase init
supabase login
supabase link --project-reference YOUR_PROJECT_ID
```

## 2. Database Schema
The following schemas will be migrated to Supabase:

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  coins BIGINT DEFAULT 1000,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Games Table
```sql
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id UUID REFERENCES users(id),
  player2_id UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'waiting',
  pot BIGINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 3. Environment Variables
```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
SUPABASE_URL="https://[YOUR-PROJECT-REF].supabase.co"
SUPABASE_ANON_KEY="[YOUR-ANON-KEY]"
SUPABASE_SERVICE_ROLE_KEY="[YOUR-SERVICE-ROLE-KEY]"
```

## 4. Migration Commands
```bash
# Generate Prisma client
npx prisma generate

# Push schema to Supabase
npx prisma db push

# Run migrations
npx prisma migrate dev
```