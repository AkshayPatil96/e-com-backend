"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.corsOptions = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const config = {
    PORT: parseInt(process.env.PORT, 10) || 3000,
    NODE_ENV: process.env.NODE_ENV ||
        "development",
    WHITELIST: process.env.CORS_ORIGIN?.split(",").map((origin) => origin.trim()) || [],
    MONGO_URI: process.env.MONGO_URI || "mongodb://localhost:27017/mydb",
    REDIS_URI: process.env.REDIS_URI || "redis://localhost:6379",
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "15m",
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES || "7d",
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_SERVICE: process.env.SMTP_SERVICE,
    SMTP_MAIL: process.env.SMTP_MAIL,
    SMTP_PASSWORD: process.env.SMTP_PASSWORD,
    // AWS_ACCESS_KEY: process.env.AWS_ACCESS_KEY as string,
    // AWS_SECRET_KEY: process.env.AWS_SECRET_KEY as string,
    // AWS_REGION: process.env.AWS_REGION as string,
    // AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME as string,
    // IMGURL: process.env.IMGURL as string,
    // REPLY_EMAIL: process.env.REPLY_EMAIL as string,
};
exports.default = config;
exports.corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or Postman)
        if (!origin || config.WHITELIST?.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error("CORS not allowed by this server"));
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true, // Allow credentials (like cookies) to be sent
};
