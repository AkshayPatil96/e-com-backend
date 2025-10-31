import { Router } from "express";
import rateLimit from "express-rate-limit";
import productController from "../../controllers/product/product.controller";

const router = Router();

// ================================
// RATE LIMITING CONFIGURATIONS
// ================================

// Public operations rate limiting (less restrictive)
const publicRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per windowMs
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ================================
// PUBLIC PRODUCT ROUTES
// ================================

/**
 * GET /api/v1/products/:slug
 * Get product by slug for public viewing
 * Public route with rate limiting
 */
router.get(
  "/:slug",
  publicRateLimit,
  productController.getProductBySlug
);

// ================================
// ROUTE DOCUMENTATION
// ================================

/**
 * @swagger
 * /api/v1/products/{slug}:
 *   get:
 *     summary: Get product by slug (public)
 *     tags: [Public Products]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Product slug
 *     responses:
 *       200:
 *         description: Product retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Product retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     slug:
 *                       type: string
 *                     description:
 *                       type: string
 *                     images:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           url:
 *                             type: string
 *                           alt:
 *                             type: string
 *                     pricing:
 *                       type: object
 *                       properties:
 *                         basePrice:
 *                           type: number
 *                         comparePrice:
 *                           type: number
 *                         currency:
 *                           type: string
 *                     inventory:
 *                       type: object
 *                       properties:
 *                         stockQuantity:
 *                           type: number
 *                         isInStock:
 *                           type: boolean
 *                     brand:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         slug:
 *                           type: string
 *                     category:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         slug:
 *                           type: string
 *                     seller:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         storeName:
 *                           type: string
 *                         slug:
 *                           type: string
 *                     reviews:
 *                       type: object
 *                       properties:
 *                         averageRating:
 *                           type: number
 *                         totalReviews:
 *                           type: number
 *                     status:
 *                       type: string
 *                       enum: [published, draft, archived]
 *                     condition:
 *                       type: string
 *                       enum: [new, used, refurbished]
 *                     isFeatured:
 *                       type: boolean
 *                     isOnSale:
 *                       type: boolean
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid slug
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Product slug is required
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Product not found
 *       429:
 *         description: Too many requests
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Too many requests from this IP, please try again later.
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Internal server error
 */

export default router;