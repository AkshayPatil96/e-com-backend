import { Router } from "express";
import { authorizeRoles, isAuthenticated } from "../../../middleware/auth";
import {
  canCreateSeller,
  canDeleteSeller,
  canEditSeller,
  canViewSeller,
} from "../../../middleware/permission";
import { RateLimiter } from "../../../middleware/rateLimiter";
import sellerController from "../../controller/seller/seller.controller";

const router = Router();

// All seller routes require authentication
router.use(isAuthenticated);

// ================================
// SELLER STATISTICS
// ================================

/**
 * Get seller statistics for admin dashboard
 * @route GET /admin/sellers/statistics
 * @access Admin with sellers.canView permission
 * @rate 60 requests per hour
 */
router.get(
  "/statistics",
  authorizeRoles("admin", "superadmin"),
  canViewSeller,
  // RateLimiter.apiLimiter(60, 60 * 60 * 1000), // 60 requests per hour
  sellerController.getSellerStatistics,
);

// ================================
// SELLER SEARCH
// ================================

/**
 * Search sellers for autocomplete/dropdown
 * @route GET /admin/sellers/search
 * @access Admin with sellers.canView permission
 * @rate 120 requests per hour
 */
router.get(
  "/search",
  authorizeRoles("admin", "superadmin"),
  canViewSeller,
  // RateLimiter.apiLimiter(120, 60 * 60 * 1000), // 120 requests per hour
  sellerController.searchSellers,
);

// ================================
// BULK ACTIONS
// ================================

/**
 * Bulk actions on sellers (activate, suspend, delete, restore, verify, unverify, feature, unfeature, approve, reject)
 * @route POST /admin/sellers/bulk-action
 * @access Admin with sellers.canEdit permission
 * @rate 10 requests per hour
 */
router.post(
  "/bulk-action",
  authorizeRoles("admin", "superadmin"),
  canEditSeller, // Using canEditSeller as base, controller will validate specific actions
  // RateLimiter.authLimiter(10, 60 * 60 * 1000), // 10 requests per hour
  sellerController.bulkAction,
);

// ================================
// SELLER CRUD OPERATIONS
// ================================

/**
 * Get all sellers with filtering, sorting, and pagination
 * @route GET /admin/sellers
 * @access Admin with sellers.canView permission
 * @rate 100 requests per hour
 */
router.get(
  "/",
  authorizeRoles("admin", "superadmin"),
  canViewSeller,
  // RateLimiter.apiLimiter(100, 60 * 60 * 1000), // 100 requests per hour
  sellerController.getAllSellersAdmin,
);

/**
 * Create new seller
 * @route POST /admin/sellers
 * @access Admin with sellers.canCreate permission
 * @rate 30 requests per hour
 */
router.post(
  "/",
  authorizeRoles("admin", "superadmin"),
  canCreateSeller,
  // RateLimiter.authLimiter(30, 60 * 60 * 1000), // 30 requests per hour
  sellerController.createSeller,
);

/**
 * Get single seller by ID
 * @route GET /admin/sellers/:id
 * @access Admin with sellers.canView permission
 * @rate 120 requests per hour
 */
router.get(
  "/:id",
  authorizeRoles("admin", "superadmin"),
  canViewSeller,
  // RateLimiter.apiLimiter(120, 60 * 60 * 1000), // 120 requests per hour
  sellerController.getSellerByIdAdmin,
);

/**
 * Update seller
 * @route PUT /admin/sellers/:id
 * @access Admin with sellers.canEdit permission
 * @rate 60 requests per hour
 */
router.put(
  "/:id",
  authorizeRoles("admin", "superadmin"),
  canEditSeller,
  // RateLimiter.authLimiter(60, 60 * 60 * 1000), // 60 requests per hour
  sellerController.updateSeller,
);

/**
 * Soft delete seller
 * @route DELETE /admin/sellers/:id
 * @access Admin with sellers.canDelete permission
 * @rate 30 requests per hour
 */
router.delete(
  "/:id",
  authorizeRoles("admin", "superadmin"),
  canDeleteSeller,
  // RateLimiter.authLimiter(30, 60 * 60 * 1000), // 30 requests per hour
  sellerController.deleteSeller,
);

// ================================
// SELLER ASSET MANAGEMENT
// ================================

/**
 * Generate presigned URLs for seller image and banner uploads
 * @route POST /admin/sellers/upload-urls
 * @access Admin with sellers.canCreate permission
 * @rate 30 requests per hour
 */
router.post(
  "/upload-urls",
  authorizeRoles("admin", "superadmin"),
  canCreateSeller, // Using create permission for upload operations
  // RateLimiter.authLimiter(30, 60 * 60 * 1000), // 30 requests per hour
  sellerController.generateUploadUrls,
);

/**
 * Process uploaded images after presigned upload completion
 * @route POST /admin/sellers/process-images
 * @access Admin with sellers.canCreate permission
 * @rate 30 requests per hour
 */
router.post(
  "/process-images",
  authorizeRoles("admin", "superadmin"),
  canCreateSeller, // Using create permission for upload operations
  // RateLimiter.authLimiter(30, 60 * 60 * 1000), // 30 requests per hour
  sellerController.processUploadedImages,
);

/**
 * Update seller image using presigned URL or external URL
 * @route PUT /admin/sellers/:id/image
 * @access Admin with sellers.canEdit permission
 * @rate 30 requests per hour
 */
router.put(
  "/:id/image",
  authorizeRoles("admin", "superadmin"),
  canEditSeller,
  // RateLimiter.authLimiter(30, 60 * 60 * 1000), // 30 requests per hour
  sellerController.updateSellerImage,
);

/**
 * Update seller banner using presigned URL or external URL
 * @route PUT /admin/sellers/:id/banner
 * @access Admin with sellers.canEdit permission
 * @rate 30 requests per hour
 */
router.put(
  "/:id/banner",
  authorizeRoles("admin", "superadmin"),
  canEditSeller,
  // RateLimiter.authLimiter(30, 60 * 60 * 1000), // 30 requests per hour
  sellerController.updateSellerBanner,
);

// ================================
// SPECIAL SELLER ACTIONS
// ================================

/**
 * Restore deleted seller
 * @route PUT /admin/sellers/:id/restore
 * @access Admin with sellers.canDelete permission
 * @rate 30 requests per hour
 */
router.put(
  "/:id/restore",
  authorizeRoles("admin", "superadmin"),
  canDeleteSeller, // Restore requires delete permission
  // RateLimiter.authLimiter(30, 60 * 60 * 1000), // 30 requests per hour
  sellerController.restoreSeller,
);

/**
 * Toggle seller status (active/inactive/suspended)
 * @route PUT /admin/sellers/:id/toggle-status
 * @access Admin with sellers.canEdit permission
 * @rate 60 requests per hour
 */
router.put(
  "/:id/toggle-status",
  authorizeRoles("admin", "superadmin"),
  canEditSeller,
  // RateLimiter.authLimiter(60, 60 * 60 * 1000), // 60 requests per hour
  sellerController.toggleSellerStatus,
);

export default router;
