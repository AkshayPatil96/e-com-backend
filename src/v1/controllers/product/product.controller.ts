import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import {
  ICreateProductAdminBody,
  IProductAdminFilters,
  IUpdateProductAdminBody,
} from "../../../@types/product-admin.type";
import { IProduct, ProductStatus, ProductCondition } from "../../../@types/product.type";
import ErrorHandler from "../../../utils/ErrorHandler";
import { loggerHelpers } from "../../../utils/logger";
import productService from "../../services/product/product.service";
import { CatchAsyncErrors } from "../../../middleware/catchAsyncErrors";

// ================================
// ADMIN PRODUCT CONTROLLERS
// ================================

/**
 * Get all products for admin with filtering, sorting, and pagination
 * GET /api/v1/admin/products
 */
export const getAllProductsAdmin = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract and validate query parameters
      const {
        page = 1,
        limit = 20,
        search = "",
        status = "all",
        condition = "all",
        category = "",
        brand = "",
        seller = "",
        featured = "all",
        onSale = "all",
        inStock = "all",
        sortBy = "createdAt",
        sortOrder = "desc",
        isDeleted = false,
        minPrice,
        maxPrice,
        minStock,
        maxStock,
        minRating,
        maxRating,
        dateFrom,
        dateTo,
      } = req.query;

      // Validate pagination parameters
      const parsedPage = Math.max(1, parseInt(page as string) || 1);
      const parsedLimit = Math.min(100, Math.max(1, parseInt(limit as string) || 20));

      // Validate sort parameters
      const validSortBy = [
        "name",
        "createdAt",
        "updatedAt",
        "basePrice",
        "stockQuantity",
        "soldQuantity",
        "averageRating",
        "viewCount",
      ];
      const validSortOrder = ["asc", "desc"];

      const finalSortBy = validSortBy.includes(sortBy as string) 
        ? (sortBy as string) as "createdAt" | "name" | "updatedAt" | "basePrice" | "stockQuantity" | "soldQuantity" | "averageRating" | "viewCount"
        : "createdAt";
      const finalSortOrder = validSortOrder.includes(sortOrder as string) 
        ? (sortOrder as string) as "asc" | "desc"
        : "desc";

      // Validate status filter
      const validStatuses = ["all", ...Object.values(ProductStatus)];
      const finalStatus = validStatuses.includes(status as string) 
        ? (status as string) as "all" | ProductStatus
        : "all";

      // Validate featured filter
      const validFeatured = ["all", "featured", "not-featured"];
      const finalFeatured = validFeatured.includes(featured as string) 
        ? (featured as string) as "all" | "featured" | "not-featured"
        : "all";

      // Validate onSale filter
      const validOnSale = ["all", "on-sale", "not-on-sale"];
      const finalOnSale = validOnSale.includes(onSale as string) 
        ? (onSale as string) as "all" | "on-sale" | "not-on-sale"
        : "all";

      // Validate stock filter
      const validInStock = ["all", "in-stock", "out-of-stock", "low-stock"];
      const finalInStock = validInStock.includes(inStock as string) 
        ? (inStock as string) as "all" | "in-stock" | "out-of-stock" | "low-stock"
        : "all";

      // Validate condition filter
      const validConditions = ["all", ...Object.values(ProductCondition)];
      const finalCondition = validConditions.includes(condition as string) 
        ? (condition as string) as "all" | ProductCondition
        : "all";

      // Parse numeric filters
      const parsedMinPrice = minPrice ? parseFloat(minPrice as string) : undefined;
      const parsedMaxPrice = maxPrice ? parseFloat(maxPrice as string) : undefined;
      const parsedMinStock = minStock ? parseInt(minStock as string) : undefined;
      const parsedMaxStock = maxStock ? parseInt(maxStock as string) : undefined;
      const parsedMinRating = minRating ? parseFloat(minRating as string) : undefined;
      const parsedMaxRating = maxRating ? parseFloat(maxRating as string) : undefined;

      // Validate ObjectId filters
      const validCategory = category && mongoose.isValidObjectId(category as string) 
        ? (category as string) 
        : "";
      const validBrand = brand && mongoose.isValidObjectId(brand as string) 
        ? (brand as string) 
        : "";
      const validSeller = seller && mongoose.isValidObjectId(seller as string) 
        ? (seller as string) 
        : "";

      // Build filters object
      const filters: IProductAdminFilters = {
        page: parsedPage,
        limit: parsedLimit,
        search: (search as string).trim(),
        status: finalStatus,
        condition: finalCondition,
        category: validCategory,
        brand: validBrand,
        seller: validSeller,
        featured: finalFeatured,
        onSale: finalOnSale,
        inStock: finalInStock,
        sortBy: finalSortBy,
        sortOrder: finalSortOrder,
        isDeleted: Boolean(isDeleted),
        minPrice: parsedMinPrice,
        maxPrice: parsedMaxPrice,
        minStock: parsedMinStock,
        maxStock: parsedMaxStock,
        minRating: parsedMinRating,
        maxRating: parsedMaxRating,
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
      };

      // Get products from service
      const result = await productService.getAllProductsAdmin(filters);

      // Log the request
      loggerHelpers.business("admin_products_requested", {
        userId: (req as any).user?.id,
        filters: {
          page: parsedPage,
          limit: parsedLimit,
          search: (search as string).trim(),
          status: finalStatus,
          category: validCategory,
          brand: validBrand,
          seller: validSeller,
        },
        resultCount: result.data.length,
        totalCount: result.pagination.totalCount,
      });

      res.status(200).json({
        success: true,
        message: "Products retrieved successfully",
        data: result,
      });
    } catch (error) {
      loggerHelpers.system("admin_products_error", {
        userId: (req as any).user?.id,
        error: (error as Error).message,
        query: req.query,
      });
      return next(new ErrorHandler(500, (error as Error).message));
    }
  }
);

