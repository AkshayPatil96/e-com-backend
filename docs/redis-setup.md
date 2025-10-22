# Redis Setup Guide

Quick guide for setting up Redis or running without it.

## Option 1: Install Redis (Recommended)

### Windows
```bash
# Using Chocolatey
choco install redis-64

# Start Redis
redis-server

# Test connection
redis-cli ping
```

### macOS
```bash
# Using Homebrew
brew install redis

# Start Redis
brew services start redis

# Test connection
redis-cli ping
```

### Linux (Ubuntu/Debian)
```bash
# Install Redis
sudo apt update
sudo apt install redis-server

# Start Redis
sudo systemctl start redis-server

# Test connection
redis-cli ping
```

## Option 2: Run Without Redis

The application now gracefully handles Redis absence:

1. **Leave REDIS_URI empty** in your `.env` file
2. **Start the application** - it will use memory-based fallbacks
3. **Check health** at `/health` to see Redis status

## Testing the Fix

1. **Start your application**:
   ```bash
   npm run dev-local
   ```

2. **Check the logs** - you should see:
   ```
   ✅ Server running at http://localhost:5000
   📊 Health check available at http://localhost:5000/health
   ⚠️ Redis connection failed - continuing without Redis
   ```

3. **Test the health endpoint**:
   ```bash
   curl http://localhost:5000/health
   ```

4. **Test rate limiting** - it will work with memory storage:
   ```bash
   # Make multiple requests to see rate limiting in action
   for i in {1..10}; do curl http://localhost:5000/api/v1/auth/login; done
   ```

## Environment Variables

```env
# .env file
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/ecommerce

# Redis is now optional
REDIS_URI=redis://localhost:6379

# Optional Redis configuration
REDIS_PASSWORD=
REDIS_DB=0
```

## What Works Without Redis

✅ **Server Startup**: Application starts normally  
✅ **Rate Limiting**: Uses memory storage  
✅ **Error Handling**: Full error processing  
✅ **Health Checks**: Reports Redis status  
✅ **API Documentation**: Swagger still available  
✅ **Authentication**: All auth features work  

⚠️ **Limitations Without Redis**:
- Rate limits reset on server restart
- Session sharing across multiple servers limited
- No distributed caching

## Troubleshooting

### If you see repeated Redis errors:
1. Check if Redis is running: `redis-cli ping`
2. Verify REDIS_URI in `.env` file
3. Or remove REDIS_URI to run without Redis

### If server won't start:
1. Check MongoDB connection
2. Verify all environment variables
3. Check port availability

The enhanced system will now handle Redis issues gracefully! 🚀