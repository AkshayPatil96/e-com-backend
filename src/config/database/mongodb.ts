import mongoose, { ConnectOptions, Schema } from "mongoose";
import logger from "../../utils/logger";

/**
 * Mongoose Connection Helper
 * Connects to MongoDB reliably with retries
 */
export default class MongooseConnection {
  private mongoUrl: string;
  private onConnectedCallback: Function = () => {};
  private isConnectedBefore: boolean = false;
  private connectionOptions: ConnectOptions = {};

  /**
   * @param mongoUrl MongoDB connection URL, e.g. mongodb://localhost:27017/db_name
   */
  constructor(mongoUrl: string) {
    this.mongoUrl = mongoUrl;

    // Bind connection events
    mongoose.connection.on("error", this.onError);
    mongoose.connection.on("disconnected", this.onDisconnected);
    mongoose.connection.on("connected", this.onConnected);
    mongoose.connection.on("reconnected", this.onReconnected);

    // Apply global plugins
    this.applyGlobalPlugins();
  }

  /**
   * Apply global plugins (e.g. adding timestamps to all schemas)
   */
  private applyGlobalPlugins() {
    // Plugin to add timestamps globally
    mongoose.plugin((schema: Schema) => {
      schema.set("timestamps", true); // Automatically adds `createdAt` and `updatedAt` fields
    });

    // Other global settings (e.g., removing version key `__v` from objects)
    mongoose.set("toJSON", { versionKey: false, virtuals: true });
    mongoose.set("toObject", { versionKey: false, virtuals: true });
  }

  /**
   * Close connection to MongoDB
   */
  public close() {
    logger.info("Closing the MongoDB connection");
    mongoose.connection.close();
  }

  /**
   * Attempt to connect to MongoDB
   * @param onConnectedCallback Function to be called when the connection is established
   */
  public connect(onConnectedCallback?: Function) {
    if (onConnectedCallback) {
      this.onConnectedCallback = onConnectedCallback;
    }
    mongoose.connect(this.mongoUrl, this.connectionOptions).catch((err) => {
      logger.error(`Error while connecting to MongoDB: ${err.message}`);
    });
  }

  /**
   * `onConnected` callback for Mongoose
   */
  private onConnected = () => {
    this.isConnectedBefore = true;
    logger.info("Successfully connected to MongoDB");
    this.onConnectedCallback();
  };

  /**
   * `onReconnected` callback for Mongoose
   */
  private onReconnected = () => {
    logger.info("Reconnected to MongoDB");
  };

  /**
   * `onError` callback for Mongoose
   */
  private onError = (error: Error) => {
    logger.error(`Could not connect to MongoDB: ${error.message}`);
  };

  /**
   * `onDisconnected` callback for Mongoose
   */
  private onDisconnected = () => {
    if (!this.isConnectedBefore) {
      logger.info("Retrying MongoDB connection in 2 seconds...");
      setTimeout(() => {
        this.connect();
      }, 2000);
    }
  };
}
