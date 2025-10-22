"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../../middleware/auth");
const auth_2 = __importDefault(require("../controller/auth"));
const router = express_1.default.Router();
// Create admin account (only for superadmin or admin with permission)
router.post("/create-admin", auth_1.isAuthenticated, (0, auth_1.authorizeRoles)("superadmin", "admin"), auth_2.default.createAdminAccount);
router.post("/register", 
// RateLimiter.authLimiter(3, 15 * 60 * 1000), // 3 attempts per 15 minutes
auth_2.default.signup);
router.post("/activate-user", 
// RateLimiter.authLimiter(5, 15 * 60 * 1000), // 5 attempts per 15 minutes
auth_2.default.activateUserAccount);
router.post("/login", 
// RateLimiter.authLimiter(5, 15 * 60 * 1000), // 5 attempts per 15 minutes
auth_2.default.loginUser);
router.post("/logout", auth_1.isAuthenticated, auth_2.default.logoutUser);
router.get("/refresh-token", 
// RateLimiter.authLimiter(10, 15 * 60 * 1000), // 10 attempts per 15 minutes
auth_2.default.updateRefreshToken);
router.post("/forget-password", 
// RateLimiter.authLimiter(3, 60 * 60 * 1000), // 3 attempts per hour
auth_2.default.forgetPassword);
router.post("/reset-password/:resetToken", 
// RateLimiter.authLimiter(5, 15 * 60 * 1000), // 5 attempts per 15 minutes
auth_2.default.resetPassword);
router.post("/resend-activation", 
// RateLimiter.authLimiter(3, 60 * 60 * 1000), // 3 attempts per hour
auth_2.default.resendActivationEmail);
exports.default = router;
