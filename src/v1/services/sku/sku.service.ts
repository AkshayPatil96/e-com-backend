/**
 * @fileoverview SKU Service Layer
 * 
 * Provides business logic for SKU management with Redis integration for performance.
 * Handles SKU generation, validation, caching, and advanced operations.
 * 
 * @author E-commerce API Team
 * @version 1.0.0
 */

import { ClientSession, Types } from "mongoose";
import Brand from "../../../model/brand";
import Category from "../../../model/category";
import Product from "../../../model/product";
import { redis as redisClient } from "../../../server";
import ErrorHandler from "../../../utils/ErrorHandler";
import { loggerHelpers } from "../../../utils/logger";
import {
  generateSKU,
  generateSKUFromProduct,
  generateVariationSKUs,
  ISKUGenerationParams,
  ISKUGenerationResult,
  parseSKU,
  suggestSKU,
  validateSKUFormat,
} from "../../../utils/skuGenerator";

// Constants
const SKU_CACHE_TTL = 3600; // 1 hour for SKU reference data
const SKU_SEQUENCE_TTL = 86400; // 24 hours for sequence counters
const SKU_LOCK_TTL = 300; // 5 minutes for SKU reservation locks
const SKU_CACHE_PREFIX = "sku:";
const SKU_SEQUENCE_PREFIX = "sku:seq:";
const SKU_LOCK_PREFIX = "sku:lock:";
const SKU_ANALYTICS_PREFIX = "sku:analytics:";

// ================================
// PRIVATE HELPER FUNCTIONS
// ================================

/**
 * Generate cache key for SKU operations
 */
const generateCacheKey = (type: string, identifier: string): string => {
  return `${SKU_CACHE_PREFIX}${type}:${identifier}`;
};

/**
 * Generate sequence cache key
 */
const generateSequenceKey = (brandCode: string, categoryCode: string): string => {
  return `${SKU_SEQUENCE_PREFIX}${brandCode}:${categoryCode}`;
};

/**
 * Generate lock key for SKU reservation
 */
const generateLockKey = (sku: string): string => {
  return `${SKU_LOCK_PREFIX}${sku}`;
};

/**
 * Get next sequence number from Redis or MongoDB fallback
 */
const getNextSequenceNumber = async (
  brandCode: string,
  categoryCode: string
): Promise<string> => {
  const sequenceKey = generateSequenceKey(brandCode, categoryCode);
  
  try {
    // Try Redis first for better performance
    if (redisClient) {
      const nextSequence = await redisClient.incr(sequenceKey);
      
      // Set expiry on first use
      if (nextSequence === 1) {
        await redisClient.expire(sequenceKey, SKU_SEQUENCE_TTL);
        
        // Initialize with current max from database
        const pattern = `^${brandCode}-${categoryCode}-`;
        const latestProduct = await Product.findOne(
          { sku: { $regex: pattern } },
          { sku: 1 },
          { sort: { sku: -1 } }
        );
        
        if (latestProduct) {
          const skuParts = latestProduct.sku.split('-');
          const lastSequence = skuParts[skuParts.length - 1];
          const currentMax = parseInt(lastSequence) || 0;
          
          if (currentMax > 0) {
            await redisClient.set(sequenceKey, currentMax + 1);
            await redisClient.expire(sequenceKey, SKU_SEQUENCE_TTL);
            return (currentMax + 1).toString().padStart(3, '0');
          }
        }
      }
      
      return nextSequence.toString().padStart(3, '0');
    }
  } catch (error) {
    loggerHelpers.system("sku_redis_sequence_error", {
      brandCode,
      categoryCode,
      error: (error as Error).message,
    });
  }
  
  // Fallback to database-based sequence generation
  const pattern = `^${brandCode}-${categoryCode}-`;
  const latestProduct = await Product.findOne(
    { sku: { $regex: pattern } },
    { sku: 1 },
    { sort: { sku: -1 } }
  );
  
  if (!latestProduct) {
    return "001";
  }
  
  const skuParts = latestProduct.sku.split('-');
  const lastSequence = skuParts[skuParts.length - 1];
  const nextNumber = parseInt(lastSequence) + 1;
  
  return nextNumber.toString().padStart(3, '0');
};

