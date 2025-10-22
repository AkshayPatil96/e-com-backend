"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const compression_1 = __importDefault(require("compression"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const path_1 = __importDefault(require("path"));
const config_1 = __importStar(require("./config"));
const Error_1 = __importDefault(require("./middleware/Error"));
const inputSanitization_1 = __importDefault(require("./middleware/inputSanitization"));
const rateLimiter_1 = __importDefault(require("./middleware/rateLimiter"));
const requestCorrelation_1 = __importDefault(require("./middleware/requestCorrelation"));
const swagger_1 = __importDefault(require("./middleware/swagger"));
const logger_1 = require("./utils/logger");
const v1_1 = __importDefault(require("./v1"));
const port = config_1.default.PORT;
const app = (0, express_1.default)();
dotenv_1.default.config();
// Security and infrastructure middleware (order matters!)
app.use(requestCorrelation_1.default); // Request correlation first
app.use((0, compression_1.default)());
app.use((0, helmet_1.default)({
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
}));
app.use((0, cors_1.default)(config_1.corsOptions));
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "10mb" }));
app.use((0, cookie_parser_1.default)());
app.use((0, morgan_1.default)("combined"));
// Input sanitization for all routes
app.use((0, inputSanitization_1.default)());
// Rate limiting
app.use(rateLimiter_1.default.apiLimiter(100, 60 * 1000)); // 100 requests per minute
app.set("port", port);
app.use(express_1.default.static(path_1.default.join(__dirname, "public"), { maxAge: 31557600000 }));
// Setup API documentation (only in development)
if (process.env.NODE_ENV !== "production") {
    (0, swagger_1.default)(app);
}
app.get("/favicon.ico", (req, res) => res.status(204).end());
// Enhanced health check endpoint
app.get("/health", (req, res) => {
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
    logger_1.loggerHelpers.request("GET", "/health", 200, 0, req.ip || "unknown");
    const statusCode = health.status === "healthy" ? 200 : 503;
    res.status(statusCode).json(health);
});
app.use("/api/v1", v1_1.default);
app.all("*", (req, res, next) => {
    const errorMessage = `404 Not Found: The requested resource at '${req.originalUrl}' with method '${req.method}' could not be found on this server. Please check the URL and try again, or visit our help section for more information.`;
    const err = new Error(errorMessage);
    err.statusCode = 404;
    next(err);
});
app.use(Error_1.default);
exports.default = app;
