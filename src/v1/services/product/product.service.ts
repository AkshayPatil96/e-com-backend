import { ClientSession, FilterQuery, Types } from "mongoose";
import {
    ICreateProductAdminBody,
    IProductAdminFilters,
    IProductAdminItem,
    IProductAdminListResponse,
    IProductBulkActionResult,
    IProductSearchItem,
    IProductSearchResponse,
    IProductStatistics,
    IUpdateProductAdminBody,
} from "../../../@types/product-admin.type";
import { IProduct, ProductCondition, ProductStatus } from "../../../@types/product.type";
import Brand from "../../../model/brand";
import Category from "../../../model/category";
import Product from "../../../model/product";
import { redis as redisClient } from "../../../server";
import ErrorHandler from "../../../utils/ErrorHandler";
import { loggerHelpers } from "../../../utils/logger";
import { convertToSlug } from "../../../utils/logic";
import { generateSKUFromProduct } from "../../../utils/skuGenerator";
import skuService from "../sku/sku.service";

// Constants (module-scoped, effectively private)
const CACHE_TTL = 3600; // 1 hour
const LIST_CACHE_TTL = 1800; // 30 minutes for lists
const CACHE_PREFIX = "product:";

// ================================
// PRIVATE HELPER FUNCTIONS
// ================================

/**
 * Generate cache key for product list with filters
 */
const generateListCacheKey = (filters: IProductAdminFilters): string => {
  const filterStr = JSON.stringify(filters);
  return `${CACHE_PREFIX}list:${Buffer.from(filterStr).toString("base64")}`;
};

/**
 * Generate cache key for individual product
 */
const generateCacheKey = (identifier: string): string => {
  return `${CACHE_PREFIX}${identifier}`;
};

/**
 * Build MongoDB filter query from admin filters
 */
const buildFilterQuery = (
  filters: IProductAdminFilters,
): FilterQuery<IProduct> => {
  const query: FilterQuery<IProduct> = {};

  // Soft delete filter
  query.isDeleted = filters.isDeleted;

  // Search filter
  if (filters.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: "i" } },
      { description: { $regex: filters.search, $options: "i" } },
      { shortDescription: { $regex: filters.search, $options: "i" } },
      { sku: { $regex: filters.search, $options: "i" } },
      { tags: { $in: [new RegExp(filters.search, "i")] } },
    ];
  }

  // Status filter
  if (filters.status !== "all") {
    query.status = filters.status;
  }

  // Condition filter
  if (filters.condition !== "all") {
    query.condition = filters.condition;
  }

  // Category filter
  if (filters.category) {
    query.$or = [
      { category: new Types.ObjectId(filters.category) },
      { categories: { $in: [new Types.ObjectId(filters.category)] } },
    ];
  }

  // Brand filter
  if (filters.brand) {
    query.brand = new Types.ObjectId(filters.brand);
  }

  // Seller filter
  if (filters.seller) {
    query.seller = new Types.ObjectId(filters.seller);
  }

  // Featured filter
  if (filters.featured !== "all") {
    query.isFeatured = filters.featured === "featured";
  }

  // On Sale filter
  if (filters.onSale !== "all") {
    query.isOnSale = filters.onSale === "on-sale";
  }

  // Stock filter
  if (filters.inStock !== "all") {
    switch (filters.inStock) {
      case "in-stock":
        query["inventory.stockQuantity"] = { $gt: 0 };
        break;
      case "out-of-stock":
        query["inventory.stockQuantity"] = { $lte: 0 };
        break;
      case "low-stock":
        query.$expr = {
          $lte: ["$inventory.stockQuantity", "$inventory.reorderLevel"],
        };
        break;
    }
  }

  // Price range filter
  if (filters.minPrice !== undefined) {
    query["pricing.basePrice"] = { 
      ...query["pricing.basePrice"], 
      $gte: filters.minPrice 
    };
  }
  if (filters.maxPrice !== undefined) {
    query["pricing.basePrice"] = { 
      ...query["pricing.basePrice"], 
      $lte: filters.maxPrice 
    };
  }

  // Stock range filter
  if (filters.minStock !== undefined) {
    query["inventory.stockQuantity"] = { 
      ...query["inventory.stockQuantity"], 
      $gte: filters.minStock 
    };
  }
  if (filters.maxStock !== undefined) {
    query["inventory.stockQuantity"] = { 
      ...query["inventory.stockQuantity"], 
      $lte: filters.maxStock 
    };
  }

  // Rating range filter
  if (filters.minRating !== undefined) {
    query["reviews.averageRating"] = { 
      ...query["reviews.averageRating"], 
      $gte: filters.minRating 
    };
  }
  if (filters.maxRating !== undefined) {
    query["reviews.averageRating"] = { 
      ...query["reviews.averageRating"], 
      $lte: filters.maxRating 
    };
  }

  // Date range filter
  if (filters.dateFrom || filters.dateTo) {
    const dateFilter: any = {};
    if (filters.dateFrom) {
      dateFilter.$gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      dateFilter.$lte = new Date(filters.dateTo);
    }
    query.createdAt = dateFilter;
  }

  return query;
};

