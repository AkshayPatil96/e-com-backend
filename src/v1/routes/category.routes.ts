import express from "express";
import categoryController from "../controller/category/category";

const router = express.Router();

/**
 * Public Category Routes
 * These APIs are accessible to all users (no authentication required)
 * Returns only public/safe category information
 */

/**
 * @route   GET /api/v1/categories/search
 * @desc    Search categories for public use (autocomplete, infinite scroll, etc.)
 * @query   q?, limit?, page?, activeOnly?
 * @access  Public
 */
router.get("/search", categoryController.searchCategoriesPublic);

/**
 * @route   GET /api/v1/categories/hierarchy
 * @desc    Get public category hierarchy for navigation/menus
 * @access  Public
 */
router.get("/hierarchy", categoryController.getCategoryHierarchyPublic);

/**
 * @route   GET /api/v1/categories
 * @desc    Get categories with pagination for public use
 * @query   page?, limit?, search?, parent?, level?
 * @access  Public
 */
router.get("/", categoryController.getAllCategoriesPublic);

/**
 * @route   GET /api/v1/categories/:slug
 * @desc    Get category by slug for public viewing
 * @access  Public
 */
router.get("/:slug", categoryController.getCategoryBySlugPublic);

export default router;
