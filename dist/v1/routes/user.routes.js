"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../../middleware/auth");
const user_1 = __importDefault(require("../controller/user"));
const router = express_1.default.Router();
// All user routes require authentication
router.use(auth_1.isAuthenticated);
// User profile management routes
router.get("/profile", 
// RateLimiter.apiLimiter(30, 60 * 60 * 1000), // 30 profile views per hour
user_1.default.myProfile);
router.put("/profile", 
// RateLimiter.apiLimiter(20, 60 * 60 * 1000), // 20 profile updates per hour
user_1.default.updateProfile);
// User account management routes
router.post("/change-password", 
// RateLimiter.authLimiter(5, 60 * 60 * 1000), // 5 password changes per hour
user_1.default.changePassword);
router.post("/deactivate", 
// RateLimiter.authLimiter(1, 24 * 60 * 60 * 1000), // 1 deactivation attempt per day
user_1.default.deactivateAccount);
// Admin/Manager routes for user management
router.get("/all", (0, auth_1.authorizeRoles)("admin", "manager"), 
// RateLimiter.apiLimiter(50, 60 * 60 * 1000), // 50 user list requests per hour
user_1.default.getAllUsers);
router.delete("/:id", (0, auth_1.authorizeRoles)("admin"), 
// RateLimiter.authLimiter(10, 60 * 60 * 1000), // 10 deletion attempts per hour
user_1.default.deleteUser);
exports.default = router;