/**
 * Get single product by ID for admin
 * GET /api/v1/admin/products/:id
 */
export const getProductByIdAdmin = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      // Validate product ID
      if (!mongoose.isValidObjectId(id)) {
        return next(new ErrorHandler(400, "Invalid product ID"));
      }

      const product = await productService.getProductByIdAdmin(id);

      if (!product) {
        return next(new ErrorHandler(404, "Product not found"));
      }

      loggerHelpers.business("admin_product_fetched", {
        productId: id,
        userId: (req as any).user?.id,
        productName: product.name,
      });

      res.status(200).json({
        success: true,
        message: "Product retrieved successfully",
        data: product,
      });
    } catch (error) {
      loggerHelpers.system("admin_product_fetch_error", {
        productId: req.params.id,
        userId: (req as any).user?.id,
        error: (error as Error).message,
      });
      return next(new ErrorHandler(500, (error as Error).message));
    }
  }
);

/**
 * Create new product
 * POST /api/v1/admin/products
 */
export const createProduct = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productData: ICreateProductAdminBody = req.body;
      const userId = (req as any).user.id;

      // Validate required fields
      if (!productData.name) {
        return next(new ErrorHandler(400, "Product name is required"));
      }

      if (!productData.sku) {
        return next(new ErrorHandler(400, "Product SKU is required"));
      }

      if (!productData.category) {
        return next(new ErrorHandler(400, "Product category is required"));
      }

      if (!productData.brand) {
        return next(new ErrorHandler(400, "Product brand is required"));
      }

      if (!productData.seller) {
        return next(new ErrorHandler(400, "Product seller is required"));
      }

      if (!productData.pricing?.basePrice) {
        return next(new ErrorHandler(400, "Product base price is required"));
      }

      // Validate ObjectIds
      if (!mongoose.isValidObjectId(productData.category)) {
        return next(new ErrorHandler(400, "Invalid category ID"));
      }

      if (!mongoose.isValidObjectId(productData.brand)) {
        return next(new ErrorHandler(400, "Invalid brand ID"));
      }

      if (!mongoose.isValidObjectId(productData.seller)) {
        return next(new ErrorHandler(400, "Invalid seller ID"));
      }

      // Create product
      const product = await productService.createProduct(productData, userId);

      loggerHelpers.business("admin_product_created", {
        productId: (product as any)._id,
        productName: product.name,
        sku: product.sku,
        userId,
      });

      res.status(201).json({
        success: true,
        message: "Product created successfully",
        data: product,
      });
    } catch (error) {
      loggerHelpers.system("admin_product_create_error", {
        userId: (req as any).user?.id,
        productData: {
          name: req.body.name,
          sku: req.body.sku,
        },
        error: (error as Error).message,
      });
      
      // Handle specific validation errors
      if ((error as Error).message.includes("already exists")) {
        return next(new ErrorHandler(409, (error as Error).message));
      }
      
      return next(new ErrorHandler(500, (error as Error).message));
    }
  }
);

/**
 * Update product
 * PUT /api/v1/admin/products/:id
 */