/**
 * Reserve SKU to prevent race conditions
 */
const reserveSKU = async (sku: string, reservedBy: string): Promise<boolean> => {
  if (!redisClient) {
    return true; // Skip reservation if Redis is not available
  }
  
  try {
    const lockKey = generateLockKey(sku);
    const result = await redisClient.set(
      lockKey,
      reservedBy,
      'EX',
      SKU_LOCK_TTL,
      'NX'
    );
    
    return result === 'OK';
  } catch (error) {
    loggerHelpers.system("sku_reservation_error", {
      sku,
      reservedBy,
      error: (error as Error).message,
    });
    return true; // Fallback to allow operation
  }
};

/**
 * Release SKU reservation (internal helper)
 */
const releaseSKUReservationInternal = async (sku: string): Promise<void> => {
  if (!redisClient) {
    return;
  }
  
  try {
    const lockKey = generateLockKey(sku);
    await redisClient.del(lockKey);
  } catch (error) {
    loggerHelpers.system("sku_release_error", {
      sku,
      error: (error as Error).message,
    });
  }
};

/**
 * Check if SKU is reserved
 */
const isSKUReserved = async (sku: string): Promise<boolean> => {
  if (!redisClient) {
    return false;
  }
  
  try {
    const lockKey = generateLockKey(sku);
    const reservation = await redisClient.get(lockKey);
    return !!reservation;
  } catch (error) {
    return false;
  }
};

/**
 * Cache brand and category data for faster access
 */
const getCachedBrandCategory = async (
  brandId: string,
  categoryId: string
): Promise<{
  brand: { _id: string; name: string; code: string } | null;
  category: { _id: string; name: string; code: string } | null;
}> => {
  const brandCacheKey = generateCacheKey("brand", brandId);
  const categoryCacheKey = generateCacheKey("category", categoryId);
  
  let brand = null;
  let category = null;
  
  try {
    // Try cache first
    if (redisClient) {
      const [cachedBrand, cachedCategory] = await Promise.all([
        redisClient.get(brandCacheKey),
        redisClient.get(categoryCacheKey),
      ]);
      
      if (cachedBrand) {
        brand = JSON.parse(cachedBrand);
      }
      if (cachedCategory) {
        category = JSON.parse(cachedCategory);
      }
    }
    
    // Fetch missing data from database
    const promises = [];
    if (!brand) {
      promises.push(Brand.findById(brandId).select('name code').lean());
    } else {
      promises.push(Promise.resolve(brand));
    }
    
    if (!category) {
      promises.push(Category.findById(categoryId).select('name code').lean());
    } else {
      promises.push(Promise.resolve(category));
    }
    
    const [dbBrand, dbCategory] = await Promise.all(promises);
    
    // Cache the results
    if (redisClient) {
      if (!brand && dbBrand) {
        await redisClient.setex(brandCacheKey, SKU_CACHE_TTL, JSON.stringify(dbBrand));
        brand = dbBrand;
      }
      if (!category && dbCategory) {
        await redisClient.setex(categoryCacheKey, SKU_CACHE_TTL, JSON.stringify(dbCategory));
        category = dbCategory;
      }
    } else {
      brand = dbBrand || brand;
      category = dbCategory || category;
    }
  } catch (error) {
    loggerHelpers.system("sku_cache_error", {
      brandId,
      categoryId,
      error: (error as Error).message,
    });
    
    // Fallback to direct database queries
    [brand, category] = await Promise.all([
      Brand.findById(brandId).select('name code').lean(),
      Category.findById(categoryId).select('name code').lean(),
    ]);
  }
  
  return { brand, category };
};

/**
 * Track SKU analytics
 */
