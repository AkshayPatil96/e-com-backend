"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const app_1 = __importDefault(require("./app"));
const config_1 = __importDefault(require("./config"));
const mongodb_1 = __importDefault(require("./config/database/mongodb"));
// import RedisConnection from "./config/database/redis";
const logger_1 = __importDefault(require("./utils/logger"));
const redis_1 = __importDefault(require("./config/database/redis"));
dotenv_1.default.config();
// Initialize MongoDB Connection
const mongoConnection = new mongodb_1.default(config_1.default.MONGO_URI);
if (config_1.default.MONGO_URI === undefined) {
    logger_1.default.log({
        level: "error",
        message: "MongoDB connection string is not provided in the environment variable",
    });
    process.exit(1);
}
else {
    mongoConnection.connect(() => {
        app_1.default.listen(app_1.default.get("port"), () => {
            logger_1.default.info(`Server running at http://localhost:${app_1.default.get("port")}`);
        });
    });
}
// Initialize Redis Connection
const redisConnection = new redis_1.default(config_1.default.REDIS_URI); // Assuming REDIS_URI is in your config
if (config_1.default.REDIS_URI === undefined) {
    logger_1.default.log({
        level: "error",
        message: "Redis connection string is not provided in the environment variable",
    });
    process.exit(1);
}
exports.redis = redisConnection.getClient();
// Close the Mongoose & redis connection, when receiving SIGINT
process.on("SIGINT", () => {
    logger_1.default.info("Shutting down server...");
    mongoConnection.close();
    redisConnection.close();
    process.exit(0);
});