/**
 * Build sort object for MongoDB query
 */
const buildSortObject = (sortBy: string, sortOrder: string): any => {
  const sortDirection = sortOrder === "desc" ? -1 : 1;

  switch (sortBy) {
    case "name":
      return { name: sortDirection };
    case "createdAt":
      return { createdAt: sortDirection };
    case "updatedAt":
      return { updatedAt: sortDirection };
    case "basePrice":
      return { "pricing.basePrice": sortDirection };
    case "stockQuantity":
      return { "inventory.stockQuantity": sortDirection };
    case "soldQuantity":
      return { "inventory.soldQuantity": sortDirection };
    case "averageRating":
      return { "reviews.averageRating": sortDirection };
    case "viewCount":
      return { "analytics.viewCount": sortDirection };
    default:
      return { createdAt: -1 };
  }
};

/**
 * Map product document to admin list item
 */
const mapToAdminListItem = (product: any): IProductAdminItem => ({
  _id: product._id.toString(),
  name: product.name,
  slug: product.slug,
  sku: product.sku,
  status: product.status,
  condition: product.condition,
  isFeatured: product.isFeatured,
  isOnSale: product.isOnSale,
  isDeleted: product.isDeleted,
  image: product.images && product.images.length > 0 
    ? {
        url: product.images[0].url,
        alt: product.images[0].alt || `${product.name} image`,
      }
    : undefined,
  brand: {
    _id: product.brand._id.toString(),
    name: product.brand.name,
    slug: product.brand.slug,
  },
  category: {
    _id: product.category._id.toString(),
    name: product.category.name,
    slug: product.category.slug,
  },
  seller: {
    _id: product.seller._id.toString(),
    storeName: product.seller.storeName,
    slug: product.seller.slug,
  },
  pricing: {
    basePrice: product.pricing.basePrice,
    comparePrice: product.pricing.comparePrice,
    currency: product.pricing.currency,
  },
  inventory: {
    stockQuantity: product.inventory.stockQuantity,
    soldQuantity: product.inventory.soldQuantity,
    reservedQuantity: product.inventory.reservedQuantity,
  },
  reviews: {
    averageRating: product.reviews?.averageRating || 0,
    totalReviews: product.reviews?.totalReviews || 0,
  },
  analytics: {
    viewCount: product.analytics?.viewCount || 0,
    wishlistCount: product.analytics?.wishlistCount || 0,
    cartAddCount: product.analytics?.cartAddCount || 0,
    purchaseCount: product.analytics?.purchaseCount || 0,
  },
  createdAt: product.createdAt,
  updatedAt: product.updatedAt,
  publishedAt: product.publishedAt,
  createdBy: {
    _id: product.createdBy._id.toString(),
    firstName: product.createdBy.firstName,
    lastName: product.createdBy.lastName,
    email: product.createdBy.email,
  },
  updatedBy: {
    _id: product.updatedBy._id.toString(),
    firstName: product.updatedBy.firstName,
    lastName: product.updatedBy.lastName,
    email: product.updatedBy.email,
  },
});

/**
 * Map product document to search item
 */
