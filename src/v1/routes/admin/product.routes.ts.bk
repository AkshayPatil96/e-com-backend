import express from "express";
import { authorizeRoles, isAuthenticated } from "../../../middleware/auth";
import {
  canApproveProduct,
  canCreateProduct,
  canDeleteProduct,
  canEditProduct,
  canViewProduct,
} from "../../../middleware/permission";
import { RateLimiter } from "../../../middleware/rateLimiter";
import productController from "../../controller/product";

const router = express.Router();

// All product routes require authentication
router.use(isAuthenticated);

/**
 * @route   GET /api/v1/admin/products
 * @desc    Get all products for admin panel with filters and pagination
 * @access  Admin with products.canView permission or Superadmin
 * @todo    Implement getProducts method in product controller
 */
// router.get(
//   "/",
//   authorizeRoles("admin", "superadmin"),
//   canViewProduct,
//   // RateLimiter.apiLimiter(200, 60 * 60 * 1000), // 200 requests per hour
//   productController.getProducts,
// );

/**
 * @route   GET /api/v1/admin/products/:id
 * @desc    Get specific product by ID
 * @access  Admin with products.canView permission or Superadmin
 * @todo    Implement getProduct method in product controller
 */
// router.get(
//   "/:id",
//   authorizeRoles("admin", "superadmin"),
//   canViewProduct,
//   // RateLimiter.apiLimiter(300, 60 * 60 * 1000), // 300 requests per hour
//   productController.getProduct,
// );

/**
 * @route   POST /api/v1/admin/products
 * @desc    Create new product (admin)
 * @access  Admin with products.canCreate permission or Superadmin
 */
router.post(
  "/",
  authorizeRoles("admin", "superadmin"),
  canCreateProduct,
  // RateLimiter.authLimiter(50, 60 * 60 * 1000), // 50 product creations per hour
  productController.addProduct,
);

/**
 * @route   PUT /api/v1/admin/products/:id
 * @desc    Update product details
 * @access  Admin with products.canEdit permission or Superadmin
 */
router.put(
  "/:id",
  authorizeRoles("admin", "superadmin"),
  canEditProduct,
  // RateLimiter.authLimiter(100, 60 * 60 * 1000), // 100 product updates per hour
  productController.updateProduct,
);

/**
 * @route   PUT /api/v1/admin/products/:id/approve
 * @desc    Approve seller product
 * @access  Admin with products.canApprove permission or Superadmin
 * @todo    Implement approveProduct method in product controller
 */
// router.put(
//   "/:id/approve",
//   authorizeRoles("admin", "superadmin"),
//   canApproveProduct,
//   // RateLimiter.authLimiter(100, 60 * 60 * 1000), // 100 approvals per hour
//   productController.approveProduct,
// );

/**
 * @route   DELETE /api/v1/admin/products/:id
 * @desc    Delete product (soft delete)
 * @access  Admin with products.canDelete permission or Superadmin
 * @todo    Implement deleteProduct method in product controller
 */
// router.delete(
//   "/:id",
//   authorizeRoles("admin", "superadmin"),
//   canDeleteProduct,
//   // RateLimiter.authLimiter(30, 60 * 60 * 1000), // 30 deletions per hour
//   productController.deleteProduct,
// );

/**
 * @route   PUT /api/v1/admin/products/:id/restore
 * @desc    Restore soft deleted product
 * @access  Admin with products.canDelete permission or Superadmin
 * @todo    Implement restoreProduct method in product controller
 */
// router.put(
//   "/:id/restore",
//   authorizeRoles("admin", "superadmin"),
//   canDeleteProduct,
//   // RateLimiter.authLimiter(30, 60 * 60 * 1000), // 30 restores per hour
//   productController.restoreProduct,
// );

export default router;