export const updateProduct = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const updateData: IUpdateProductAdminBody = req.body;
      const userId = (req as any).user.id;

      // Validate product ID
      if (!mongoose.isValidObjectId(id)) {
        return next(new ErrorHandler(400, "Invalid product ID"));
      }

      // Validate ObjectIds in update data
      if (updateData.category && !mongoose.isValidObjectId(updateData.category)) {
        return next(new ErrorHandler(400, "Invalid category ID"));
      }

      if (updateData.brand && !mongoose.isValidObjectId(updateData.brand)) {
        return next(new ErrorHandler(400, "Invalid brand ID"));
      }

      if (updateData.seller && !mongoose.isValidObjectId(updateData.seller)) {
        return next(new ErrorHandler(400, "Invalid seller ID"));
      }

      // Update product
      const product = await productService.updateProduct(id, updateData, userId);

      if (!product) {
        return next(new ErrorHandler(404, "Product not found"));
      }

      loggerHelpers.business("admin_product_updated", {
        productId: id,
        productName: product.name,
        userId,
        updatedFields: Object.keys(updateData),
      });

      res.status(200).json({
        success: true,
        message: "Product updated successfully",
        data: product,
      });
    } catch (error) {
      loggerHelpers.system("admin_product_update_error", {
        productId: req.params.id,
        userId: (req as any).user?.id,
        error: (error as Error).message,
      });
      
      // Handle specific validation errors
      if ((error as Error).message.includes("already exists")) {
        return next(new ErrorHandler(409, (error as Error).message));
      }
      
      return next(new ErrorHandler(500, (error as Error).message));
    }
  }
);

/**
 * Delete product (soft delete)
 * DELETE /api/v1/admin/products/:id
 */
export const deleteProduct = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      // Validate product ID
      if (!mongoose.isValidObjectId(id)) {
        return next(new ErrorHandler(400, "Invalid product ID"));
      }

      const success = await productService.deleteProduct(id);

      if (!success) {
        return next(new ErrorHandler(404, "Product not found"));
      }

      loggerHelpers.business("admin_product_deleted", {
        productId: id,
        userId: (req as any).user?.id,
      });

      res.status(200).json({
        success: true,
        message: "Product deleted successfully",
      });
    } catch (error) {
      loggerHelpers.system("admin_product_delete_error", {
        productId: req.params.id,
        userId: (req as any).user?.id,
        error: (error as Error).message,
      });
      return next(new ErrorHandler(500, (error as Error).message));
    }
  }
);

/**
 * Restore deleted product
 * POST /api/v1/admin/products/:id/restore
 */
export const restoreProduct = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      // Validate product ID
      if (!mongoose.isValidObjectId(id)) {
        return next(new ErrorHandler(400, "Invalid product ID"));
      }

      const product = await productService.restoreProduct(id);

      if (!product) {
        return next(new ErrorHandler(404, "Product not found"));
      }

      loggerHelpers.business("admin_product_restored", {
        productId: id,
        productName: product.name,
        userId: (req as any).user?.id,
      });

      res.status(200).json({
        success: true,
        message: "Product restored successfully",
        data: product,
      });
    } catch (error) {
      loggerHelpers.system("admin_product_restore_error", {
        productId: req.params.id,
        userId: (req as any).user?.id,
        error: (error as Error).message,
      });
      return next(new ErrorHandler(500, (error as Error).message));
    }
  }
);

/**
 * Toggle product status (publish/unpublish)
 * POST /api/v1/admin/products/:id/toggle-status
 */
export const toggleProductStatus = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      // Validate product ID
      if (!mongoose.isValidObjectId(id)) {
        return next(new ErrorHandler(400, "Invalid product ID"));
      }

      const product = await productService.toggleProductStatus(id);

      if (!product) {
        return next(new ErrorHandler(404, "Product not found"));
      }

      loggerHelpers.business("admin_product_status_toggled", {
        productId: id,
        productName: product.name,
        newStatus: product.status,
        userId: (req as any).user?.id,
      });

      res.status(200).json({
        success: true,
        message: `Product ${product.status === ProductStatus.PUBLISHED ? 'published' : 'unpublished'} successfully`,
        data: product,
      });
    } catch (error) {
      loggerHelpers.system("admin_product_toggle_status_error", {
        productId: req.params.id,
        userId: (req as any).user?.id,
        error: (error as Error).message,
      });
      return next(new ErrorHandler(500, (error as Error).message));
    }
  }
);

/**
 * Search products
 * GET /api/v1/admin/products/search
 */
export const searchProducts = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        q = "",
        limit = 20,
        page = 1,
        includeDeleted = false,
      } = req.query;

      const query = (q as string).trim();
      if (!query || query.length < 2) {
        return next(new ErrorHandler(400, "Search query must be at least 2 characters long"));
      }

      const parsedLimit = Math.min(50, Math.max(1, parseInt(limit as string) || 20));
      const parsedPage = Math.max(1, parseInt(page as string) || 1);

      const result = await productService.searchProducts(query, {
        limit: parsedLimit,
        page: parsedPage,
        includeDeleted: Boolean(includeDeleted),
      });

      loggerHelpers.business("admin_products_searched", {
        query,
        userId: (req as any).user?.id,
        resultCount: result.results.length,
        totalCount: result.pagination.totalCount,
      });

      res.status(200).json({
        success: true,
        message: "Search completed successfully",
        data: result,
      });
    } catch (error) {
      loggerHelpers.system("admin_products_search_error", {
        query: req.query.q,
        userId: (req as any).user?.id,
        error: (error as Error).message,
      });
      return next(new ErrorHandler(500, (error as Error).message));
    }
  }
);

