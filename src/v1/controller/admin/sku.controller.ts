/**
 * @fileoverview SKU Controller for Admin Panel
 * 
 * Provides endpoints for SKU generation and management in the admin panel.
 * This includes generating preview SKUs for frontend forms and validating SKUs.
 * Enhanced with service layer and Redis integration for better performance.
 * 
 * @author E-commerce API Team
 * @version 2.0.0
 */

import { Request, Response } from "express";
import { loggerHelpers } from "../../../utils/logger";
import { suggestSKU } from "../../../utils/skuGenerator";
import skuService from "../../services/sku/sku.service";

/**
 * Generate SKU preview for frontend form
 * POST /api/v1/admin/sku/generate-preview
 */
export const generateSKUPreview = async (req: Request, res: Response) => {
  try {
    const { brandId, categoryId, size, color, customSuffix } = req.body;

    // Validate required fields
    if (!brandId || !categoryId) {
      return res.status(400).json({
        success: false,
        message: "Brand ID and Category ID are required",
      });
    }

    // Generate SKU using service layer
    const result = await skuService.generateSKUWithCache(brandId, categoryId, {
      size,
      color,
      customSuffix,
      reservedBy: (req as any).user.id,
    });

    loggerHelpers.business("sku_preview_generated", {
      sku: result.sku,
      userId: (req as any).user.id,
      reserved: result.reserved,
    });

    res.status(200).json({
      success: true,
      message: "SKU generated successfully",
      data: {
        sku: result.sku,
        components: result.components,
        isCustom: result.isCustom,
        reserved: result.reserved,
      },
    });
  } catch (error) {
    console.error("SKU generation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate SKU",
      error: (error as Error).message,
    });
  }
};

/**
 * Validate SKU format and check uniqueness
 * POST /api/v1/admin/sku/validate
 */
export const validateSKU = async (req: Request, res: Response) => {
  try {
    const { sku, excludeProductId } = req.body;

    if (!sku) {
      return res.status(400).json({
        success: false,
        message: "SKU is required",
      });
    }

    // Validate using service layer
    const result = await skuService.validateSKUWithCache(sku, {
      excludeProductId,
      checkReservation: true,
    });

    if (!result.formatValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid SKU format. Expected format: BRAND-CATEGORY-SIZE-COLOR-SEQUENCE",
        data: result,
      });
    }

    const message = result.isValid 
      ? "SKU is valid and unique"
      : result.isReserved 
        ? "SKU is currently reserved"
        : "SKU already exists";

    res.status(200).json({
      success: true,
      message,
      data: result,
    });
  } catch (error) {
    console.error("SKU validation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to validate SKU",
      error: (error as Error).message,
    });
  }
};

/**
 * Suggest SKU based on product name
 * POST /api/v1/admin/sku/suggest
 */
export const suggestSKUFromName = async (req: Request, res: Response) => {
  try {
    const { productName, brandId, categoryId } = req.body;

    if (!productName || !brandId || !categoryId) {
      return res.status(400).json({
        success: false,
        message: "Product name, brand ID, and category ID are required",
      });
    }

    // Get reference data first
    const referenceData = await skuService.getSKUReferenceData();
    
    const brand = referenceData.brands.find(b => b.id === brandId);
    const category = referenceData.categories.find(c => c.id === categoryId);

    if (!brand || !category) {
      return res.status(404).json({
        success: false,
        message: "Brand or category not found",
      });
    }

    if (!brand.code || !category.code) {
      return res.status(400).json({
        success: false,
        message: "Brand and category must have codes for SKU generation",
      });
    }

    // Suggest SKU
    const suggestedSKU = await suggestSKU(brand.code, category.code, productName);

    res.status(200).json({
      success: true,
      message: "SKU suggested successfully",
      data: {
        suggestedSKU,
        productName,
        brandName: brand.name,
        categoryName: category.name,
      },
    });
  } catch (error) {
    console.error("SKU suggestion error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to suggest SKU",
      error: (error as Error).message,
    });
  }
};

/**
 * Get SKU patterns and codes for reference
 * GET /api/v1/admin/sku/reference
 */
export const getSKUReference = async (req: Request, res: Response) => {
  try {
    // Get reference data using service layer with caching
    const referenceData = await skuService.getSKUReferenceData();

    res.status(200).json({
      success: true,
      message: "SKU reference data retrieved successfully",
      data: referenceData,
    });
  } catch (error) {
    console.error("SKU reference error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get SKU reference",
      error: (error as Error).message,
    });
  }
};

/**
 * Bulk generate SKUs for multiple products
 * POST /api/v1/admin/sku/bulk-generate
 */
export const bulkGenerateSKU = async (req: Request, res: Response) => {
  try {
    const { products } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Products array is required",
      });
    }

    // Use service layer for bulk generation
    const results = await skuService.bulkGenerateSKUs(products);

    res.status(200).json({
      success: true,
      message: "Bulk SKU generation completed",
      data: {
        total: products.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
      },
    });
  } catch (error) {
    console.error("Bulk SKU generation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate SKUs",
      error: (error as Error).message,
    });
  }
};

/**
 * Reserve SKU for product creation
 * POST /api/v1/admin/sku/reserve
 */
export const reserveSKU = async (req: Request, res: Response) => {
  try {
    const { sku, ttl } = req.body;
    const userId = (req as any).user.id;

    if (!sku) {
      return res.status(400).json({
        success: false,
        message: "SKU is required",
      });
    }

    const reservation = await skuService.reserveSKUForCreation(sku, userId, ttl);

    res.status(200).json({
      success: true,
      message: "SKU reserved successfully",
      data: reservation,
    });
  } catch (error) {
    console.error("SKU reservation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reserve SKU",
      error: (error as Error).message,
    });
  }
};

/**
 * Release SKU reservation
 * POST /api/v1/admin/sku/release
 */
export const releaseSKUReservation = async (req: Request, res: Response) => {
  try {
    const { sku } = req.body;

    if (!sku) {
      return res.status(400).json({
        success: false,
        message: "SKU is required",
      });
    }

    await skuService.releaseSKUReservation(sku);

    res.status(200).json({
      success: true,
      message: "SKU reservation released successfully",
    });
  } catch (error) {
    console.error("SKU release error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to release SKU reservation",
      error: (error as Error).message,
    });
  }
};

/**
 * Get SKU analytics
 * GET /api/v1/admin/sku/analytics
 */
export const getSKUAnalytics = async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;
    
    const dateRange = {
      from: from ? new Date(from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      to: to ? new Date(to as string) : new Date(),
    };

    const analytics = await skuService.getSKUAnalytics(dateRange);

    res.status(200).json({
      success: true,
      message: "SKU analytics retrieved successfully",
      data: analytics,
    });
  } catch (error) {
    console.error("SKU analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get SKU analytics",
      error: (error as Error).message,
    });
  }
};