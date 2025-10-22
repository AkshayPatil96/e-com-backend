import express from "express";
import { authorizeRoles, isAuthenticated } from "../../../middleware/auth";
import {
  canArchiveCategory,
  canCreateCategory,
  canDeleteCategory,
  canEditCategory,
  canRestoreCategory,
  canViewCategory,
} from "../../../middleware/permission";
import { RateLimiter } from "../../../middleware/rateLimiter";
import categoryController from "../../controller/category/category";

const router = express.Router();

// All category routes require authentication
router.use(isAuthenticated);

// Category management routes for admin panel

/**
 * @route   GET /api/v1/admin/categories
 * @desc    Get all categories with comprehensive filtering, sorting, and pagination
 * @query   page?, limit?, search?, status?, featured?, parent?, level?, isDeleted?, sortBy?, sortOrder?, showInMenu?, showInHomepage?
 * @access  Admin with categories.canView permission or Superadmin
 */
router.get(
  "/",
  authorizeRoles("superadmin", "admin"),
  canViewCategory,
  // RateLimiter.apiLimiter(200, 60 * 60 * 1000), // 200 requests per hour
  categoryController.getAllCategoriesAdmin,
);

/**
 * @route   GET /api/v1/admin/categories/statistics
 * @desc    Get category statistics for admin dashboard
 * @access  Admin with categories.canView permission or Superadmin
 */
router.get(
  "/statistics",
  authorizeRoles("superadmin", "admin"),
  canViewCategory,
  // RateLimiter.apiLimiter(100, 60 * 60 * 1000), // 100 requests per hour
  categoryController.getCategoryStatistics,
);

/**
 * @route   GET /api/v1/admin/categories/hierarchy
 * @desc    Get category hierarchy tree for admin
 * @access  Admin with categories.canView permission or Superadmin
 */
router.get(
  "/hierarchy",
  authorizeRoles("superadmin", "admin"),
  canViewCategory,
  // RateLimiter.apiLimiter(100, 60 * 60 * 1000), // 100 requests per hour
  categoryController.getCategoryHierarchy,
);

/**
 * @route   GET /api/v1/admin/categories/search
 * @desc    Search categories for autocomplete/dropdown with pagination support
 * @query   q?, limit?, page?, includeDeleted?
 * @access  Admin with categories.canView permission or Superadmin
 */
router.get(
  "/search",
  authorizeRoles("superadmin", "admin"),
  canViewCategory,
  // RateLimiter.apiLimiter(500, 60 * 60 * 1000), // 500 searches per hour
  categoryController.searchCategories,
);

/**
 * @route   GET /api/v1/admin/categories/:id
 * @desc    Get specific category by ID
 * @access  Admin with categories.canView permission or Superadmin
 */
router.get(
  "/:id",
  authorizeRoles("superadmin", "admin"),
  canViewCategory,
  // RateLimiter.apiLimiter(300, 60 * 60 * 1000), // 300 requests per hour
  categoryController.getCategoryByIdAdmin,
);

/**
 * @route   POST /api/v1/admin/categories
 * @desc    Create new category
 * @body    { name, description?, shortDescription?, parent?, order?, isActive?, isFeatured?, showInMenu?, showInHomepage?, searchKeywords?, seo?, settings? }
 * @access  Admin with categories.canCreate permission or Superadmin
 */
router.post(
  "/",
  authorizeRoles("superadmin", "admin"),
  canCreateCategory,
  // RateLimiter.authLimiter(50, 60 * 60 * 1000), // 50 category creations per hour
  categoryController.createCategory,
);

/**
 * @route   PUT /api/v1/admin/categories/:id
 * @desc    Update category details
 * @body    { name?, description?, shortDescription?, parent?, order?, isActive?, isFeatured?, showInMenu?, showInHomepage?, searchKeywords?, seo?, settings? }
 * @access  Admin with categories.canEdit permission or Superadmin
 */
router.put(
  "/:id",
  authorizeRoles("superadmin", "admin"),
  canEditCategory,
  // RateLimiter.authLimiter(100, 60 * 60 * 1000), // 100 category updates per hour
  categoryController.updateCategory,
);

/**
 * @route   DELETE /api/v1/admin/categories/:id
 * @desc    Soft delete category (archive) - reversible
 * @access  Admin with categories.canDelete permission or Superadmin
 */
router.delete(
  "/:id",
  authorizeRoles("superadmin", "admin"),
  canArchiveCategory,
  // RateLimiter.authLimiter(30, 60 * 60 * 1000), // 30 deletions per hour
  categoryController.deleteCategory,
);

/**
 * @route   PUT /api/v1/admin/categories/:id/restore
 * @desc    Restore archived category
 * @access  Admin with categories.canDelete permission or Superadmin
 */
router.put(
  "/:id/restore",
  authorizeRoles("superadmin", "admin"),
  canRestoreCategory,
  // RateLimiter.authLimiter(30, 60 * 60 * 1000), // 30 restores per hour
  categoryController.restoreCategory,
);

/**
 * @route   PUT /api/v1/admin/categories/:id/toggle-status
 * @desc    Toggle category active/inactive status
 * @access  Admin with categories.canEdit permission or Superadmin
 */
router.put(
  "/:id/toggle-status",
  authorizeRoles("superadmin", "admin"),
  canEditCategory,
  // RateLimiter.authLimiter(100, 60 * 60 * 1000), // 100 status toggles per hour
  categoryController.toggleCategoryStatus,
);

/**
 * @route   PUT /api/v1/admin/categories/:id/move
 * @desc    Move category to different parent or change order
 * @body    { newParentId?, newOrder? }
 * @access  Admin with categories.canEdit permission or Superadmin
 */
router.put(
  "/:id/move",
  authorizeRoles("superadmin", "admin"),
  canEditCategory,
  // RateLimiter.authLimiter(50, 60 * 60 * 1000), // 50 moves per hour
  categoryController.moveCategory,
);

/**
 * @route   POST /api/v1/admin/categories/bulk-action
 * @desc    Perform bulk actions on multiple categories
 * @body    { categoryIds: string[], action: "activate" | "deactivate" | "delete" | "restore" | "feature" | "unfeature" }
 * @access  Admin with categories.canEdit or categories.canDelete permission or Superadmin
 */
router.post(
  "/bulk-action",
  authorizeRoles("superadmin", "admin"),
  // Note: Bulk actions require different permissions based on action type
  // This is handled in the controller logic
  canEditCategory, // Basic permission check - controller handles specific action permissions
  // RateLimiter.authLimiter(20, 60 * 60 * 1000), // 20 bulk actions per hour
  categoryController.bulkAction,
);

export default router;
