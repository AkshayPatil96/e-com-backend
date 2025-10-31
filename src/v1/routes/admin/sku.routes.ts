/**
 * @fileoverview SKU Routes for Admin Panel
 * 
 * Routes for SKU generation, validation, and management
 * 
 * @author E-commerce API Team
 * @version 1.0.0
 */

import { Router } from "express";
import { authorizeRoles, isAuthenticated } from "../../../middleware/auth";
import RateLimiter from "../../../middleware/rateLimiter";
import {
  bulkGenerateSKU,
  generateSKUPreview,
  getSKUAnalytics,
  getSKUReference,
  releaseSKUReservation,
  reserveSKU,
  suggestSKUFromName,
  validateSKU,
} from "../../controller/admin/sku.controller";

const router = Router();

// Apply authentication to all routes
router.use(isAuthenticated);

// Apply admin authorization to all routes  
router.use(authorizeRoles("admin"));

/**
 * @swagger
 * /api/v1/admin/sku/generate-preview:
 *   post:
 *     summary: Generate SKU preview for frontend form
 *     description: Generate a preview SKU based on brand, category, and optional attributes
 *     tags: [Admin - SKU]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - brandId
 *               - categoryId
 *             properties:
 *               brandId:
 *                 type: string
 *                 description: Brand ID
 *               categoryId:
 *                 type: string
 *                 description: Category ID
 *               size:
 *                 type: string
 *                 description: Product size (optional)
 *               color:
 *                 type: string
 *                 description: Product color (optional)
 *               customSuffix:
 *                 type: string
 *                 description: Custom suffix for SKU (optional)
 *     responses:
 *       200:
 *         description: SKU generated successfully
 *       400:
 *         description: Missing required fields or invalid brand/category
 *       404:
 *         description: Brand or category not found
 */
router.post(
  "/generate-preview",
  RateLimiter.apiLimiter(30, 60 * 1000), // 30 requests per minute
  generateSKUPreview
);

/**
 * @swagger
 * /api/v1/admin/sku/validate:
 *   post:
 *     summary: Validate SKU format and uniqueness
 *     description: Check if SKU has valid format and is unique in the database
 *     tags: [Admin - SKU]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sku
 *             properties:
 *               sku:
 *                 type: string
 *                 description: SKU to validate
 *               excludeProductId:
 *                 type: string
 *                 description: Product ID to exclude from uniqueness check (for updates)
 *     responses:
 *       200:
 *         description: SKU validation result
 *       400:
 *         description: Invalid SKU format
 */
router.post(
  "/validate",
  RateLimiter.apiLimiter(60, 60 * 1000), // 60 requests per minute
  validateSKU
);

/**
 * @swagger
 * /api/v1/admin/sku/suggest:
 *   post:
 *     summary: Suggest SKU based on product name
 *     description: Analyze product name and suggest an appropriate SKU
 *     tags: [Admin - SKU]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productName
 *               - brandId
 *               - categoryId
 *             properties:
 *               productName:
 *                 type: string
 *                 description: Product name to analyze
 *               brandId:
 *                 type: string
 *                 description: Brand ID
 *               categoryId:
 *                 type: string
 *                 description: Category ID
 *     responses:
 *       200:
 *         description: SKU suggested successfully
 *       400:
 *         description: Missing required fields
 *       404:
 *         description: Brand or category not found
 */
router.post(
  "/suggest",
  RateLimiter.apiLimiter(30, 60 * 1000), // 30 requests per minute
  suggestSKUFromName
);

/**
 * @swagger
 * /api/v1/admin/sku/reference:
 *   get:
 *     summary: Get SKU patterns and reference data
 *     description: Get available brand codes, category codes, and SKU pattern information
 *     tags: [Admin - SKU]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reference data retrieved successfully
 */
router.get(
  "/reference",
  RateLimiter.apiLimiter(20, 60 * 1000), // 20 requests per minute
  getSKUReference
);

/**
 * @swagger
 * /api/v1/admin/sku/bulk-generate:
 *   post:
 *     summary: Bulk generate SKUs for multiple products
 *     description: Generate SKUs for multiple products in one request
 *     tags: [Admin - SKU]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - products
 *             properties:
 *               products:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - brandId
 *                     - categoryId
 *                   properties:
 *                     brandId:
 *                       type: string
 *                       description: Brand ID
 *                     categoryId:
 *                       type: string
 *                       description: Category ID
 *                     size:
 *                       type: string
 *                       description: Product size (optional)
 *                     color:
 *                       type: string
 *                       description: Product color (optional)
 *                     productName:
 *                       type: string
 *                       description: Product name for reference
 *     responses:
 *       200:
 *         description: Bulk generation completed
 */
router.post(
  "/bulk-generate",
  RateLimiter.apiLimiter(5, 60 * 1000), // 5 requests per minute for bulk operations
  bulkGenerateSKU
);

/**
 * @swagger
 * /api/v1/admin/sku/reserve:
 *   post:
 *     summary: Reserve SKU for product creation
 *     description: Reserve a SKU to prevent race conditions during product creation
 *     tags: [Admin - SKU]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sku
 *             properties:
 *               sku:
 *                 type: string
 *                 description: SKU to reserve
 *               ttl:
 *                 type: number
 *                 description: Time to live in seconds (default 300)
 *     responses:
 *       200:
 *         description: SKU reserved successfully
 *       409:
 *         description: SKU already reserved
 */
router.post(
  "/reserve",
  RateLimiter.apiLimiter(30, 60 * 1000), // 30 requests per minute
  reserveSKU
);

/**
 * @swagger
 * /api/v1/admin/sku/release:
 *   post:
 *     summary: Release SKU reservation
 *     description: Release a previously reserved SKU
 *     tags: [Admin - SKU]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sku
 *             properties:
 *               sku:
 *                 type: string
 *                 description: SKU to release
 *     responses:
 *       200:
 *         description: SKU reservation released successfully
 */
router.post(
  "/release",
  RateLimiter.apiLimiter(30, 60 * 1000), // 30 requests per minute
  releaseSKUReservation
);

/**
 * @swagger
 * /api/v1/admin/sku/analytics:
 *   get:
 *     summary: Get SKU analytics
 *     description: Get analytics data for SKU generation and usage
 *     tags: [Admin - SKU]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analytics (default 30 days ago)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analytics (default today)
 *     responses:
 *       200:
 *         description: Analytics data retrieved successfully
 */
router.get(
  "/analytics",
  RateLimiter.apiLimiter(10, 60 * 1000), // 10 requests per minute
  getSKUAnalytics
);

export default router;