/**
 * Get product statistics
 * GET /api/v1/admin/products/statistics
 */
export const getProductStatistics = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const statistics = await productService.getProductStatistics();

      loggerHelpers.business("admin_product_statistics_fetched", {
        userId: (req as any).user?.id,
        totalProducts: statistics.totalProducts,
      });

      res.status(200).json({
        success: true,
        message: "Product statistics retrieved successfully",
        data: statistics,
      });
    } catch (error) {
      loggerHelpers.system("admin_product_statistics_error", {
        userId: (req as any).user?.id,
        error: (error as Error).message,
      });
      return next(new ErrorHandler(500, (error as Error).message));
    }
  }
);

/**
 * Bulk actions on products
 * POST /api/v1/admin/products/bulk-action
 */
export const bulkAction = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { productIds, action } = req.body;
      const userId = (req as any).user.id;

      // Validate input
      if (!Array.isArray(productIds) || productIds.length === 0) {
        return next(new ErrorHandler(400, "Product IDs array is required"));
      }

      if (productIds.length > 100) {
        return next(new ErrorHandler(400, "Cannot perform bulk action on more than 100 products at once"));
      }

      if (!action) {
        return next(new ErrorHandler(400, "Action is required"));
      }

      // Validate all product IDs
      for (const id of productIds) {
        if (!mongoose.isValidObjectId(id)) {
          return next(new ErrorHandler(400, `Invalid product ID: ${id}`));
        }
      }

      // Validate action
      const validActions = [
        "publish",
        "unpublish",
        "archive",
        "restore",
        "delete",
        "feature",
        "unfeature",
        "enable-sale",
        "disable-sale",
      ];

      if (!validActions.includes(action)) {
        return next(new ErrorHandler(400, `Invalid action. Valid actions: ${validActions.join(", ")}`));
      }

      // Perform bulk action
      const result = await productService.bulkAction(productIds, action, userId);

      loggerHelpers.business("admin_products_bulk_action", {
        action,
        userId,
        total: productIds.length,
        success: result.success,
        failed: result.failed,
      });

      res.status(200).json({
        success: true,
        message: `Bulk ${action} completed. ${result.success} successful, ${result.failed} failed.`,
        data: result,
      });
    } catch (error) {
      loggerHelpers.system("admin_products_bulk_action_error", {
        action: req.body.action,
        productCount: req.body.productIds?.length,
        userId: (req as any).user?.id,
        error: (error as Error).message,
      });
      return next(new ErrorHandler(500, (error as Error).message));
    }
  }
);

// ================================
// PUBLIC PRODUCT CONTROLLERS
// ================================

/**
 * Get product by slug for public viewing
 * GET /api/v1/products/:slug
 */
export const getProductBySlug = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { slug } = req.params;

      if (!slug) {
        return next(new ErrorHandler(400, "Product slug is required"));
      }

      const product = await productService.getProductBySlug(slug);

      if (!product) {
        return next(new ErrorHandler(404, "Product not found"));
      }

      // Update view count asynchronously (don't wait for it)
      productService.updateProductRaw(
        (product as any)._id.toString(),
        { $inc: { "analytics.viewCount": 1 } },
        "system"
      ).catch((error) => {
        loggerHelpers.system("product_view_count_update_error", {
          productId: (product as any)._id.toString(),
          error: error.message,
        });
      });

      loggerHelpers.business("public_product_viewed", {
        productId: (product as any)._id,
        productName: product.name,
        slug,
        userAgent: req.get("User-Agent"),
        ip: req.ip,
      });

      res.status(200).json({
        success: true,
        message: "Product retrieved successfully", 
        data: product,
      });
    } catch (error) {
      loggerHelpers.system("public_product_fetch_error", {
        slug: req.params.slug,
        error: (error as Error).message,
      });
      return next(new ErrorHandler(500, (error as Error).message));
    }
  }
);

// ================================
// DEFAULT EXPORT
// ================================

const productController = {
  // Admin controllers
  getAllProductsAdmin,
  getProductByIdAdmin,
  createProduct,
  updateProduct,
  deleteProduct,
  restoreProduct,
  toggleProductStatus,
  searchProducts,
  getProductStatistics,
  bulkAction,
  
  // Public controllers
  getProductBySlug,
};

export default productController;