const mapToSearchItem = (product: any): IProductSearchItem => ({
  _id: product._id.toString(),
  name: product.name,
  slug: product.slug,
  sku: product.sku,
  status: product.status,
  condition: product.condition,
  image: product.images && product.images.length > 0 
    ? {
        url: product.images[0].url,
        alt: product.images[0].alt || `${product.name} image`,
      }
    : undefined,
  brand: {
    _id: product.brand._id.toString(),
    name: product.brand.name,
  },
  category: {
    _id: product.category._id.toString(),
    name: product.category.name,
  },
  seller: {
    _id: product.seller._id.toString(),
    storeName: product.seller.storeName,
  },
  pricing: {
    basePrice: product.pricing.basePrice,
    currency: product.pricing.currency,
  },
  inventory: {
    stockQuantity: product.inventory.stockQuantity,
  },
});

/**
 * Invalidate cache for product
 */
const invalidateCache = async (productId?: string): Promise<void> => {
  try {
    // Get all cache keys matching the pattern
    const pattern = productId 
      ? `${CACHE_PREFIX}${productId}*` 
      : `${CACHE_PREFIX}*`;
    
    const keys = await redisClient.keys(pattern);
    
    if (keys.length > 0) {
      await redisClient.del(...keys);
      loggerHelpers.system("product_cache_invalidated", {
        productId,
        keysDeleted: keys.length,
      });
    }
  } catch (error) {
    loggerHelpers.system("product_cache_invalidation_error", {
      productId,
      error: (error as Error).message,
    });
  }
};

// ================================
// PUBLIC SERVICE FUNCTIONS
// ================================

/**
 * Get all products for admin with filtering, sorting, and pagination
 */
export const getAllProductsAdmin = async (
  filters: IProductAdminFilters,
): Promise<IProductAdminListResponse> => {
  try {
    const cacheKey = generateListCacheKey(filters);

    // Try cache first
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      loggerHelpers.business("product_admin_list_cache_hit", { filters });
      return JSON.parse(cached);
    }

    // Build query
    const query = buildFilterQuery(filters);
    const sort = buildSortObject(filters.sortBy, filters.sortOrder);
    const skip = (filters.page - 1) * filters.limit;

    // Execute query with population
    const [products, totalCount] = await Promise.all([
      Product.find(query)
        .populate("brand", "name slug")
        .populate("category", "name slug")
        .populate("seller", "storeName slug")
        .populate("createdBy", "firstName lastName email")
        .populate("updatedBy", "firstName lastName email")
        .sort(sort)
        .skip(skip)
        .limit(filters.limit)
        .lean()
        .exec(),
      Product.countDocuments(query),
    ]);

    // Map to admin list items
    const data = products.map(mapToAdminListItem);

    // Build response
    const result: IProductAdminListResponse = {
      data,
      pagination: {
        currentPage: filters.page,
        totalPages: Math.ceil(totalCount / filters.limit),
        totalCount,
        limit: filters.limit,
        hasNext: skip + products.length < totalCount,
        hasPrev: filters.page > 1,
      },
      filters,
    };

    // Cache the result
    await redisClient.setex(cacheKey, LIST_CACHE_TTL, JSON.stringify(result));

    loggerHelpers.business("product_admin_list_fetched", {
      filters,
      resultCount: data.length,
      totalCount,
    });

    return result;
  } catch (error) {
    loggerHelpers.system("product_admin_list_error", {
      filters,
      error: (error as Error).message,
    });
    throw error;
  }
};

/**
 * Get product by ID for admin
 */
export const getProductByIdAdmin = async (productId: string): Promise<IProduct | null> => {
  try {
    const cacheKey = generateCacheKey(productId);

    // Try cache first
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      loggerHelpers.business("product_admin_cache_hit", { productId });
      return JSON.parse(cached);
    }

    const product = await Product.findById(productId)
      .populate("brand", "name slug description")
      .populate("category", "name slug description")
      .populate("categories", "name slug")
      .populate("variations", "name type values")
      .populate("seller", "storeName slug contactEmail phoneNumber")
      .populate("createdBy", "firstName lastName email")
      .populate("updatedBy", "firstName lastName email")
      .exec();

    if (product) {
      // Cache the result
      await redisClient.setex(cacheKey, CACHE_TTL, JSON.stringify(product));
      loggerHelpers.business("product_admin_fetched", { productId });
    }

    return product;
  } catch (error) {
    loggerHelpers.system("product_admin_fetch_error", {
      productId,
      error: (error as Error).message,
    });
    throw error;
  }
};

/**
 * Create new product
 */
