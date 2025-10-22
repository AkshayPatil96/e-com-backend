import { Router } from "express";
import { authorizeRoles, isAuthenticated } from "../../../middleware/auth";
import {
  canCreateBrand,
  canDeleteBrand,
  canEditBrand,
  canViewBrand,
} from "../../../middleware/permission";
import { RateLimiter } from "../../../middleware/rateLimiter";
import brandController from "../../controller/brand/brand.controller";

const router = Router();

// All brand routes require authentication
router.use(isAuthenticated);

// ================================
// BRAND STATISTICS
// ================================

/**
 * Get brand statistics for admin dashboard
 * @route GET /admin/brands/statistics
 * @access Admin with brands.canView permission
 * @rate 60 requests per hour
 */
router.get(
  "/statistics",
  authorizeRoles("admin", "superadmin"),
  canViewBrand,
  // RateLimiter.apiLimiter(60, 60 * 60 * 1000), // 60 requests per hour
  brandController.getBrandStatistics,
);

// ================================
// BRAND SEARCH
// ================================

/**
 * Search brands for autocomplete/dropdown
 * @route GET /admin/brands/search
 * @access Admin with brands.canView permission
 * @rate 120 requests per hour
 */
router.get(
  "/search",
  authorizeRoles("admin", "superadmin"),
  canViewBrand,
  // RateLimiter.apiLimiter(120, 60 * 60 * 1000), // 120 requests per hour
  brandController.searchBrands,
);

// ================================
// BULK ACTIONS
// ================================

/**
 * Bulk actions on brands (activate, deactivate, delete, restore, feature, unfeature)
 * @route POST /admin/brands/bulk-action
 * @access Admin with brands.canEdit permission
 * @rate 10 requests per hour
 */
router.post(
  "/bulk-action",
  authorizeRoles("admin", "superadmin"),
  canEditBrand, // Using canEditBrand as base, controller will validate specific actions
  // RateLimiter.authLimiter(10, 60 * 60 * 1000), // 10 requests per hour
  brandController.bulkAction,
);

// ================================
// BRAND CRUD OPERATIONS
// ================================

/**
 * Get all brands with filtering, sorting, and pagination
 * @route GET /admin/brands
 * @access Admin with brands.canView permission
 * @rate 100 requests per hour
 */
router.get(
  "/",
  authorizeRoles("admin", "superadmin"),
  canViewBrand,
  // RateLimiter.apiLimiter(100, 60 * 60 * 1000), // 100 requests per hour
  brandController.getAllBrandsAdmin,
);

/**
 * Create new brand
 * @route POST /admin/brands
 * @access Admin with brands.canCreate permission
 * @rate 30 requests per hour
 */
router.post(
  "/",
  authorizeRoles("admin", "superadmin"),
  canCreateBrand,
  // RateLimiter.authLimiter(30, 60 * 60 * 1000), // 30 requests per hour
  brandController.createBrand,
);

/**
 * Get single brand by ID
 * @route GET /admin/brands/:id
 * @access Admin with brands.canView permission
 * @rate 120 requests per hour
 */
router.get(
  "/:id",
  authorizeRoles("admin", "superadmin"),
  canViewBrand,
  // RateLimiter.apiLimiter(120, 60 * 60 * 1000), // 120 requests per hour
  brandController.getBrandByIdAdmin,
);

/**
 * Update brand
 * @route PUT /admin/brands/:id
 * @access Admin with brands.canEdit permission
 * @rate 60 requests per hour
 */
router.put(
  "/:id",
  authorizeRoles("admin", "superadmin"),
  canEditBrand,
  // RateLimiter.authLimiter(60, 60 * 60 * 1000), // 60 requests per hour
  brandController.updateBrand,
);

/**
 * Soft delete brand
 * @route DELETE /admin/brands/:id
 * @access Admin with brands.canDelete permission
 * @rate 30 requests per hour
 */
router.delete(
  "/:id",
  authorizeRoles("admin", "superadmin"),
  canDeleteBrand,
  // RateLimiter.authLimiter(30, 60 * 60 * 1000), // 30 requests per hour
  brandController.deleteBrand,
);

// ================================
// BRAND ASSET MANAGEMENT
// ================================

/**
 * Generate presigned URLs for brand logo and banner uploads
 * @route POST /admin/brands/upload-urls
 * @access Admin with brands.canCreate permission
 * @rate 30 requests per hour
 */
router.post(
  "/upload-urls",
  authorizeRoles("admin", "superadmin"),
  canCreateBrand, // Using create permission for upload operations
  // RateLimiter.authLimiter(30, 60 * 60 * 1000), // 30 requests per hour
  brandController.generateUploadUrls,
);

/**
 * Process uploaded images after presigned upload completion
 * @route POST /admin/brands/process-images
 * @access Admin with brands.canCreate permission
 * @rate 30 requests per hour
 */
router.post(
  "/process-images",
  authorizeRoles("admin", "superadmin"),
  canCreateBrand, // Using create permission for upload operations
  // RateLimiter.authLimiter(30, 60 * 60 * 1000), // 30 requests per hour
  brandController.processUploadedImages,
);

/**
 * Update brand logo using presigned URL or external URL
 * @route PUT /admin/brands/:id/logo
 * @access Admin with brands.canEdit permission
 * @rate 30 requests per hour
 */
router.put(
  "/:id/logo",
  authorizeRoles("admin", "superadmin"),
  canEditBrand,
  // RateLimiter.authLimiter(30, 60 * 60 * 1000), // 30 requests per hour
  brandController.updateBrandLogo,
);

/**
 * Update brand banner using presigned URL or external URL
 * @route PUT /admin/brands/:id/banner
 * @access Admin with brands.canEdit permission
 * @rate 30 requests per hour
 */
router.put(
  "/:id/banner",
  authorizeRoles("admin", "superadmin"),
  canEditBrand,
  // RateLimiter.authLimiter(30, 60 * 60 * 1000), // 30 requests per hour
  brandController.updateBrandBanner,
);

// ================================
// SPECIAL BRAND ACTIONS
// ================================

/**
 * Restore deleted brand
 * @route PUT /admin/brands/:id/restore
 * @access Admin with brands.canDelete permission
 * @rate 30 requests per hour
 */
router.put(
  "/:id/restore",
  authorizeRoles("admin", "superadmin"),
  canDeleteBrand, // Restore requires delete permission
  // RateLimiter.authLimiter(30, 60 * 60 * 1000), // 30 requests per hour
  brandController.restoreBrand,
);

/**
 * Toggle brand status (active/inactive)
 * @route PUT /admin/brands/:id/toggle-status
 * @access Admin with brands.canEdit permission
 * @rate 60 requests per hour
 */
router.put(
  "/:id/toggle-status",
  authorizeRoles("admin", "superadmin"),
  canEditBrand,
  // RateLimiter.authLimiter(60, 60 * 60 * 1000), // 60 requests per hour
  brandController.toggleBrandStatus,
);

export default router;
