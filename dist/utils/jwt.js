"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendToken = exports.verifyRefreshToken = exports.verifyAccessToken = exports.signRefreshToken = exports.signAccessToken = exports.refreshTokenOptions = exports.accessTokenOptions = exports.refreshTokenExpire = exports.accessTokenExpire = exports.verifyActivationToken = exports.createActivationToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = __importDefault(require("../config"));
const server_1 = require("../server");
const createActivationToken = (user) => {
    const activationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const token = jsonwebtoken_1.default.sign({ user: { ...user }, activationCode }, config_1.default.JWT_SECRET, { expiresIn: "5m" });
    return { token, activationCode };
};
exports.createActivationToken = createActivationToken;
const verifyActivationToken = (token) => {
    const decoded = jsonwebtoken_1.default.verify(token, config_1.default.JWT_SECRET);
    return decoded;
};
exports.verifyActivationToken = verifyActivationToken;
exports.accessTokenExpire = parseInt("5", 10);
exports.refreshTokenExpire = parseInt("7", 10);
exports.accessTokenOptions = {
    expires: new Date(Date.now() + exports.accessTokenExpire * 24 * 60 * 60 * 1000),
    maxAge: exports.accessTokenExpire * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "lax",
};
exports.refreshTokenOptions = {
    expires: new Date(Date.now() + exports.refreshTokenExpire * 24 * 60 * 60 * 1000),
    maxAge: exports.refreshTokenExpire * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "lax",
};
const signAccessToken = (user) => {
    return jsonwebtoken_1.default.sign({ id: user._id }, config_1.default.JWT_ACCESS_SECRET, {
        expiresIn: config_1.default.JWT_EXPIRES_IN,
    });
};
exports.signAccessToken = signAccessToken;
const signRefreshToken = (user) => {
    return jsonwebtoken_1.default.sign({ id: user._id }, config_1.default.JWT_REFRESH_SECRET, {
        expiresIn: config_1.default.JWT_REFRESH_EXPIRES_IN,
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
const sendToken = (user, statusCode, res) => {
    const accessToken = user.signAccessToken();
    const refreshToken = user.signRefreshToken();
    // upload session to redis
    server_1.redis.set(user._id.toString(), JSON.stringify(user));
    if (process.env.NODE_ENV === "production") {
        exports.accessTokenOptions.secure = true;
        exports.refreshTokenOptions.secure = true;
    }
    res.cookie("accessToken", accessToken, exports.accessTokenOptions);
    res.cookie("refreshToken", refreshToken, exports.refreshTokenOptions);
    res.status(statusCode).json({
        success: true,
        data: user,
        accessToken,
        refreshToken,
    });
};
exports.sendToken = sendToken;