export const createProduct = async (
  productData: ICreateProductAdminBody,
  createdBy: string,
  session?: ClientSession
): Promise<IProduct> => {
  try {
    // Generate slug from name
    const slug = convertToSlug(productData.name);
    
    // Check if slug is unique
    const existingProduct = await Product.findOne({
      slug,
      isDeleted: false,
    }).session(session || null);

    if (existingProduct) {
      throw new Error("Product with similar name already exists");
    }

    // Generate SKU if not provided
    let finalSKU = productData.sku;
    
    if (!finalSKU) {
      try {
        // Use enhanced SKU service with caching and reservation
        const skuResult = await skuService.generateSKUWithCache(
          productData.brand.toString(),
          productData.category.toString(),
          {
            size: productData.attributes?.size || productData.attributes?.Size,
            color: productData.attributes?.color || productData.attributes?.Color,
            reservedBy: createdBy,
            session,
          }
        );

        finalSKU = skuResult.sku;

        loggerHelpers.business("product_sku_generated_enhanced", {
          name: productData.name,
          generatedSKU: finalSKU,
          components: skuResult.components,
          reserved: skuResult.reserved,
          createdBy,
        });
      } catch (skuError) {
        // Fallback to original SKU generation method
        loggerHelpers.system("sku_service_fallback", {
          error: (skuError as Error).message,
          productName: productData.name,
        });

        // Fetch brand and category for fallback
        const [brand, category] = await Promise.all([
          Brand.findById(productData.brand).select('code name').session(session || null),
          Category.findById(productData.category).select('code name').session(session || null)
        ]);

        if (!brand || !category || !brand.code || !category.code) {
          throw new Error("Brand and category must have codes for SKU generation");
        }

        // Generate SKU using utility function
        const skuResult = await generateSKUFromProduct({
          brand: { code: brand.code },
          category: { code: category.code },
          attributes: productData.attributes,
        });

        finalSKU = skuResult.sku;
      }
    }

    // Check if SKU is unique
    const existingSKU = await Product.findOne({
      sku: finalSKU,
      isDeleted: false,
    }).session(session || null);

    if (existingSKU) {
      throw new Error(`Product with SKU '${finalSKU}' already exists`);
    }

    // Create product
    const product = new Product({
      ...productData,
      sku: finalSKU,
      slug,
      createdBy,
      updatedBy: createdBy,
      publishedAt: productData.status === ProductStatus.PUBLISHED ? new Date() : undefined,
    });

    await product.save({ session: session || undefined });

    // Invalidate cache (outside transaction)
    if (!session) {
      await invalidateCache();
    }

    loggerHelpers.business("product_created", {
      productId: (product as any)._id.toString(),
      name: product.name,
      sku: finalSKU,
      createdBy,
    });

    return product;
  } catch (error) {
    loggerHelpers.system("product_create_error", {
      name: productData.name,
      sku: productData.sku || "auto-generate",
      error: (error as Error).message,
    });
    throw error;
  }
};

/**
 * Update product with raw MongoDB operations (for $unset, etc.)
 */
export const updateProductRaw = async (
  productId: string,
  updateOperation: any,
  updatedBy: string,
): Promise<IProduct | null> => {
  const product = await Product.findById(productId);
  if (!product) {
    return null;
  }

  // Add metadata to the update operation
  const finalUpdateOperation = {
    ...updateOperation,
    $set: {
      ...(updateOperation.$set || {}),
      updatedBy: new Types.ObjectId(updatedBy),
      updatedAt: new Date(),
    },
  };

  const updatedProduct = await Product.findByIdAndUpdate(
    productId,
    finalUpdateOperation,
    { new: true },
  );

  // Invalidate cache
  await invalidateCache(productId);

  loggerHelpers.business("product_updated_raw", {
    productId,
    operation: Object.keys(updateOperation),
    updatedBy,
  });

  return updatedProduct;
};

/**
 * Update product
 */
