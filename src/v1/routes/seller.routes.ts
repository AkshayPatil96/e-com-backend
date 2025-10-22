import { Router } from "express";
import { RateLimiter } from "../../middleware/rateLimiter";
import sellerController from "../controller/seller/seller.controller";

const router = Router();

// ================================
// PUBLIC SELLER ROUTES
// ================================

/**
 * Search sellers for public use
 * @route GET /sellers/search
 * @access Public
 * @rate 100 requests per hour per IP
 */
router.get(
  "/search",
  // RateLimiter.apiLimiter(100, 60 * 60 * 1000), // 100 requests per hour
  sellerController.searchSellersPublic,
);

/**
 * Get seller by slug for public viewing
 * @route GET /sellers/:slug
 * @access Public
 * @rate 200 requests per hour per IP
 */
router.get(
  "/:slug",
  // RateLimiter.apiLimiter(200, 60 * 60 * 1000), // 200 requests per hour
  sellerController.getSellerBySlugPublic,
);

export default router;