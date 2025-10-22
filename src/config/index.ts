import dotenv from "dotenv";
dotenv.config();

type ENV = {
  PORT: number;
  NODE_ENV: "development" | "production" | "test";
  WHITELIST: string[];
  MONGO_URI: string;
  REDIS_URI: string;
  FRONTEND_URL: string;

  JWT_SECRET: string;
  JWT_ACCESS_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRES_IN: string;

  SMTP_HOST: string;
  SMTP_PORT: string;
  SMTP_SERVICE: string;
  SMTP_MAIL: string;
  SMTP_PASSWORD: string;

  // AWS Configuration
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_REGION: string;
  AWS_S3_BUCKET_NAME: string;
  AWS_CLOUDFRONT_URL?: string;
};

const config: ENV = {
  PORT: parseInt(process.env.PORT as string, 10) || 3000,
  NODE_ENV:
    (process.env.NODE_ENV as "development" | "production" | "test") ||
    "development",
  WHITELIST:
    process.env.WHITELIST?.split(",").map((origin) => origin.trim()) || [],
  MONGO_URI: process.env.MONGO_URI as string,
  REDIS_URI: process.env.REDIS_URI as string,
  FRONTEND_URL: process.env.FRONTEND_URL as string,

  JWT_SECRET: process.env.JWT_SECRET as string,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET as string,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN as string,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET as string,
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN as string,

  SMTP_HOST: process.env.SMTP_HOST as string,
  SMTP_PORT: process.env.SMTP_PORT as unknown as string,
  SMTP_SERVICE: process.env.SMTP_SERVICE as string,
  SMTP_MAIL: process.env.SMTP_MAIL as string,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD as string,

  // AWS Configuration
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID as string,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY as string,
  AWS_REGION: process.env.AWS_REGION as string,
  AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME as string,
  AWS_CLOUDFRONT_URL: process.env.AWS_CLOUDFRONT_URL,
};

export default config;

export const corsOptions = {
  origin: (origin: string | undefined, callback: Function) => {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin || config.WHITELIST?.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS not allowed by this server"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true, // Allow credentials (like cookies) to be sent
};
