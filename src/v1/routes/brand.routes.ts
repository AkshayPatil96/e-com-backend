import { Router } from "express";
import { RateLimiter } from "../../middleware/rateLimiter";
import brandController from "../controller/brand/brand.controller";

const router = Router();

// ================================
// PUBLIC BRAND ROUTES
// ================================

/**
 * Search brands for public use
 * @route GET /brands/search
 * @access Public
 * @rate 100 requests per hour per IP
 */
router.get(
  "/search",
  // RateLimiter.apiLimiter(100, 60 * 60 * 1000), // 100 requests per hour
  brandController.searchBrandsPublic,
);

/**
 * Get brand by slug for public viewing
 * @route GET /brands/:slug
 * @access Public
 * @rate 200 requests per hour per IP
 */
router.get(
  "/:slug",
  // RateLimiter.apiLimiter(200, 60 * 60 * 1000), // 200 requests per hour
  brandController.getBrandBySlugPublic,
);

export default router;
