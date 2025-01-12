"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = require("winston");
const logTransports = [
    new winston_1.transports.File({
        level: "error",
        // filename: "./logs/error.log",
        // create different log file for each day
        filename: `./logs/error-${new Date().toISOString().split("T")[0]}.log`,
        format: winston_1.format.json({
            replacer: (key, value) => {
                if (key === "error") {
                    return {
                        message: value.message,
                        stack: value.stack,
                    };
                }
                return value;
            },
        }),
    }),
    new winston_1.transports.Console({
        level: "debug",
        format: winston_1.format.combine(winston_1.format.colorize(), winston_1.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), winston_1.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)),
    }),
];
const logger = (0, winston_1.createLogger)({
    transports: logTransports,
    format: winston_1.format.combine(winston_1.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), winston_1.format.errors({ stack: true }), winston_1.format.splat(), winston_1.format.json()),
    defaultMeta: { service: "api" },
});
exports.default = logger;
