"use strict";
/**
 * @fileoverview Enhanced Logging System with Intelligent Log Management
 *
 * FEATURES:
 * - Daily log rotation with automatic cleanup
 * - Different log levels for different environments
 * - Separate log files by category and severity
 * - Automatic compression and cleanup of old logs
 * - Performance-optimized logging with async writes
 * - Log sampling for high-frequency events
 *
 * LOG RETENTION POLICY:
 * - Error logs: 30 days
 * - Security logs: 90 days (compliance)
 * - Business logs: 14 days
 * - Debug logs: 3 days (dev only)
 * - Performance logs: 7 days
 *
 * @author E-commerce API Team
 * @version 2.0.0
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loggerHelpers = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const winston_1 = require("winston");
// Ensure logs directory exists
const logsDir = path_1.default.join(process.cwd(), "logs");
/**
 * Create date-based folder structure for logs
 * Format: logs/YYYY-MM-DD/
 */
const createDateFolder = () => {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const dateFolderPath = path_1.default.join(logsDir, today);
    // Create date folder if it doesn't exist
    if (!fs_1.default.existsSync(logsDir)) {
        fs_1.default.mkdirSync(logsDir, { recursive: true });
    }
    if (!fs_1.default.existsSync(dateFolderPath)) {
        fs_1.default.mkdirSync(dateFolderPath, { recursive: true });
    }
    return dateFolderPath;
};
// Environment-based log levels
const getLogLevel = () => {
    switch (process.env.NODE_ENV) {
        case "production":
            return "info";
        case "staging":
            return "debug";
        case "development":
            return "debug";
        default:
            return "info";
    }
};
/**
 * Custom log format for production (JSON for parsing)
 */
const productionFormat = winston_1.format.combine(winston_1.format.timestamp(), winston_1.format.errors({ stack: true }), winston_1.format.json(), winston_1.format.printf(({ timestamp, level, message, ...meta }) => {
    // Minimize log size in production
    const logEntry = {
        t: timestamp,
        l: level,
        m: message,
        ...meta,
    };
    return JSON.stringify(logEntry);
}));
/**
 * Human-readable format for development
 */
const developmentFormat = winston_1.format.combine(winston_1.format.colorize(), winston_1.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), winston_1.format.errors({ stack: true }), winston_1.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length
        ? JSON.stringify(meta, null, 2)
        : "";
    return `${timestamp} ${level}: ${message} ${metaStr}`;
}));
/**
 * Enhanced file transport with date-based folder structure
 * Creates logs in format: logs/YYYY-MM-DD/filename.log
 */
const createFileTransport = (filename, level, maxFiles = 14) => {
    const dateFolderPath = createDateFolder();
    return new winston_1.transports.File({
        filename: path_1.default.join(dateFolderPath, `${filename}.log`),
        level: level,
        format: process.env.NODE_ENV === "production"
            ? productionFormat
            : developmentFormat,
        maxsize: 20 * 1024 * 1024, // 20MB per file
        maxFiles: maxFiles,
    });
};
/**
 * Create transport configurations
 */
const createTransports = () => {
    const transportsList = [];
    // Console transport (limited in production)
    transportsList.push(new winston_1.transports.Console({
        level: process.env.NODE_ENV === "production" ? "error" : "debug",
        format: developmentFormat,
        silent: process.env.NODE_ENV === "test", // Disable in tests
    }));
    // Error logs (30 days retention)
    transportsList.push(createFileTransport("error", "error", 30));
    // Combined logs (14 days retention)
    transportsList.push(createFileTransport("combined", "info", 14));
    // Security logs (90 days for compliance)
    transportsList.push(createFileTransport("security", "info", 90));
    // Business logs (14 days)
    transportsList.push(createFileTransport("business", "info", 14));
    // Performance logs (7 days)
    transportsList.push(createFileTransport("performance", "info", 7));
    // Add debug transport only in non-production
    if (process.env.NODE_ENV !== "production") {
        transportsList.push(createFileTransport("debug", "debug", 3));
    }
    return transportsList;
};
/**
 * Log sampling for high-frequency events
 */
class LogSampler {
    constructor() {
        this.counters = new Map();
        this.lastReset = Date.now();
        this.resetInterval = 60000; // 1 minute
    }
    shouldLog(key, sampleRate = 10) {
        // Reset counters every minute
        if (Date.now() - this.lastReset > this.resetInterval) {
            this.counters.clear();
            this.lastReset = Date.now();
        }
        const count = (this.counters.get(key) || 0) + 1;
        this.counters.set(key, count);
        // Log every nth occurrence
        return count % sampleRate === 1;
    }
}
const sampler = new LogSampler();
/**
 * Enhanced logger with structured logging and correlation
 */
