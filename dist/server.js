"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const app_1 = __importDefault(require("./app"));
const config_1 = __importDefault(require("./config"));
const mongodb_1 = __importDefault(require("./config/database/mongodb"));
const redis_1 = __importDefault(require("./config/database/redis"));
const logger_1 = __importStar(require("./utils/logger"));
dotenv_1.default.config();
// Global error handlers for uncaught exceptions
process.on("uncaughtException", (error) => {
    logger_1.default.error("Uncaught Exception:", error);
    logger_1.loggerHelpers.security("uncaught_exception", "CRITICAL", {
        error: error.message,
        stack: error.stack,
    });
    process.exit(1);
});
process.on("unhandledRejection", (reason, promise) => {
    logger_1.default.error("Unhandled Rejection at:", promise, "reason:", reason);
    logger_1.loggerHelpers.security("unhandled_rejection", "CRITICAL", {
        reason,
        promise,
    });
    process.exit(1);
});
// Initialize MongoDB Connection
const mongoConnection = new mongodb_1.default(config_1.default.MONGO_URI);
if (config_1.default.MONGO_URI === undefined) {
    logger_1.default.error("MongoDB connection string is not provided in the environment variable");
    process.exit(1);
}
else {
    mongoConnection.connect(() => {
        // Start the server after successful MongoDB connection
        server = app_1.default.listen(app_1.default.get("port"), () => {
            logger_1.default.info(`🚀 Server running at http://localhost:${app_1.default.get("port")}`);
            logger_1.default.info(`📊 Health check available at http://localhost:${app_1.default.get("port")}/health`);
            if (process.env.NODE_ENV !== "production") {
                logger_1.default.info(`📚 API Documentation available at http://localhost:${app_1.default.get("port")}/api-docs`);
            }
            logger_1.loggerHelpers.business("server_started", {
                port: app_1.default.get("port"),
                redis: "connected",
                mongodb: "connected",
            });
        });
        // Handle server errors
        server.on("error", (error) => {
            if (error.syscall !== "listen") {
                throw error;
            }
            const port = app_1.default.get("port");
            const bind = typeof port === "string" ? "Pipe " + port : "Port " + port;
            switch (error.code) {
                case "EACCES":
                    logger_1.default.error(bind + " requires elevated privileges");
                    process.exit(1);
                case "EADDRINUSE":
                    logger_1.default.error(bind + " is already in use");
                    process.exit(1);
                default:
                    throw error;
            }
        });
    });
}
// Initialize Redis Connection
const redisConnection = new redis_1.default(config_1.default.REDIS_URI);
if (config_1.default.REDIS_URI === undefined) {
    logger_1.default.log({
        level: "error",
        message: "Redis connection string is not provided in the environment variable",
    });
    process.exit(1);
}
exports.redis = redisConnection.getClient();
// Server instance reference for graceful shutdown
let server;
// Graceful shutdown function
const gracefulShutdown = async (signal) => {
    logger_1.default.info(`${signal} received. Starting graceful shutdown...`);
    logger_1.loggerHelpers.business("server_shutdown_initiated", { signal });
    // Close server first (stop accepting new connections)
    if (server) {
        server.close((err) => {
            if (err) {
                logger_1.default.error("Error during server close:", err);
            }
            else {
                logger_1.default.info("Server closed successfully");
            }
        });
    }
    // Close database connections
    const shutdownPromises = [];
    // MongoDB cleanup
    shutdownPromises.push(new Promise((resolve) => {
        try {
            mongoConnection.close();
            logger_1.default.info("MongoDB connection closed");
        }
        catch (error) {
            logger_1.default.warn("Error closing MongoDB connection:", error);
        }
        resolve();
    }));
    // Redis cleanup
    shutdownPromises.push(new Promise((resolve) => {
        try {
            redisConnection.close();
            logger_1.default.info("Redis connection closed");
        }
        catch (error) {
            logger_1.default.warn("Error closing Redis connection:", error);
        }
        resolve();
    }));
    try {
        await Promise.all(shutdownPromises);
        logger_1.default.info("All connections closed. Exiting process.");
        logger_1.loggerHelpers.business("server_shutdown_completed", { signal });
        process.exit(0);
    }
    catch (error) {
        logger_1.default.error("Error during graceful shutdown:", error);
        process.exit(1);
    }
};
// Handle shutdown signals
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
// Handle PM2 graceful shutdown
process.on("message", (message) => {
    if (message === "shutdown") {
        gracefulShutdown("PM2_SHUTDOWN");
    }
});
