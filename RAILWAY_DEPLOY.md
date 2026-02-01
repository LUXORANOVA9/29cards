🚂 **RAILWAY DEPLOYMENT INSTRUCTIONS**
====================================

Since Railway requires interactive authentication, please run these commands manually:

### Step 1: Authenticate Railway
```powershell
cd E:\29cards
railway login
# This will open your browser for authentication
```

### Step 2: Initialize Railway Project
```powershell
railway init
# Choose: "Create new project"
# Project name: 29cards-api
```

### Step 3: Deploy All Services
```powershell
railway up
# This will deploy:
# - api-gateway (port 8080)
# - auth-service (port 3001) 
# - game-service (port 3002)
# - wallet-service (port 3003)
```

### Step 4: Configure Railway Environment Variables
In Railway dashboard (https://railway.app/project/29cards-api):

**Database Configuration:**
- DATABASE_URL = postgresql://postgres:SecurePassword123!@2024@db.YOUR_SUPABASE_ID.supabase.co:5432/postgres
- JWT_SECRET = SindhiPattaJWT2024Secure256BitKeyForProductionUseOnly
- NODE_ENV = production

**Redis Configuration:**
- REDIS_URL = redis://railway-redis-url (auto-provisioned)

### Step 5: Get Railway URLs
After deployment, Railway will provide URLs like:
- https://29cards-api.up.railway.app
- https://29cards-api-production.up.railway.app

### Step 6: Update Vercel Environment
Go to Vercel dashboard → 29cards → Settings → Environment Variables:
- NEXT_PUBLIC_API_URL = https://your-railway-url.railway.app
- NEXT_PUBLIC_GAME_SERVICE_URL = https://your-railway-url.railway.app

### Step 7: Redeploy Vercel
```powershell
cd E:\29cards\apps\web
vercel --prod
```

🎯 **Expected Result:**
- Web App: https://29cards.vercel.app
- API Services: https://29cards-api.railway.app
- Database: Supabase PostgreSQL
- Cache: Railway Redis

💰 **Total Monthly Cost: $0.00**

**Execute Step 1 now - Railway login in browser!** 🚂✨