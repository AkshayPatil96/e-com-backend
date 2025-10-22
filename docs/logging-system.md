# 📊 Enhanced Logging System Documentation

## 🎯 Overview

The enhanced logging system provides intelligent log management with daily rotation, smart sampling, and automatic cleanup. It's designed to balance comprehensive monitoring with performance and storage efficiency.

## 🔧 Key Features

### ✅ **Smart Logging**
- **Environment-aware**: Different log levels for dev/staging/production
- **Intelligent Sampling**: High-frequency events sampled to reduce volume
- **Security-first**: Security events never sampled
- **Performance-optimized**: Async writes, minimal blocking

### ✅ **File Management**
- **Daily Rotation**: Automatic file rotation by date
- **Category Separation**: Separate files by log type
- **Retention Policies**: Configurable cleanup based on file age
- **Compression**: Automatic compression of old files

### ✅ **Monitoring & Alerts**
- **Real-time Statistics**: File sizes, counts, cleanup candidates
- **Health Monitoring**: Automated alerts for large files or excessive logs
- **Performance Tracking**: Slow query detection and logging

## 📁 Log File Structure

```
logs/
├── error-2024-01-15.log         # Error logs (30 days retention)
├── security-2024-01-15.log      # Security events (90 days retention)
├── business-2024-01-15.log      # Business events (14 days retention)
├── performance-2024-01-15.log   # Performance metrics (7 days retention)
├── debug-2024-01-15.log         # Debug logs (3 days, dev only)
├── combined-2024-01-15.log      # All info+ logs (14 days)
├── exceptions.log               # Uncaught exceptions
└── rejections.log               # Unhandled promise rejections
```

## 🚀 Usage Examples

### **1. Authentication Logging**
```typescript
// High-frequency events (sampled)
loggerHelpers.auth('login_success', userId, { method: 'cookie', ip: req.ip });

// Security events (never sampled)
loggerHelpers.security('failed_login', 'HIGH', { ip: req.ip, attempts: 5 });
```

### **2. Business Event Logging**
```typescript
// Important business events (always logged)
loggerHelpers.business('order_created', { orderId, userId, amount });

// Routine events (sampled)
loggerHelpers.business('product_viewed', { productId, userId });
```

### **3. Performance Monitoring**
```typescript
const startTime = Date.now();
const result = await someSlowOperation();
loggerHelpers.performance('database_query', Date.now() - startTime, { 
  query: 'getUserProfile',
  userId 
});
```

### **4. Error Logging**
```typescript
try {
  await riskyOperation();
} catch (error) {
  loggerHelpers.error('Operation failed', error, { 
    userId, 
    operation: 'payment_processing' 
  });
}
```

## 📈 Sampling Strategy

### **High-Frequency Events (Sampled)**
- Authentication attempts: 1 in 10 logged
- Successful logins: 1 in 10 logged  
- Product views: 1 in 20 logged
- API requests (success): 1 in 50 logged

### **Always Logged (No Sampling)**
- Security events
- Authentication failures
- Errors and exceptions
- Business-critical events
- Performance issues (slow queries)

## 🛠️ Log Management Commands

### **Generate Report**
```bash
npm run logs:report
```

### **Cleanup Old Files**
```bash
npm run logs:cleanup
```

### **Quick Statistics**
```bash
npm run logs:stats
```

### **Full Management Interface**
```bash
npm run logs:manage
```

## ⚙️ Configuration

### **Environment-Based Levels**
```typescript
// Production: Only info and above, minimal console output
// Staging: Debug level with full sampling
// Development: Full debug logging, no sampling
```

### **Retention Policies**
```typescript
{
  error: 30,        // 30 days
  security: 90,     // 90 days (compliance)
  business: 14,     // 14 days
  performance: 7,   // 7 days
  debug: 3         // 3 days (dev only)
}
```

### **File Size Limits**
```typescript
{
  maxFileSize: '20MB',    // Rotate when file exceeds 20MB
  maxTotalSize: '1GB',    // Alert when total logs exceed 1GB
  compressionEnabled: true // Compress rotated files
}
```