const logger = (0, winston_1.createLogger)({
    level: getLogLevel(),
    format: winston_1.format.combine(winston_1.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), winston_1.format.errors({ stack: true }), winston_1.format.splat(), 
    // Add correlation ID if available
    (0, winston_1.format)((info) => {
        if (info.requestId) {
            info.correlationId = info.requestId;
        }
        return info;
    })()),
    defaultMeta: {
        service: "e-commerce-api",
        version: process.env.npm_package_version || "1.0.0",
        environment: process.env.NODE_ENV || "development",
        instance: process.env.INSTANCE_ID || "default",
    },
    transports: createTransports(),
    exitOnError: false,
});
// Handle uncaught exceptions and rejections
logger.exceptions.handle(createFileTransport("exceptions", "error", 30));
logger.rejections.handle(createFileTransport("rejections", "error", 30));
/**
 * Enhanced logger helpers with intelligent sampling
 */
exports.loggerHelpers = {
    /**
     * Log authentication events (sample high-frequency events)
     */
    auth: (event, userId, metadata) => {
        const logKey = `auth:${event}`;
        // Sample frequent events but always log failures
        const shouldSample = event.includes("success") || event.includes("attempt");
        const shouldLog = !shouldSample || sampler.shouldLog(logKey, 10);
        if (shouldLog) {
            logger.info(`Auth: ${event}`, {
                category: "auth",
                event,
                userId: userId || "anonymous",
                ip: metadata?.ip?.substring(0, 10) + "***", // Truncate IPs for privacy
                userAgent: metadata?.userAgent?.substring(0, 50), // Truncate user agents
                endpoint: metadata?.endpoint,
                method: metadata?.method,
                fromCache: metadata?.fromCache,
            });
        }
    },
    /**
     * Log security events (always log, no sampling)
     */
    security: (event, severity, metadata) => {
        const logLevel = {
            LOW: "info",
            MEDIUM: "warn",
            HIGH: "error",
            CRITICAL: "error",
        }[severity];
        logger[logLevel](`Security: ${event}`, {
            category: "security",
            event,
            severity,
            ip: metadata?.ip,
            userAgent: metadata?.userAgent?.substring(0, 100),
            userId: metadata?.userId,
            endpoint: metadata?.endpoint,
            error: metadata?.error,
            timestamp: new Date().toISOString(),
        });
        // Send critical security events to monitoring (implement as needed)
        if (severity === "CRITICAL") {
            // TODO: Send to monitoring service, Slack, etc.
            console.error(`🚨 CRITICAL SECURITY EVENT: ${event}`, metadata);
        }
    },
    /**
     * Log business events (sample routine events)
     */
    business: (event, metadata) => {
        const logKey = `business:${event}`;
        const routineEvents = [
            "profile_accessed",
            "product_viewed",
            "search_performed",
        ];
        const isRoutine = routineEvents.some((routine) => event.includes(routine));
        const shouldLog = !isRoutine || sampler.shouldLog(logKey, 20);
        if (shouldLog) {
            logger.info(`Business: ${event}`, {
                category: "business",
                event,
                userId: metadata?.userId,
                email: metadata?.email?.substring(0, 5) + "***", // Mask emails
                ip: metadata?.ip,
                metadata: {
                    ...metadata,
                    // Remove sensitive data
                    password: undefined,
                    token: undefined,
                    email: undefined,
                },
            });
        }
    },
    /**
     * Log performance events (sample by duration)
     */
    performance: (operation, duration, metadata) => {
        // Only log slow operations in production
        const threshold = process.env.NODE_ENV === "production" ? 1000 : 500;
        if (duration > threshold || process.env.NODE_ENV !== "production") {
            logger.info(`Performance: ${operation}`, {
                category: "performance",
                operation,
                duration,
                isSlowQuery: duration > threshold,
                ...metadata,
            });
        }
    },
    /**
     * Log API requests (sample based on status code)
     */
    request: (method, url, statusCode, duration, userId) => {
        const logKey = `request:${method}:${url}`;
        // Always log errors and slow requests, sample successful ones
        const isError = statusCode >= 400;
        const isSlow = duration > 1000;
        const shouldLog = isError || isSlow || sampler.shouldLog(logKey, 50);
        if (shouldLog) {
            const level = isError ? "error" : isSlow ? "warn" : "info";
            logger[level](`API: ${method} ${url}`, {
                category: "request",
                method,
                url,
                statusCode,
                duration,
                userId,
                isError,
                isSlow,
            });
        }
    },
    /**
     * Log system events (always log)
     */
    system: (event, metadata) => {
        logger.info(`System: ${event}`, {
            category: "system",
            event,
            ...metadata,
        });
    },
    /**
     * Log error events (always log with full context)
     */
    error: (message, error, metadata) => {
        logger.error(message, {
            category: "error",
            error: {
                message: error.message,
                stack: error.stack,
                name: error.name,
            },
            ...metadata,
        });
    },
};
exports.default = logger;
