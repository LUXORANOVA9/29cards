# Redis Configuration for Free Tier

## Options:
1. **Railway Redis** (Free: $0/month, 1GB RAM)
2. **Upstash Redis** (Free: 10,000 commands/day)
3. **Redis Cloud** (Free: 30MB)

## Recommended: Railway Redis
Add to your Railway project as a service.

## Environment Variables:
```env
REDIS_URL="redis://default:[PASSWORD]@[HOST]:[PORT]"
REDIS_HOST="[HOST]"
REDIS_PORT="[PORT]" 
REDIS_PASSWORD="[PASSWORD]"
```

## Connection Code Example:
```javascript
const redis = require('redis');
const client = redis.createClient({
  url: process.env.REDIS_URL
});
```

## Usage in Services:
- **Session Management**: User login tokens
- **Game State**: Current game sessions
- **Caching**: API responses and user data
- **Real-time**: WebSocket connection mapping