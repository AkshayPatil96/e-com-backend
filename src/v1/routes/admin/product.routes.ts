import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authorizeRoles, isAuthenticated } from "../../../middleware/auth";
import {
  canCreateProduct,
  canDeleteProduct,
  canEditProduct,
  canRestoreProduct,
  canViewProduct,
} from "../../../middleware/permission";
import productController from "../../controllers/product/product.controller";

const router = Router();

// ================================
// RATE LIMITING CONFIGURATIONS
// ================================

// Admin operations rate limiting (more restrictive)
const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: "Too many admin requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Bulk actions rate limiting (very restrictive)
const bulkActionRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Limit each IP to 10 bulk actions per windowMs
  message: {
    success: false,
    message: "Too many bulk actions from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Search rate limiting (moderate)
const searchRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 search requests per minute
  message: {
    success: false,
    message: "Too many search requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ================================
// ADMIN PRODUCT ROUTES
// ================================

/**
 * GET /api/v1/admin/products
 * Get all products with filtering, sorting, and pagination
 * Requires: Admin authentication + Product read permission
 */
router.get(
  "/",
  adminRateLimit,
  isAuthenticated,
  authorizeRoles("admin", "superadmin"),
  canViewProduct,
  productController.getAllProductsAdmin
);

/**
 * GET /api/v1/admin/products/search
 * Search products by query
 * Requires: Admin authentication + Product read permission
 */
router.get(
  "/search",
  searchRateLimit,
  isAuthenticated,
  authorizeRoles("admin", "superadmin"),
  canViewProduct,
  productController.searchProducts
);

/**
 * GET /api/v1/admin/products/statistics
 * Get product statistics and analytics
 * Requires: Admin authentication + Product read permission
 */
router.get(
  "/statistics",
  adminRateLimit,
  isAuthenticated,
  authorizeRoles("admin", "superadmin"),
  canViewProduct,
  productController.getProductStatistics
);

/**
 * POST /api/v1/admin/products/bulk-action
 * Perform bulk actions on multiple products
 * Requires: Admin authentication + Product write permission
 */
router.post(
  "/bulk-action",
  bulkActionRateLimit,
  isAuthenticated,
  authorizeRoles("admin", "superadmin"),
  canEditProduct,
  productController.bulkAction
);

/**
 * GET /api/v1/admin/products/:id
 * Get single product by ID
 * Requires: Admin authentication + Product read permission
 */
router.get(
  "/:id",
  adminRateLimit,
  isAuthenticated,
  authorizeRoles("admin", "superadmin"),
  canViewProduct,
  productController.getProductByIdAdmin
);

/**
 * POST /api/v1/admin/products
 * Create new product
 * Requires: Admin authentication + Product create permission
 */
router.post(
  "/",
  adminRateLimit,
  isAuthenticated,
  authorizeRoles("admin", "superadmin"),
  canCreateProduct,
  productController.createProduct
);

/**
 * PUT /api/v1/admin/products/:id
 * Update existing product
 * Requires: Admin authentication + Product write permission
 */
router.put(
  "/:id",
  adminRateLimit,
  isAuthenticated,
  authorizeRoles("admin", "superadmin"),
  canEditProduct,
  productController.updateProduct
);

/**
 * DELETE /api/v1/admin/products/:id
 * Soft delete product
 * Requires: Admin authentication + Product delete permission
 */
router.delete(
  "/:id",
  adminRateLimit,
  isAuthenticated,
  authorizeRoles("admin", "superadmin"),
  canDeleteProduct,
  productController.deleteProduct
);

/**
 * POST /api/v1/admin/products/:id/restore
 * Restore soft deleted product
 * Requires: Admin authentication + Product write permission
 */
router.post(
  "/:id/restore",
  adminRateLimit,
  isAuthenticated,
  authorizeRoles("admin", "superadmin"),
  canRestoreProduct,
  productController.restoreProduct
);

/**
 * POST /api/v1/admin/products/:id/toggle-status
 * Toggle product status (publish/unpublish)
 * Requires: Admin authentication + Product write permission
 */
router.post(
  "/:id/toggle-status",
  adminRateLimit,
  isAuthenticated,
  authorizeRoles("admin", "superadmin"),
  canEditProduct,
  productController.toggleProductStatus
);

// ================================
// ROUTE DOCUMENTATION
// ================================

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 * 
 * /api/v1/admin/products:
 *   get:
 *     summary: Get all products for admin
 *     tags: [Admin Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for product name, description, SKU, or tags
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, published, draft, archived]
 *           default: all
 *         description: Filter by product status
 *       - in: query
 *         name: condition
 *         schema:
 *           type: string
 *           enum: [all, new, used, refurbished]
 *           default: all
 *         description: Filter by product condition
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category ID
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *         description: Filter by brand ID
 *       - in: query
 *         name: seller
 *         schema:
 *           type: string
 *         description: Filter by seller ID
 *       - in: query
 *         name: featured
 *         schema:
 *           type: string
 *           enum: [all, featured, not-featured]
 *           default: all
 *         description: Filter by featured status
 *       - in: query
 *         name: onSale
 *         schema:
 *           type: string
 *           enum: [all, on-sale, not-on-sale]
 *           default: all
 *         description: Filter by sale status
 *       - in: query
 *         name: inStock
 *         schema:
 *           type: string
 *           enum: [all, in-stock, out-of-stock, low-stock]
 *           default: all
 *         description: Filter by stock status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, createdAt, updatedAt, basePrice, stockQuantity, soldQuantity, averageRating, viewCount]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied
 *       500:
 *         description: Internal server error
 * 
 *   post:
 *     summary: Create new product
 *     tags: [Admin Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - sku
 *               - category
 *               - brand
 *               - seller
 *               - pricing
 *             properties:
 *               name:
 *                 type: string
 *               sku:
 *                 type: string
 *               category:
 *                 type: string
 *               brand:
 *                 type: string
 *               seller:
 *                 type: string
 *               pricing:
 *                 type: object
 *                 properties:
 *                   basePrice:
 *                     type: number
 *                   comparePrice:
 *                     type: number
 *                   currency:
 *                     type: string
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied
 *       409:
 *         description: Product already exists
 *       500:
 *         description: Internal server error
 * 
 * /api/v1/admin/products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Admin Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product retrieved successfully
 *       400:
 *         description: Invalid product ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied
 *       404:
 *         description: Product not found
 *       500:
 *         description: Internal server error
 * 
 *   put:
 *     summary: Update product
 *     tags: [Admin Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               pricing:
 *                 type: object
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied
 *       404:
 *         description: Product not found
 *       409:
 *         description: Conflict (duplicate name/SKU)
 *       500:
 *         description: Internal server error
 * 
 *   delete:
 *     summary: Soft delete product
 *     tags: [Admin Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *       400:
 *         description: Invalid product ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied
 *       404:
 *         description: Product not found
 *       500:
 *         description: Internal server error
 * 
 * /api/v1/admin/products/search:
 *   get:
 *     summary: Search products
 *     tags: [Admin Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *         description: Search query
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *         description: Number of results
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *     responses:
 *       200:
 *         description: Search completed successfully
 *       400:
 *         description: Invalid search query
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied
 *       500:
 *         description: Internal server error
 * 
 * /api/v1/admin/products/statistics:
 *   get:
 *     summary: Get product statistics
 *     tags: [Admin Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied
 *       500:
 *         description: Internal server error
 * 
 * /api/v1/admin/products/bulk-action:
 *   post:
 *     summary: Perform bulk actions on products
 *     tags: [Admin Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productIds
 *               - action
 *             properties:
 *               productIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 maxItems: 100
 *               action:
 *                 type: string
 *                 enum: [publish, unpublish, archive, restore, delete, feature, unfeature, enable-sale, disable-sale]
 *     responses:
 *       200:
 *         description: Bulk action completed
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied
 *       500:
 *         description: Internal server error
 */

export default router;
