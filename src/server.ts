import dotenv from "dotenv";
import app from "./app";
import config from "./config";
import MongooseConnection from "./config/database/mongodb";
// import RedisConnection from "./config/database/redis";
import logger from "./utils/logger";
import RedisConnection from "./config/database/redis";

dotenv.config();

// Initialize MongoDB Connection
const mongoConnection = new MongooseConnection(config.MONGO_URI);

if (config.MONGO_URI === undefined) {
  logger.log({
    level: "error",
    message:
      "MongoDB connection string is not provided in the environment variable",
  });
  process.exit(1);
} else {
  mongoConnection.connect(() => {
    app.listen(app.get("port"), () => {
      logger.info(`Server running at http://localhost:${app.get("port")}`);
    });
  });
}

// Initialize Redis Connection
const redisConnection = new RedisConnection(config.REDIS_URI); // Assuming REDIS_URI is in your config
if (config.REDIS_URI === undefined) {
  logger.log({
    level: "error",
    message:
      "Redis connection string is not provided in the environment variable",
  });
  process.exit(1);
}
export const redis = redisConnection.getClient();

// Close the Mongoose & redis connection, when receiving SIGINT
process.on("SIGINT", () => {
  logger.info("Shutting down server...");
  mongoConnection.close();
  redisConnection.close();
  process.exit(0);
});
