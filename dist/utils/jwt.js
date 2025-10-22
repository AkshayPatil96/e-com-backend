"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendToken = exports.verifyRefreshToken = exports.verifyAccessToken = exports.signRefreshToken = exports.signAccessToken = exports.refreshTokenOptions = exports.accessTokenOptions = exports.refreshTokenExpire = exports.accessTokenExpire = exports.verifyActivationToken = exports.createActivationToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = __importDefault(require("../config"));
const server_1 = require("../server");
const logger_1 = require("./logger");
const createActivationToken = (user) => {
    const activationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const token = jsonwebtoken_1.default.sign({ user: { ...user }, activationCode }, config_1.default.JWT_SECRET, { expiresIn: "10m" });
    return { token, activationCode };
};
exports.createActivationToken = createActivationToken;
const verifyActivationToken = (token) => {
    return jsonwebtoken_1.default.verify(token, config_1.default.JWT_SECRET);
};
exports.verifyActivationToken = verifyActivationToken;
// 🔧 FIXED: Proper token expiration times
exports.accessTokenExpire = 15; // 15 minutes (not 5 days!)
exports.refreshTokenExpire = 7; // 7 days
// 🔧 FIXED: Consistent token options
exports.accessTokenOptions = {
    expires: new Date(Date.now() + exports.accessTokenExpire * 60 * 1000), // 15 minutes
    maxAge: exports.accessTokenExpire * 60 * 1000, // 15 minutes in milliseconds
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
};
exports.refreshTokenOptions = {
    expires: new Date(Date.now() + exports.refreshTokenExpire * 24 * 60 * 60 * 1000), // 7 days
    maxAge: exports.refreshTokenExpire * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
};
// 🔧 FIXED: Use standalone functions instead of user methods
const signAccessToken = (user) => {
    return jsonwebtoken_1.default.sign({ id: user._id }, config_1.default.JWT_ACCESS_SECRET, {
        expiresIn: `${exports.accessTokenExpire}m`, // 15m
    });
};
exports.signAccessToken = signAccessToken;
const signRefreshToken = (user) => {
    return jsonwebtoken_1.default.sign({ id: user._id }, config_1.default.JWT_REFRESH_SECRET, {
        expiresIn: `${exports.refreshTokenExpire}d`, // 7d
    });
};
exports.signRefreshToken = signRefreshToken;
const verifyAccessToken = (token) => {
    return jsonwebtoken_1.default.verify(token, config_1.default.JWT_ACCESS_SECRET);
};
exports.verifyAccessToken = verifyAccessToken;
const verifyRefreshToken = (token) => {
    return jsonwebtoken_1.default.verify(token, config_1.default.JWT_REFRESH_SECRET);
};
exports.verifyRefreshToken = verifyRefreshToken;
// 🚀 ENHANCED: Support both cookies AND headers
const sendToken = async (user, statusCode, res) => {
    try {
        // Generate tokens using standalone functions
        const accessToken = (0, exports.signAccessToken)(user);
        const refreshToken = (0, exports.signRefreshToken)(user);
        // Enhanced session data
        const sessionData = {
            ...user?.toObject(),
            sessionCreated: new Date(),
            accessTokenExpiry: new Date(Date.now() + exports.accessTokenExpire * 60 * 1000),
            refreshTokenExpiry: new Date(Date.now() + exports.refreshTokenExpire * 24 * 60 * 60 * 1000),
        };
        // Store in Redis with error handling
        try {
            if (server_1.redis && server_1.redis.status === "ready") {
                await server_1.redis.setex(user._id.toString(), exports.refreshTokenExpire * 24 * 60 * 60, // 7 days in seconds
                JSON.stringify(sessionData));
            }
        }
        catch (redisError) {
            logger_1.loggerHelpers.system("redis_session_error", {
                userId: user._id.toString(),
                error: redisError.message,
            });
            // Continue without failing the login
        }
        // remove password from user object
        if (typeof user === "object") {
            user = user.toObject(); // Convert Mongoose document to plain object if needed
            delete user.password;
        }
        // 🍪 Set cookies (for web browsers)
        res.cookie("accessToken", accessToken, exports.accessTokenOptions);
        res.cookie("refreshToken", refreshToken, exports.refreshTokenOptions);
        // 📋 Return tokens in response (for mobile/API clients)
        res.status(statusCode).json({
            success: true,
            message: "Authentication successful",
            data: user,
            // 🔑 Tokens for header-based auth
            tokens: {
                accessToken,
                refreshToken,
                tokenType: "Bearer",
                expiresIn: exports.accessTokenExpire * 60, // seconds
                refreshExpiresIn: exports.refreshTokenExpire * 24 * 60 * 60, // seconds
            },
            // 📱 Auth method instructions
            authMethods: {
                cookie: "Tokens set in httpOnly cookies automatically",
                header: "Use Authorization: Bearer <accessToken> header",
            },
        });
    }
    catch (error) {
        logger_1.loggerHelpers.error("token_generation_failed", error, {
            userId: user._id?.toString(),
        });
        throw error;
    }
};
exports.sendToken = sendToken;
