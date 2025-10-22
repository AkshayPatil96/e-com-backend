import express from "express";
import { authorizeRoles, isAuthenticated } from "../../middleware/auth";
import { RateLimiter } from "../../middleware/rateLimiter";
import userController from "../controller/user";

const router = express.Router();

// All user routes require authentication
router.use(isAuthenticated);

// User profile management routes
router.get(
  "/profile",
  // RateLimiter.apiLimiter(30, 60 * 60 * 1000), // 30 profile views per hour
  userController.myProfile,
);

router.put(
  "/profile",
  // RateLimiter.apiLimiter(20, 60 * 60 * 1000), // 20 profile updates per hour
  userController.updateProfile,
);

// User account management routes
router.post(
  "/change-password",
  // RateLimiter.authLimiter(5, 60 * 60 * 1000), // 5 password changes per hour
  userController.changePassword,
);

router.post(
  "/deactivate",
  // RateLimiter.authLimiter(1, 24 * 60 * 60 * 1000), // 1 deactivation attempt per day
  userController.deactivateAccount,
);

// Admin/Manager routes for user management
router.get(
  "/all",
  authorizeRoles("admin", "manager"),
  // RateLimiter.apiLimiter(50, 60 * 60 * 1000), // 50 user list requests per hour
  userController.getAllUsers,
);



router.delete(
  "/:id",
  authorizeRoles("admin"),
  // RateLimiter.authLimiter(10, 60 * 60 * 1000), // 10 deletion attempts per hour
  userController.deleteUser,
);

export default router;