export const updateProduct = async (
  productId: string,
  data: IUpdateProductAdminBody,
  updatedBy: string,
): Promise<IProduct | null> => {
  const product = await Product.findById(productId);
  if (!product) {
    return null;
  }

  // Check if name is being updated and slug needs regeneration
  if (data.name && data.name !== product.name) {
    const newSlug = convertToSlug(data.name);
    const existingProduct = await Product.findOne({
      slug: newSlug,
      _id: { $ne: productId },
      isDeleted: false,
    });

    if (existingProduct) {
      throw new Error("Product with similar name already exists");
    }
    
    (data as any).slug = newSlug;
  }

  // Check if SKU is being updated and is unique
  if (data.sku && data.sku !== product.sku) {
    const existingSKU = await Product.findOne({
      sku: data.sku,
      _id: { $ne: productId },
      isDeleted: false,
    });

    if (existingSKU) {
      throw new Error("Product with this SKU already exists");
    }
  }

  // Set publishedAt if status is being changed to published
  if (data.status === ProductStatus.PUBLISHED && product.status !== ProductStatus.PUBLISHED) {
    (data as any).publishedAt = new Date();
  }

  const updatedProduct = await Product.findByIdAndUpdate(
    productId,
    {
      ...data,
      updatedBy: new Types.ObjectId(updatedBy),
      updatedAt: new Date(),
    },
    { new: true, runValidators: true },
  );

  // Invalidate cache
  await invalidateCache(productId);

  loggerHelpers.business("product_updated", {
    productId,
    name: updatedProduct?.name,
    updatedBy,
  });

  return updatedProduct;
};

/**
 * Soft delete product
 */
export const deleteProduct = async (productId: string): Promise<boolean> => {
  try {
    const result = await Product.findByIdAndUpdate(
      productId,
      {
        isDeleted: true,
        deletedAt: new Date(),
        status: ProductStatus.ARCHIVED,
      },
      { new: true },
    );

    if (result) {
      await invalidateCache(productId);
      loggerHelpers.business("product_deleted", { productId });
    }

    return !!result;
  } catch (error) {
    loggerHelpers.system("product_delete_error", {
      productId,
      error: (error as Error).message,
    });
    throw error;
  }
};

/**
 * Restore deleted product
 */
export const restoreProduct = async (
  productId: string,
): Promise<IProduct | null> => {
  try {
    const product = await Product.findByIdAndUpdate(
      productId,
      {
        isDeleted: false,
        $unset: { deletedAt: 1, deletedBy: 1 },
        status: ProductStatus.DRAFT,
      },
      { new: true },
    );

    if (product) {
      await invalidateCache(productId);
      loggerHelpers.business("product_restored", { productId });
    }

    return product;
  } catch (error) {
    loggerHelpers.system("product_restore_error", {
      productId,
      error: (error as Error).message,
    });
    throw error;
  }
};

/**
 * Toggle product status
 */
export const toggleProductStatus = async (
  productId: string,
): Promise<IProduct | null> => {
  try {
    const product = await Product.findById(productId);
    if (!product) {
      return null;
    }

    let newStatus: ProductStatus;
    switch (product.status) {
      case ProductStatus.PUBLISHED:
        newStatus = ProductStatus.DRAFT;
        break;
      case ProductStatus.DRAFT:
        newStatus = ProductStatus.PUBLISHED;
        break;
      case ProductStatus.ARCHIVED:
        newStatus = ProductStatus.DRAFT;
        break;
      default:
        newStatus = ProductStatus.DRAFT;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { 
        status: newStatus,
        publishedAt: newStatus === ProductStatus.PUBLISHED ? new Date() : undefined,
      },
      { new: true },
    );

    if (updatedProduct) {
      await invalidateCache(productId);
      loggerHelpers.business("product_status_toggled", {
        productId,
        oldStatus: product.status,
        newStatus,
      });
    }

    return updatedProduct;
  } catch (error) {
    loggerHelpers.system("product_status_toggle_error", {
      productId,
      error: (error as Error).message,
    });
    throw error;
  }
};

/**
 * Search products
 */