const trackSKUAnalytics = async (
  action: string,
  sku: string,
  metadata?: Record<string, any>
): Promise<void> => {
  if (!redisClient) {
    return;
  }
  
  try {
    const analyticsKey = `${SKU_ANALYTICS_PREFIX}${action}:${new Date().toISOString().split('T')[0]}`;
    
    await redisClient.hincrby(analyticsKey, sku, 1);
    await redisClient.expire(analyticsKey, 86400 * 30); // Keep for 30 days
    
    if (metadata) {
      const metadataKey = `${SKU_ANALYTICS_PREFIX}metadata:${sku}`;
      await redisClient.hset(metadataKey, metadata);
      await redisClient.expire(metadataKey, 86400 * 7); // Keep for 7 days
    }
  } catch (error) {
    loggerHelpers.system("sku_analytics_error", {
      action,
      sku,
      error: (error as Error).message,
    });
  }
};

// ================================
// PUBLIC SERVICE FUNCTIONS
// ================================

/**
 * Generate SKU with enhanced business logic and caching
 */
export const generateSKUWithCache = async (
  brandId: string,
  categoryId: string,
  options: {
    size?: string;
    color?: string;
    customSuffix?: string;
    reservedBy?: string;
    session?: ClientSession;
  } = {}
): Promise<ISKUGenerationResult & { reserved: boolean }> => {
  try {
    const { size, color, customSuffix, reservedBy, session } = options;
    
    // Get cached brand and category data
    const { brand, category } = await getCachedBrandCategory(brandId, categoryId);
    
    if (!brand) {
      throw new Error("Brand not found");
    }
    if (!category) {
      throw new Error("Category not found");
    }
    if (!brand.code) {
      throw new Error("Brand must have a code for SKU generation");
    }
    if (!category.code) {
      throw new Error("Category must have a code for SKU generation");
    }
    
    // Generate SKU with optimized sequence
    const sequence = customSuffix || await getNextSequenceNumber(brand.code, category.code);
    
    const params: ISKUGenerationParams = {
      brandCode: brand.code,
      categoryCode: category.code,
      size,
      color,
      customSuffix: sequence,
    };
    
    const skuResult = await generateSKU(params);
    
    // Reserve SKU if requested
    let reserved = false;
    if (reservedBy) {
      reserved = await reserveSKU(skuResult.sku, reservedBy);
      if (!reserved) {
        throw new Error("SKU is already reserved by another process");
      }
    }
    
    // Track analytics
    await trackSKUAnalytics("generated", skuResult.sku, {
      brandId,
      categoryId,
      brandCode: brand.code,
      categoryCode: category.code,
      generatedAt: new Date().toISOString(),
    });
    
    loggerHelpers.business("sku_generated_with_cache", {
      sku: skuResult.sku,
      brandCode: brand.code,
      categoryCode: category.code,
      reserved,
      reservedBy,
    });
    
    return {
      ...skuResult,
      reserved,
    };
  } catch (error) {
    loggerHelpers.system("sku_generation_error", {
      brandId,
      categoryId,
      error: (error as Error).message,
    });
    throw error;
  }
};

/**
 * Validate SKU with caching and enhanced checks
 */
