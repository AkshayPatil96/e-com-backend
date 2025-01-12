"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// redisConnection.ts
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = __importDefault(require("../../utils/logger"));
class RedisConnection {
    constructor(redisUrl) {
        this.onConnect = () => {
            logger_1.default.info("Connected to Redis");
        };
        this.onError = (error) => {
            logger_1.default.error(`Redis error: ${error.message}`);
        };
        this.onReconnecting = () => {
            logger_1.default.info("Reconnecting to Redis...");
        };
        this.onEnd = () => {
            logger_1.default.info("Redis connection closed");
        };
        this.redis = new ioredis_1.default(redisUrl);
        // Event listeners for Redis
        this.redis.on("connect", this.onConnect);
        this.redis.on("error", this.onError);
        this.redis.on("reconnecting", this.onReconnecting);
        this.redis.on("end", this.onEnd);
    }
    close() {
        logger_1.default.info("Closing the Redis connection");
        this.redis.disconnect();
    }
    getClient() {
        return this.redis;
    }
}
exports.default = RedisConnection;