export const searchProducts = async (
  query: string,
  options: { limit?: number; page?: number; includeDeleted?: boolean } = {},
): Promise<IProductSearchResponse> => {
  try {
    const { limit = 20, page = 1, includeDeleted = false } = options;
    const skip = (page - 1) * limit;

    const searchQuery: FilterQuery<IProduct> = {
      isDeleted: includeDeleted ? undefined : false,
    };

    if (query) {
      searchQuery.$or = [
        { name: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
        { sku: { $regex: query, $options: "i" } },
        { tags: { $in: [new RegExp(query, "i")] } },
      ];
    }

    // Remove undefined values from query
    Object.keys(searchQuery).forEach(key => {
      if (searchQuery[key as keyof typeof searchQuery] === undefined) {
        delete searchQuery[key as keyof typeof searchQuery];
      }
    });

    const [products, totalCount] = await Promise.all([
      Product.find(searchQuery)
        .populate("brand", "name")
        .populate("category", "name")
        .populate("seller", "storeName")
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      Product.countDocuments(searchQuery),
    ]);

    const results = products.map(mapToSearchItem);

    return {
      results,
      pagination: {
        currentPage: page,
        totalCount,
        count: results.length,
        hasMore: skip + results.length < totalCount,
      },
      query,
    };
  } catch (error) {
    loggerHelpers.system("product_search_error", {
      query,
      options,
      error: (error as Error).message,
    });
    throw error;
  }
};

/**
 * Get product statistics
 */
export const getProductStatistics = async (): Promise<IProductStatistics> => {
  try {
    const cacheKey = `${CACHE_PREFIX}statistics`;

    // Try cache first
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Aggregation pipelines for statistics
    const [
      statusStats,
      stockStats,
      featureStats,
      valueStats,
      categoryStats,
      brandStats,
      sellerStats,
    ] = await Promise.all([
      // Status statistics
      Product.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      
      // Stock statistics
      Product.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: null,
            outOfStock: {
              $sum: { $cond: [{ $lte: ["$inventory.stockQuantity", 0] }, 1, 0] }
            },
            lowStock: {
              $sum: { 
                $cond: [
                  { $lte: ["$inventory.stockQuantity", "$inventory.reorderLevel"] }, 
                  1, 
                  0
                ] 
              }
            },
          }
        },
      ]),
      
      // Feature statistics
      Product.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: null,
            featured: { $sum: { $cond: ["$isFeatured", 1, 0] } },
            onSale: { $sum: { $cond: ["$isOnSale", 1, 0] } },
          }
        },
      ]),
      
      // Value statistics
      Product.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: null,
            totalValue: { $sum: { $multiply: ["$pricing.basePrice", "$inventory.stockQuantity"] } },
            averagePrice: { $avg: "$pricing.basePrice" },
            totalProducts: { $sum: 1 },
          }
        },
      ]),
      
      // Top categories
      Product.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $lookup: { from: "categories", localField: "_id", foreignField: "_id", as: "category" } },
        { $unwind: "$category" },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { _id: 1, name: "$category.name", count: 1 } },
      ]),
      
      // Top brands
      Product.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: "$brand", count: { $sum: 1 } } },
        { $lookup: { from: "brands", localField: "_id", foreignField: "_id", as: "brand" } },
        { $unwind: "$brand" },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { _id: 1, name: "$brand.name", count: 1 } },
      ]),
      
      // Top sellers
      Product.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: "$seller", count: { $sum: 1 } } },
        { $lookup: { from: "sellers", localField: "_id", foreignField: "_id", as: "seller" } },
        { $unwind: "$seller" },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { _id: 1, storeName: "$seller.storeName", count: 1 } },
      ]),
    ]);

    // Process status statistics
    const statusCounts = statusStats.reduce((acc: any, item: any) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    const totalProducts = valueStats[0]?.totalProducts || 0;

    // Calculate percentages for top categories, brands, and sellers
    const topCategories = categoryStats.map((item: any) => ({
      ...item,
      percentage: totalProducts > 0 ? Math.round((item.count / totalProducts) * 100) : 0,
    }));

    const topBrands = brandStats.map((item: any) => ({
      ...item,
      percentage: totalProducts > 0 ? Math.round((item.count / totalProducts) * 100) : 0,
    }));

    const topSellers = sellerStats.map((item: any) => ({
      ...item,
      percentage: totalProducts > 0 ? Math.round((item.count / totalProducts) * 100) : 0,
    }));

    const statistics: IProductStatistics = {
      totalProducts,
      publishedProducts: statusCounts[ProductStatus.PUBLISHED] || 0,
      draftProducts: statusCounts[ProductStatus.DRAFT] || 0,
      archivedProducts: statusCounts[ProductStatus.ARCHIVED] || 0,
      outOfStockProducts: stockStats[0]?.outOfStock || 0,
      lowStockProducts: stockStats[0]?.lowStock || 0,
      featuredProducts: featureStats[0]?.featured || 0,
      onSaleProducts: featureStats[0]?.onSale || 0,
      totalValue: valueStats[0]?.totalValue || 0,
      averagePrice: valueStats[0]?.averagePrice || 0,
      topCategories,
      topBrands,
      topSellers,
      recentActivity: [], // This would require a separate activity log system
    };

    // Cache the result for 30 minutes
    await redisClient.setex(cacheKey, 1800, JSON.stringify(statistics));

    return statistics;
  } catch (error) {
    loggerHelpers.system("product_statistics_error", {
      error: (error as Error).message,
    });
    throw error;
  }
};

