"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimiter = void 0;
const express_rate_limit_1 = require("express-rate-limit");
exports.rateLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 60 * 1000, // 60 seconds
    limit: 100, // limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again after 15 minutes",
    legacyHeaders: true,
    standardHeaders: true,
    // skip: (req) => {
    //   return req.originalUrl.includes("/api/v1");
    // },
});
