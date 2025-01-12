// redisConnection.ts
import Redis, { Redis as RedisType } from "ioredis";
import logger from "../../utils/logger";

class RedisConnection {
  private redis: RedisType;

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl);

    // Event listeners for Redis
    this.redis.on("connect", this.onConnect);
    this.redis.on("error", this.onError);
    this.redis.on("reconnecting", this.onReconnecting);
    this.redis.on("end", this.onEnd);
  }

  private onConnect = () => {
    logger.info("Connected to Redis");
  };

  private onError = (error: Error) => {
    logger.error(`Redis error: ${error.message}`);
  };

  private onReconnecting = () => {
    logger.info("Reconnecting to Redis...");
  };

  private onEnd = () => {
    logger.info("Redis connection closed");
  };

  public close() {
    logger.info("Closing the Redis connection");
    this.redis.disconnect();
  }

  public getClient() {
    return this.redis;
  }
}

export default RedisConnection;
