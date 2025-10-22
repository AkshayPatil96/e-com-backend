import express from "express";
import { authorizeRoles, isAuthenticated } from "../../middleware/auth";
import { RateLimiter } from "../../middleware/rateLimiter";
import authController from "../controller/auth";

const router = express.Router();
// Create admin account (only for superadmin or admin with permission)
router.post(
  "/create-admin",
  isAuthenticated,
  authorizeRoles("superadmin", "admin"),
  authController.createAdminAccount,
);

router.post(
  "/register",
  // RateLimiter.authLimiter(3, 15 * 60 * 1000), // 3 attempts per 15 minutes
  authController.signup,
);

router.post(
  "/activate-user",
  // RateLimiter.authLimiter(5, 15 * 60 * 1000), // 5 attempts per 15 minutes
  authController.activateUserAccount,
);

router.post(
  "/login",
  // RateLimiter.authLimiter(5, 15 * 60 * 1000), // 5 attempts per 15 minutes
  authController.loginUser,
);

router.post("/logout", isAuthenticated, authController.logoutUser);

router.get(
  "/refresh-token",
  // RateLimiter.authLimiter(10, 15 * 60 * 1000), // 10 attempts per 15 minutes
  authController.updateRefreshToken,
);

router.post(
  "/forget-password",
  // RateLimiter.authLimiter(3, 60 * 60 * 1000), // 3 attempts per hour
  authController.forgetPassword,
);

router.post(
  "/reset-password/:resetToken",
  // RateLimiter.authLimiter(5, 15 * 60 * 1000), // 5 attempts per 15 minutes
  authController.resetPassword,
);

router.post(
  "/resend-activation",
  // RateLimiter.authLimiter(3, 60 * 60 * 1000), // 3 attempts per hour
  authController.resendActivationEmail,
);

export default router;
