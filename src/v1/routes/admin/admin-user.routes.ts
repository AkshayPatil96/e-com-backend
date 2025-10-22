import express from "express";
import { authorizeRoles, isAuthenticated } from "../../../middleware/auth";
import {
  canArchiveAdmin,
  canDeleteAdmin,
  canEditAdmin,
  canManagePermissions,
  canRestoreAdmin,
  canViewAdmin,
  checkPermission,
} from "../../../middleware/permission";
import { RateLimiter } from "../../../middleware/rateLimiter";
import adminController from "../../controller/admin/admin-user";

const router = express.Router();

// All admin routes require authentication
router.use(isAuthenticated);

// Admin permission management routes (superadmin only)

/**
 * @route   GET /api/v1/admin/admin-user/all
 * @desc    Get all admins with comprehensive filtering, sorting, and pagination
 * @query   page?, limit?, search?, statusFilter?, permissionFilter?, sortBy?, sortOrder?, isArchived?
 * @access  Superadmin only
 */
router.get(
  "/all",
  authorizeRoles("superadmin", "admin"),
  canViewAdmin,
  // RateLimiter.apiLimiter(100, 60 * 60 * 1000), // 100 requests per hour
  adminController.getAllAdmins,
);

/**
 * @route   PUT /api/v1/admin/admin-user/:adminId/permissions
 * @desc    Update admin's permissions (bulk update)
 * @access  Superadmin only
 */
router.put(
  "/:adminId/permissions",
  authorizeRoles("superadmin"),
  canManagePermissions,
  // RateLimiter.authLimiter(50, 60 * 60 * 1000), // 50 permission updates per hour
  adminController.updateAdminPermissions,
);

/**
 * @route   POST /api/v1/admin/admin-user/create
 * @desc    Create new admin with specific permissions
 * @access  Superadmin only
 */
router.post(
  "/create",
  authorizeRoles("superadmin"),
  // RateLimiter.authLimiter(10, 60 * 60 * 1000), // 10 admin creations per hour
  adminController.createAdminWithPermissions,
);

/**
 * @route   PUT /api/v1/admin/admin-user/:adminId/details
 * @desc    Update admin's basic details (name, phone, status, etc.)
 * @access  Superadmin or admin with admins.canEdit permission
 */
router.put(
  "/:adminId/details",
  authorizeRoles("admin", "superadmin"),
  canEditAdmin,
  // RateLimiter.authLimiter(30, 60 * 60 * 1000), // 30 detail updates per hour
  adminController.updateAdminDetails,
);

// Admin deletion and restoration routes

/**
 * @route   DELETE /api/v1/admin/admin-user/:adminId/archive
 * @desc    Soft delete admin (archive) - reversible
 * @access  Admin with admins.canDelete permission or Superadmin
 */
router.delete(
  "/:adminId/archive",
  authorizeRoles("admin", "superadmin"),
  canArchiveAdmin,
  // RateLimiter.authLimiter(20, 60 * 60 * 1000), // 20 archives per hour
  adminController.archiveAdmin,
);

/**
 * @route   PUT /api/v1/admin/admin-user/:adminId/restore
 * @desc    Restore archived admin account
 * @access  Admin with admins.canDelete permission or Superadmin
 */
router.put(
  "/:adminId/restore",
  authorizeRoles("admin", "superadmin"),
  canRestoreAdmin,
  // RateLimiter.authLimiter(20, 60 * 60 * 1000), // 20 restores per hour
  adminController.restoreAdmin,
);

/**
 * @route   DELETE /api/v1/admin/admin-user/:adminId/permanent
 * @desc    Permanently delete admin account (irreversible) - requires explicit confirmation
 * @body    { confirmDelete: "PERMANENTLY_DELETE" }
 * @access  Superadmin only
 */
router.delete(
  "/:adminId/permanent",
  authorizeRoles("superadmin"),
  canDeleteAdmin,
  // RateLimiter.authLimiter(5, 60 * 60 * 1000), // 5 permanent deletions per hour
  adminController.permanentlyDeleteAdmin,
);

export default router;