/**
 * Bulk actions on products
 */
export const bulkAction = async (
  productIds: string[],
  action: string,
  performedBy: string,
): Promise<IProductBulkActionResult> => {
  const result: IProductBulkActionResult = {
    success: 0,
    failed: 0,
    errors: [],
  };

  try {
    for (const productId of productIds) {
      try {
        let updateData: any = { updatedBy: new Types.ObjectId(performedBy) };

        switch (action) {
          case "publish":
            updateData.status = ProductStatus.PUBLISHED;
            updateData.publishedAt = new Date();
            break;
          case "unpublish":
            updateData.status = ProductStatus.DRAFT;
            updateData.$unset = { publishedAt: 1 };
            break;
          case "archive":
            updateData.status = ProductStatus.ARCHIVED;
            break;
          case "restore":
            updateData.isDeleted = false;
            updateData.status = ProductStatus.DRAFT;
            updateData.$unset = { deletedAt: 1, deletedBy: 1 };
            break;
          case "delete":
            updateData.isDeleted = true;
            updateData.deletedAt = new Date();
            updateData.deletedBy = new Types.ObjectId(performedBy);
            updateData.status = ProductStatus.ARCHIVED;
            break;
          case "feature":
            updateData.isFeatured = true;
            break;
          case "unfeature":
            updateData.isFeatured = false;
            break;
          case "enable-sale":
            updateData.isOnSale = true;
            break;
          case "disable-sale":
            updateData.isOnSale = false;
            break;
          default:
            throw new Error(`Unknown action: ${action}`);
        }

        const updatedProduct = await Product.findByIdAndUpdate(
          productId,
          updateData,
          { new: true },
        );

        if (updatedProduct) {
          result.success++;
          await invalidateCache(productId);
        } else {
          result.failed++;
          result.errors.push({
            productId,
            error: "Product not found",
          });
        }
      } catch (error) {
        result.failed++;
        result.errors.push({
          productId,
          error: (error as Error).message,
        });
      }
    }

    loggerHelpers.business("product_bulk_action_completed", {
      action,
      total: productIds.length,
      success: result.success,
      failed: result.failed,
      performedBy,
    });

    return result;
  } catch (error) {
    loggerHelpers.system("product_bulk_action_error", {
      action,
      productIds: productIds.length,
      error: (error as Error).message,
      performedBy,
    });
    throw error;
  }
};

/**
 * Get product by slug for public viewing
 */
export const getProductBySlug = async (
  slug: string,
): Promise<IProduct | null> => {
  try {
    const cacheKey = generateCacheKey(`slug:${slug}`);

    // Try cache first
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const product = await Product.findOne({
      slug,
      isDeleted: false,
      status: ProductStatus.PUBLISHED,
    })
      .populate("brand", "name slug description")
      .populate("category", "name slug")
      .populate("categories", "name slug")
      .populate("variations", "name type values")
      .populate("seller", "storeName slug")
      .lean()
      .exec();

    if (product) {
      // Cache for 1 hour
      await redisClient.setex(cacheKey, CACHE_TTL, JSON.stringify(product));
    }

    return product as unknown as IProduct;
  } catch (error) {
    loggerHelpers.system("product_public_fetch_error", {
      slug,
      error: (error as Error).message,
    });
    throw error;
  }
};

// ================================
// DEFAULT EXPORT (for backward compatibility)
// ================================

const productService = {
  getAllProductsAdmin,
  getProductByIdAdmin,
  createProduct,
  updateProduct,
  updateProductRaw,
  deleteProduct,
  restoreProduct,
  toggleProductStatus,
  searchProducts,
  getProductBySlug,
  getProductStatistics,
  bulkAction,
};

export default productService;