export const validateSKUWithCache = async (
  sku: string,
  options: {
    excludeProductId?: string;
    checkReservation?: boolean;
  } = {}
): Promise<{
  isValid: boolean;
  isUnique: boolean;
  isReserved: boolean;
  formatValid: boolean;
  components?: ReturnType<typeof parseSKU>;
  existingProduct?: {
    id: string;
    name: string;
  } | null;
}> => {
  try {
    const { excludeProductId, checkReservation = true } = options;
    
    // Validate format
    const formatValid = validateSKUFormat(sku);
    if (!formatValid) {
      return {
        isValid: false,
        isUnique: false,
        isReserved: false,
        formatValid: false,
      };
    }
    
    // Parse components
    const components = parseSKU(sku);
    
    // Check uniqueness in database
    const query: any = { sku, isDeleted: false };
    if (excludeProductId) {
      query._id = { $ne: excludeProductId };
    }
    
    const existingProduct = await Product.findOne(query).select('_id name').lean();
    const isUnique = !existingProduct;
    
    // Check if SKU is reserved
    let isReserved = false;
    if (checkReservation) {
      isReserved = await isSKUReserved(sku);
    }
    
    // Track validation analytics
    await trackSKUAnalytics("validated", sku, {
      isValid: formatValid && isUnique && !isReserved,
      isUnique,
      isReserved,
      validatedAt: new Date().toISOString(),
    });
    
    return {
      isValid: formatValid && isUnique && !isReserved,
      isUnique,
      isReserved,
      formatValid,
      components,
      existingProduct: existingProduct ? {
        id: existingProduct._id.toString(),
        name: existingProduct.name,
      } : null,
    };
  } catch (error) {
    loggerHelpers.system("sku_validation_error", {
      sku,
      error: (error as Error).message,
    });
    throw error;
  }
};

/**
 * Reserve SKU for product creation process
 */
export const reserveSKUForCreation = async (
  sku: string,
  reservedBy: string,
  ttl: number = SKU_LOCK_TTL
): Promise<{
  success: boolean;
  reservationId: string;
  expiresAt: Date;
}> => {
  try {
    const reserved = await reserveSKU(sku, reservedBy);
    
    if (!reserved) {
      throw new Error("SKU is already reserved");
    }
    
    const expiresAt = new Date(Date.now() + ttl * 1000);
    
    loggerHelpers.business("sku_reserved", {
      sku,
      reservedBy,
      expiresAt,
    });
    
    return {
      success: true,
      reservationId: reservedBy,
      expiresAt,
    };
  } catch (error) {
    loggerHelpers.system("sku_reservation_error", {
      sku,
      reservedBy,
      error: (error as Error).message,
    });
    throw error;
  }
};

/**
 * Release SKU reservation (public function)
 */
export const releaseSKUReservation = async (sku: string): Promise<void> => {
  try {
    await releaseSKUReservationInternal(sku);
    
    loggerHelpers.business("sku_reservation_released", { sku });
  } catch (error) {
    loggerHelpers.system("sku_release_error", {
      sku,
      error: (error as Error).message,
    });
    throw error;
  }
};

/**
 * Get SKU reference data with caching
 */
export const getSKUReferenceData = async (): Promise<{
  pattern: string;
  example: string;
  description: string;
  brands: Array<{ id: string; name: string; code: string }>;
  categories: Array<{ id: string; name: string; code: string }>;
  sizeCodes: Record<string, string>;
  colorCodes: Record<string, string>;
}> => {
  const cacheKey = generateCacheKey("reference", "data");
  
  try {
    // Try cache first
    if (redisClient) {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        loggerHelpers.business("sku_reference_cache_hit", {});
        return JSON.parse(cached);
      }
    }
    
    // Fetch from database
    const [brands, categories] = await Promise.all([
      Brand.find({ isActive: true, isDeleted: false })
        .select('name code')
        .sort({ name: 1 })
        .lean(),
      Category.find({ isActive: true, isDeleted: false })
        .select('name code')
        .sort({ name: 1 })
        .lean(),
    ]);
    
    const referenceData = {
      pattern: "BRAND-CATEGORY-SIZE-COLOR-SEQUENCE",
      example: "NIKE-SHO-L-BLK-001",
      description: "Auto-generated based on brand, category, size, color, and sequence",
      brands: brands.map(brand => ({
        id: brand._id.toString(),
        name: brand.name,
        code: brand.code || '',
      })),
      categories: categories.map(category => ({
        id: category._id.toString(),
        name: category.name,
        code: category.code || '',
      })),
      sizeCodes: {
        "XS": "Extra Small",
        "S": "Small",
        "M": "Medium",
        "L": "Large",
        "XL": "Extra Large",
        "XXL": "Double Extra Large",
        "OS": "One Size",
      },
      colorCodes: {
        "BLK": "Black",
        "WHT": "White",
        "RED": "Red",
        "BLU": "Blue",
        "GRN": "Green",
        "NVY": "Navy",
        "GRY": "Gray",
      },
    };
    
    // Cache the result
    if (redisClient) {
      await redisClient.setex(cacheKey, SKU_CACHE_TTL, JSON.stringify(referenceData));
    }
    
    return referenceData;
  } catch (error) {
    loggerHelpers.system("sku_reference_error", {
      error: (error as Error).message,
    });
    throw error;
  }
};