## 🔍 Production Optimizations

### **1. Reduced Verbosity**
- Console logging disabled except for errors
- JSON format for efficient parsing
- Abbreviated field names to reduce size
- Sensitive data truncation/masking

### **2. Performance**
- Async/non-blocking writes
- Redis caching for frequent operations
- Smart sampling reduces I/O operations
- Buffered writes for better performance

### **3. Storage Efficiency**
```typescript
// Production log format (compact)
{
  "t": "2024-01-15T10:30:00.000Z",  // timestamp
  "l": "info",                       // level
  "m": "User login",                 // message
  "u": "user123",                    // userId
  "ip": "192.168***"                 // truncated IP
}
```

## 📊 Monitoring Dashboard Example

```
📊 LOG MANAGEMENT REPORT
========================
Generated: 2024-01-15T10:30:00.000Z

📁 OVERVIEW
-----------
Total Files: 45
Total Size: 125.67 MB
Oldest File: security-2023-11-15.log (61 days)
Newest File: combined-2024-01-15.log

📈 SIZE BY CATEGORY
------------------
error       : 25.34 MB
security    : 45.67 MB  
business    : 30.12 MB
performance : 15.89 MB
debug       : 8.65 MB

🧹 CLEANUP CANDIDATES
---------------------
Files ready for cleanup: 12
Space to be freed: 45.23 MB

🚨 ALERTS
---------
✅ No alerts

💡 RECOMMENDATIONS
------------------
• System is well optimized
• Consider external log aggregation for long-term storage
```

## 🔄 Automatic Cleanup

### **Schedule Cleanup on Server Start**
```typescript
import { logManager } from './utils/logManagement';

// In your server startup
const cleanupInterval = logManager.scheduleCleanup(24); // Every 24 hours

// Graceful shutdown
process.on('SIGTERM', () => {
  clearInterval(cleanupInterval);
});
```

### **Manual Cleanup Triggers**
- Server startup (check for old files)
- Daily scheduled task
- When total log size exceeds threshold
- Administrative command

## 🛡️ Security & Privacy

### **Data Protection**
- IP addresses truncated: `192.168.1.100` → `192.168***`
- Email addresses masked: `user@example.com` → `user***`
- Passwords/tokens never logged
- User agents truncated to prevent fingerprinting

### **Compliance**
- Security logs retained for 90 days
- Audit trails for administrative actions
- Structured logging for compliance reporting
- Automated cleanup prevents data accumulation

## 🚀 Performance Impact

### **Minimal Production Impact**
- **Log sampling** reduces I/O by 80-90%
- **Async writes** prevent request blocking
- **Intelligent caching** reduces redundant operations
- **Compression** saves 60-70% storage space

### **Development Benefits**
- **Full debugging** information available
- **Real-time monitoring** of application behavior
- **Performance insights** for optimization
- **Error tracking** for quick issue resolution

## 📝 Best Practices

### **✅ Do**
- Use appropriate log levels (debug/info/warn/error)
- Include relevant context (userId, IP, operation)
- Sample high-frequency routine events
- Monitor log file sizes regularly

### **❌ Don't**
- Log sensitive data (passwords, tokens, PII)
- Create excessive debug logs in production
- Ignore log cleanup and rotation
- Log the same event multiple times

## 🔧 Troubleshooting

### **Large Log Files**
```bash
# Check what's consuming space
npm run logs:stats

# Clean up old files
npm run logs:cleanup

# Identify heavy logging
npm run logs:report
```

### **Performance Issues**
- Check if sampling is enabled in production
- Verify Redis caching is working
- Monitor database query logging frequency
- Consider external log aggregation

### **Missing Logs**
- Verify log directory permissions
- Check disk space availability
- Ensure proper environment configuration
- Verify logger initialization

This enhanced logging system provides production-ready log management while maintaining development-friendly debugging capabilities. The intelligent sampling and automated cleanup ensure optimal performance without losing critical monitoring capabilities! 🎯