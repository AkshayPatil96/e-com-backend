"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = __importDefault(require("../../utils/logger"));
/**
 * Mongoose Connection Helper
 * Connects to MongoDB reliably with retries
 */
class MongooseConnection {
    /**
     * @param mongoUrl MongoDB connection URL, e.g. mongodb://localhost:27017/db_name
     */
    constructor(mongoUrl) {
        this.onConnectedCallback = () => { };
        this.isConnectedBefore = false;
        this.connectionOptions = {};
        /**
         * `onConnected` callback for Mongoose
         */
        this.onConnected = () => {
            this.isConnectedBefore = true;
            logger_1.default.info("Successfully connected to MongoDB");
            this.onConnectedCallback();
        };
        /**
         * `onReconnected` callback for Mongoose
         */
        this.onReconnected = () => {
            logger_1.default.info("Reconnected to MongoDB");
        };
        /**
         * `onError` callback for Mongoose
         */
        this.onError = (error) => {
            logger_1.default.error(`Could not connect to MongoDB: ${error.message}`);
        };
        /**
         * `onDisconnected` callback for Mongoose
         */
        this.onDisconnected = () => {
            if (!this.isConnectedBefore) {
                logger_1.default.info("Retrying MongoDB connection in 2 seconds...");
                setTimeout(() => {
                    this.connect();
                }, 2000);
            }
        };
        this.mongoUrl = mongoUrl;
        // Bind connection events
        mongoose_1.default.connection.on("error", this.onError);
        mongoose_1.default.connection.on("disconnected", this.onDisconnected);
        mongoose_1.default.connection.on("connected", this.onConnected);
        mongoose_1.default.connection.on("reconnected", this.onReconnected);
        // Apply global plugins
        this.applyGlobalPlugins();
    }
    /**
     * Apply global plugins (e.g. adding timestamps to all schemas)
     */
    applyGlobalPlugins() {
        // Plugin to add timestamps globally
        mongoose_1.default.plugin((schema) => {
            schema.set("timestamps", true); // Automatically adds `createdAt` and `updatedAt` fields
        });
        // Other global settings (e.g., removing version key `__v` from objects)
        mongoose_1.default.set("toJSON", { versionKey: false, virtuals: true });
        mongoose_1.default.set("toObject", { versionKey: false, virtuals: true });
    }
    /**
     * Close connection to MongoDB
     */
    close() {
        logger_1.default.info("Closing the MongoDB connection");
        mongoose_1.default.connection.close();
    }
    /**
     * Attempt to connect to MongoDB
     * @param onConnectedCallback Function to be called when the connection is established
     */
    connect(onConnectedCallback) {
        if (onConnectedCallback) {
            this.onConnectedCallback = onConnectedCallback;
        }
        mongoose_1.default.connect(this.mongoUrl, this.connectionOptions).catch((err) => {
            logger_1.default.error(`Error while connecting to MongoDB: ${err.message}`);
        });
    }
}
exports.default = MongooseConnection;
