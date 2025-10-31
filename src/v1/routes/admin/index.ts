import express from "express";

// Import all admin route modules
import adminUserRoutes from "./admin-user.routes";
import brandRoutes from "./brand.routes";
import categoryRoutes from "./category.routes";
import productRoutes from "./product.routes";
import sellerRoutes from "./seller.routes";
import skuRoutes from "./sku.routes";
import userRoutes from "./user.routes";

const router = express.Router();

/**
 * Admin Panel API Routes
 * Base path: /api/v1/admin
 *
 * All routes in this module are for admin panel management
 * and require appropriate authentication and authorization
 */

// Mount admin user management routes
// Routes: /api/v1/admin/admin-user/*
router.use("/admin-user", adminUserRoutes);

// Mount category management routes
// Routes: /api/v1/admin/categories/*
router.use("/categories", categoryRoutes);

// Mount brand management routes
// Routes: /api/v1/admin/brands/*
router.use("/brands", brandRoutes);

// Mount product management routes
// Routes: /api/v1/admin/products/*
router.use("/products", productRoutes);

// Mount seller management routes
// Routes: /api/v1/admin/sellers/*
router.use("/sellers", sellerRoutes);

// Mount SKU management routes
// Routes: /api/v1/admin/sku/*
router.use("/sku", skuRoutes);

// Mount general user management routes
// Routes: /api/v1/admin/users/*
router.use("/users", userRoutes);

// TODO: Add more admin routes as they are implemented
// Examples:
// router.use("/orders", orderRoutes);
// router.use("/reports", reportRoutes);
// router.use("/settings", settingsRoutes);
// router.use("/analytics", analyticsRoutes);

export default router;
