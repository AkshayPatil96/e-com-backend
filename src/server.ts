import dotenv from "dotenv";
import app from "./app";
import config from "./config";
import MongooseConnection from "./config/database/mongodb";
import RedisConnection from "./config/database/redis";
import logger, { loggerHelpers } from "./utils/logger";

dotenv.config();

// Global error handlers for uncaught exceptions
process.on("uncaughtException", (error: Error) => {
  logger.error("Uncaught Exception:", error);
  loggerHelpers.security("uncaught_exception", "CRITICAL", {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

process.on("unhandledRejection", (reason: any, promise: Promise<any>) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  loggerHelpers.security("unhandled_rejection", "CRITICAL", {
    reason,
    promise,
  });
  process.exit(1);
});

// Initialize MongoDB Connection
const mongoConnection = new MongooseConnection(config.MONGO_URI);

if (config.MONGO_URI === undefined) {
  logger.error(
    "MongoDB connection string is not provided in the environment variable",
  );
  process.exit(1);
} else {
  mongoConnection.connect(() => {
    // Start the server after successful MongoDB connection
    server = app.listen(app.get("port"), () => {
      logger.info(`🚀 Server running at http://localhost:${app.get("port")}`);
      logger.info(
        `📊 Health check available at http://localhost:${app.get("port")}/health`,
      );

      if (process.env.NODE_ENV !== "production") {
        logger.info(
          `📚 API Documentation available at http://localhost:${app.get("port")}/api-docs`,
        );
      }

      loggerHelpers.business("server_started", {
        port: app.get("port"),
        redis: "connected",
        mongodb: "connected",
      });
    });

    // Handle server errors
    server.on("error", (error: any) => {
      if (error.syscall !== "listen") {
        throw error;
      }

      const port = app.get("port");
      const bind = typeof port === "string" ? "Pipe " + port : "Port " + port;

      switch (error.code) {
        case "EACCES":
          logger.error(bind + " requires elevated privileges");
          process.exit(1);
        case "EADDRINUSE":
          logger.error(bind + " is already in use");
          process.exit(1);
        default:
          throw error;
      }
    });
  });
}

// Initialize Redis Connection
const redisConnection = new RedisConnection(config.REDIS_URI);
if (config.REDIS_URI === undefined) {
  logger.log({
    level: "error",
    message:
      "Redis connection string is not provided in the environment variable",
  });
  process.exit(1);
}
export const redis = redisConnection.getClient();

// Server instance reference for graceful shutdown
let server: any;

// Graceful shutdown function
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  loggerHelpers.business("server_shutdown_initiated", { signal });

  // Close server first (stop accepting new connections)
  if (server) {
    server.close((err: any) => {
      if (err) {
        logger.error("Error during server close:", err);
      } else {
        logger.info("Server closed successfully");
      }
    });
  }

  // Close database connections
  const shutdownPromises = [];

  // MongoDB cleanup
  shutdownPromises.push(
    new Promise<void>((resolve) => {
      try {
        mongoConnection.close();
        logger.info("MongoDB connection closed");
      } catch (error) {
        logger.warn("Error closing MongoDB connection:", error);
      }
      resolve();
    }),
  );

  // Redis cleanup
  shutdownPromises.push(
    new Promise<void>((resolve) => {
      try {
        redisConnection.close();
        logger.info("Redis connection closed");
      } catch (error) {
        logger.warn("Error closing Redis connection:", error);
      }
      resolve();
    }),
  );

  try {
    await Promise.all(shutdownPromises);
    logger.info("All connections closed. Exiting process.");
    loggerHelpers.business("server_shutdown_completed", { signal });
    process.exit(0);
  } catch (error) {
    logger.error("Error during graceful shutdown:", error);
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