/**
 * Get SKU analytics
 */
export const getSKUAnalytics = async (
  dateRange: { from: Date; to: Date }
): Promise<{
  totalGenerated: number;
  totalValidated: number;
  mostUsedPatterns: Array<{ pattern: string; count: number }>;
  recentActivity: Array<{ sku: string; action: string; timestamp: Date }>;
}> => {
  if (!redisClient) {
    return {
      totalGenerated: 0,
      totalValidated: 0,
      mostUsedPatterns: [],
      recentActivity: [],
    };
  }
  
  try {
    // This would require more complex Redis queries
    // For now, return basic structure
    return {
      totalGenerated: 0,
      totalValidated: 0,
      mostUsedPatterns: [],
      recentActivity: [],
    };
  } catch (error) {
    loggerHelpers.system("sku_analytics_error", {
      error: (error as Error).message,
    });
    return {
      totalGenerated: 0,
      totalValidated: 0,
      mostUsedPatterns: [],
      recentActivity: [],
    };
  }
};

/**
 * Bulk generate SKUs with optimized performance
 */
export const bulkGenerateSKUs = async (
  requests: Array<{
    brandId: string;
    categoryId: string;
    size?: string;
    color?: string;
    productName?: string;
  }>
): Promise<Array<{
  success: boolean;
  sku?: string;
  productName?: string;
  error?: string;
  components?: ISKUGenerationResult['components'];
}>> => {
  const results = [];
  
  // Pre-fetch all brands and categories to optimize database queries
  const brandIds = [...new Set(requests.map(req => req.brandId))];
  const categoryIds = [...new Set(requests.map(req => req.categoryId))];
  
  const [brands, categories] = await Promise.all([
    Brand.find({ _id: { $in: brandIds } }).select('name code').lean(),
    Category.find({ _id: { $in: categoryIds } }).select('name code').lean(),
  ]);
  
  const brandMap = new Map(brands.map(b => [b._id.toString(), b]));
  const categoryMap = new Map(categories.map(c => [c._id.toString(), c]));
  
  for (const request of requests) {
    try {
      const brand = brandMap.get(request.brandId);
      const category = categoryMap.get(request.categoryId);
      
      if (!brand || !category || !brand.code || !category.code) {
        results.push({
          success: false,
          productName: request.productName,
          error: 'Brand or category not found or missing code',
        });
        continue;
      }
      
      const sequence = await getNextSequenceNumber(brand.code, category.code);
      
      const skuResult = await generateSKU({
        brandCode: brand.code,
        categoryCode: category.code,
        size: request.size,
        color: request.color,
        customSuffix: sequence,
      });
      
      results.push({
        success: true,
        sku: skuResult.sku,
        productName: request.productName,
        components: skuResult.components,
      });
      
      // Track analytics
      await trackSKUAnalytics("bulk_generated", skuResult.sku, {
        brandId: request.brandId,
        categoryId: request.categoryId,
        batchGenerated: true,
      });
    } catch (error) {
      results.push({
        success: false,
        productName: request.productName,
        error: (error as Error).message,
      });
    }
  }
  
  return results;
};

// Export default service object
const skuService = {
  generateSKUWithCache,
  validateSKUWithCache,
  reserveSKUForCreation,
  releaseSKUReservation,
  getSKUReferenceData,
  getSKUAnalytics,
  bulkGenerateSKUs,
};

export default skuService;