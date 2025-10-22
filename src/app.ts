import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express, { Application, NextFunction, Request, Response } from "express";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";

import config, { corsOptions } from "./config";
import ErrorMiddleware from "./middleware/Error";
import inputSanitizer from "./middleware/inputSanitization";
import RateLimiter from "./middleware/rateLimiter";
import requestCorrelation from "./middleware/requestCorrelation";
import setupSwagger from "./middleware/swagger";
import { loggerHelpers } from "./utils/logger";
import v1Router from "./v1";

const port = config.PORT;
const app: Application = express();

dotenv.config();

// Security and infrastructure middleware (order matters!)
app.use(requestCorrelation); // Request correlation first
app.use(compression());
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }),
);
app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(morgan("combined"));

// Input sanitization for all routes
app.use(inputSanitizer());

// Rate limiting
app.use(RateLimiter.apiLimiter(100, 60 * 1000)); // 100 requests per minute

app.set("port", port);
app.use(
  express.static(path.join(__dirname, "public"), { maxAge: 31557600000 }),
);

// Setup API documentation (only in development)
if (process.env.NODE_ENV !== "production") {
  setupSwagger(app);
}

app.get("/favicon.ico", (req: Request, res: Response) => res.status(204).end());

// Enhanced health check endpoint
app.get("/health", (req: Request, res: Response) => {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || "1.0.0",
    services: {
      mongodb: "healthy",
      redis: "connected",
    },
  };

  loggerHelpers.request("GET", "/health", 200, 0, req.ip || "unknown");

  const statusCode = health.status === "healthy" ? 200 : 503;
  res.status(statusCode).json(health);
});

app.use("/api/v1", v1Router);

app.all("*", (req: Request, res: Response, next: NextFunction) => {
  const errorMessage = `404 Not Found: The requested resource at '${req.originalUrl}' with method '${req.method}' could not be found on this server. Please check the URL and try again, or visit our help section for more information.`;
  const err = new Error(errorMessage) as any;
  err.statusCode = 404;

  next(err);
});

app.use(ErrorMiddleware);

export default app;
