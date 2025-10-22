import { FilterQuery, Types } from "mongoose";
import {
  IBrandAdminFilters,
  IBrandAdminItem,
  IBrandAdminListResponse,
  IBrandSearchItem,
  IBrandSearchResponse,
  IBrandStatistics,
  ICreateBrandAdminBody,
  IUpdateBrandAdminBody,
} from "../../../@types/brand-admin.type";
import { IBrand } from "../../../@types/brand.type";
import Brand from "../../../model/brand";
import { redis as redisClient } from "../../../server";
import { loggerHelpers } from "../../../utils/logger";

// Constants (module-scoped, effectively private)
const CACHE_TTL = 3600; // 1 hour
const LIST_CACHE_TTL = 1800; // 30 minutes for lists
const CACHE_PREFIX = "brand:";

// ================================
// PRIVATE HELPER FUNCTIONS
// ================================

/**
 * Generate cache key for brand list with filters
 */
const generateListCacheKey = (filters: IBrandAdminFilters): string => {
  const filterStr = JSON.stringify(filters);
  return `${CACHE_PREFIX}list:${Buffer.from(filterStr).toString("base64")}`;
};

/**
 * Generate cache key for individual brand
 */
const generateCacheKey = (identifier: string): string => {
  return `${CACHE_PREFIX}${identifier}`;
};

/**
 * Build MongoDB filter query from admin filters
 */
const buildFilterQuery = (filters: IBrandAdminFilters): FilterQuery<IBrand> => {
  const query: FilterQuery<IBrand> = {};

  // Soft delete filter
  query.isDeleted = filters.isDeleted;

  // Search filter
  if (filters.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: "i" } },
      { description: { $regex: filters.search, $options: "i" } },
      { shortDescription: { $regex: filters.search, $options: "i" } },
      { slug: { $regex: filters.search, $options: "i" } },
    ];
  }

  // Status filter
  if (filters.status !== "all") {
    query.isActive = filters.status === "active";
  }

  // Featured filter
  if (filters.featured !== "all") {
    query.isFeatured = filters.featured === "featured";
  }

  // Menu and homepage filters
  if (filters.showInMenu !== undefined) {
    query.showInMenu = filters.showInMenu;
  }

  if (filters.showInHomepage !== undefined) {
    query.showInHomepage = filters.showInHomepage;
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
    case "order":
      return { order: sortDirection, name: 1 };
    case "productCount":
      return { "analytics.productCount": sortDirection };
    case "viewCount":
      return { "analytics.viewCount": sortDirection };
    default:
      return { order: 1, name: 1 };
  }
};

/**
 * Generate slug from name
 */
const generateSlug = (name: string, existingSlugs: string[] = []): string => {
  let baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();

  if (baseSlug.startsWith("-")) baseSlug = baseSlug.substring(1);
  if (baseSlug.endsWith("-"))
    baseSlug = baseSlug.substring(0, baseSlug.length - 1);

  let slug = baseSlug;
  let counter = 1;

  while (existingSlugs.includes(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
};

/**
 * Invalidate brand-related caches
 */
const invalidateCache = async (brandId?: string): Promise<void> => {
  try {
    const patterns = [
      `${CACHE_PREFIX}list:*`,
      `${CACHE_PREFIX}statistics:*`,
      `${CACHE_PREFIX}search:*`,
    ];

    if (brandId) {
      patterns.push(`${CACHE_PREFIX}${brandId}`);
      patterns.push(`${CACHE_PREFIX}admin:${brandId}`);
      patterns.push(`${CACHE_PREFIX}slug:*`);
    }

    for (const pattern of patterns) {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    }
  } catch (error) {
    loggerHelpers.system("brand_cache_invalidation_error", {
      error: (error as Error).message,
      brandId,
    });
  }
};

// ================================
// PUBLIC API FUNCTIONS
// ================================

/**
 * Get all brands with filtering, sorting, and pagination for admin
 */
export const getAllBrandsAdmin = async (
  filters: IBrandAdminFilters,
): Promise<IBrandAdminListResponse> => {
  const cacheKey = generateListCacheKey(filters);

  try {
    const cachedResult = await redisClient.get(cacheKey);
    if (cachedResult) {
      return JSON.parse(cachedResult);
    }
  } catch (error) {
    loggerHelpers.system("brand_cache_read_error", {
      error: (error as Error).message,
      cacheKey,
    });
  }

  // Build database query
  const filterQuery = buildFilterQuery(filters);
  const sortObject = buildSortObject(filters.sortBy, filters.sortOrder);

  // Get total count
  const totalCount = await Brand.countDocuments(filterQuery);
  const totalPages = Math.ceil(totalCount / filters.limit);
  const skip = (filters.page - 1) * filters.limit;

  // Execute aggregation pipeline for enhanced data
  const pipeline = [
    { $match: filterQuery },
    {
      $lookup: {
        from: "users",
        localField: "createdBy",
        foreignField: "_id",
        as: "creator",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "updatedBy",
        foreignField: "_id",
        as: "updater",
      },
    },
    {
      $addFields: {
        createdByName: {
          $concat: [
            { $arrayElemAt: ["$creator.firstName", 0] },
            " ",
            { $arrayElemAt: ["$creator.lastName", 0] },
          ],
        },
        updatedByName: {
          $concat: [
            { $arrayElemAt: ["$updater.firstName", 0] },
            " ",
            { $arrayElemAt: ["$updater.lastName", 0] },
          ],
        },
      },
    },
    {
      $project: {
        creator: 0,
        updater: 0,
      },
    },
    { $sort: sortObject },
    { $skip: skip },
    { $limit: filters.limit },
  ];

  const brands = await Brand.aggregate(pipeline);

  // Get statistics if needed
  let statistics;
  if (filters.page === 1) {
    statistics = await getBrandStatistics();
  }

  const result: IBrandAdminListResponse = {
    data: brands,
    totalPages,
    totalCount,
    currentPage: filters.page,
    hasNextPage: filters.page < totalPages,
    hasPreviousPage: filters.page > 1,
    statistics,
  };

  // Cache the result
  try {
    await redisClient.setex(cacheKey, LIST_CACHE_TTL, JSON.stringify(result));
  } catch (error) {
    loggerHelpers.system("brand_cache_write_error", {
      error: (error as Error).message,
      cacheKey,
    });
  }

  loggerHelpers.business("brands_retrieved", {
    count: brands.length,
    totalCount,
    filters,
  });

  return result;
};

/**
 * Get brand by ID with enhanced data for admin
 */
export const getBrandByIdAdmin = async (
  brandId: string,
): Promise<IBrandAdminItem | null> => {
  // Validate ObjectId format
  if (!Types.ObjectId.isValid(brandId)) {
    loggerHelpers.system("brand_invalid_id", {
      brandId,
      action: "getBrandByIdAdmin",
    });
    return null;
  }

  const cacheKey = generateCacheKey(`admin:${brandId}`);

  try {
    const cachedResult = await redisClient.get(cacheKey);
    if (cachedResult) {
      return JSON.parse(cachedResult);
    }
  } catch (error) {
    loggerHelpers.system("brand_cache_read_error", {
      error: (error as Error).message,
      cacheKey,
    });
  }

  // Get from database with enhanced data
  const pipeline = [
    { $match: { _id: new Types.ObjectId(brandId) } },
    {
      $lookup: {
        from: "users",
        localField: "createdBy",
        foreignField: "_id",
        as: "creator",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "updatedBy",
        foreignField: "_id",
        as: "updater",
      },
    },
    {
      $addFields: {
        createdByName: {
          $concat: [
            { $arrayElemAt: ["$creator.firstName", 0] },
            " ",
            { $arrayElemAt: ["$creator.lastName", 0] },
          ],
        },
        updatedByName: {
          $concat: [
            { $arrayElemAt: ["$updater.firstName", 0] },
            " ",
            { $arrayElemAt: ["$updater.lastName", 0] },
          ],
        },
      },
    },
    {
      $project: {
        creator: 0,
        updater: 0,
      },
    },
  ];

  const result = await Brand.aggregate(pipeline);
  const brand = result[0] || null;

  if (!brand) {
    return null;
  }

  // Cache the result
  try {
    await redisClient.setex(cacheKey, CACHE_TTL, JSON.stringify(brand));
  } catch (error) {
    loggerHelpers.system("brand_cache_write_error", {
      error: (error as Error).message,
      cacheKey,
    });
  }

  return brand;
};

/**
 * Create new brand
 */
export const createBrand = async (
  data: ICreateBrandAdminBody,
  createdBy: string,
): Promise<IBrand> => {
  // Check if slug already exists and generate unique one
  const existingSlugs = await Brand.find({ isDeleted: false })
    .select("slug")
    .lean()
    .then((brands) => brands.map((b) => b.slug));

  const slug = generateSlug(data.name, existingSlugs);

  const brandData = {
    ...data,
    slug,
    createdBy,
    updatedBy: createdBy,
    order: data.order || 0,
    isActive: data.isActive !== false,
    isFeatured: data.isFeatured || false,
    showInMenu: data.showInMenu !== false,
    showInHomepage: data.showInHomepage || false,
    analytics: {
      productCount: 0,
      totalSales: 0,
      viewCount: 0,
      rating: 0,
      reviewCount: 0,
      monthlyViews: 0,
      conversionRate: 0,
    },
  };

  const brand = new Brand(brandData);
  await brand.save();

  // Invalidate cache
  await invalidateCache();

  loggerHelpers.business("brand_created", {
    brandId: brand._id,
    name: data.name,
    createdBy,
  });

  return brand;
};

/**
 * Update brand
 */
export const updateBrand = async (
  brandId: string,
  data: IUpdateBrandAdminBody,
  updatedBy: string,
): Promise<IBrand | null> => {
  const brand = await Brand.findById(brandId);
  if (!brand) {
    return null;
  }

  // Generate new slug if name changed
  if (data.name && data.name !== brand.name) {
    const existingSlugs = await Brand.find({
      _id: { $ne: brandId },
      isDeleted: false,
    })
      .select("slug")
      .lean()
      .then((brands) => brands.map((b) => b.slug));

    data.slug = generateSlug(data.name, existingSlugs);
  }

  const updatedBrand = await Brand.findByIdAndUpdate(
    brandId,
    {
      $set: {
        ...data,
        updatedBy,
        updatedAt: new Date(),
      },
    },
    { new: true },
  );

  // Invalidate cache
  await invalidateCache(brandId);

  loggerHelpers.business("brand_updated", {
    brandId,
    changes: Object.keys(data),
    updatedBy,
  });

  return updatedBrand;
};

/**
 * Update brand with raw MongoDB operations (for $unset, etc.)
 */
export const updateBrandRaw = async (
  brandId: string,
  updateOperation: any,
  updatedBy: string,
): Promise<IBrand | null> => {
  const brand = await Brand.findById(brandId);
  if (!brand) {
    return null;
  }

  // Add metadata to the update operation
  const finalUpdateOperation = {
    ...updateOperation,
    $set: {
      ...(updateOperation.$set || {}),
      updatedBy,
      updatedAt: new Date(),
    },
  };

  const updatedBrand = await Brand.findByIdAndUpdate(
    brandId,
    finalUpdateOperation,
    { new: true },
  );

  // Invalidate cache
  await invalidateCache(brandId);

  loggerHelpers.business("brand_updated_raw", {
    brandId,
    operation: Object.keys(updateOperation),
    updatedBy,
  });

  return updatedBrand;
};

/**
 * Soft delete brand
 */
export const deleteBrand = async (brandId: string): Promise<boolean> => {
  // Check if brand has products (when products are implemented)
  // This would be implemented when products are added

  const result = await Brand.findByIdAndUpdate(brandId, {
    $set: {
      isDeleted: true,
      updatedAt: new Date(),
    },
  });

  if (!result) {
    return false;
  }

  // Invalidate cache
  await invalidateCache(brandId);

  loggerHelpers.business("brand_deleted", { brandId });

  return true;
};

/**
 * Restore deleted brand
 */
export const restoreBrand = async (brandId: string): Promise<IBrand | null> => {
  const brand = await Brand.findByIdAndUpdate(
    brandId,
    {
      $set: {
        isDeleted: false,
        updatedAt: new Date(),
      },
    },
    { new: true },
  );

  if (!brand) {
    return null;
  }

  // Invalidate cache
  await invalidateCache(brandId);

  loggerHelpers.business("brand_restored", { brandId });

  return brand;
};

/**
 * Toggle brand status (active/inactive)
 */
export const toggleBrandStatus = async (
  brandId: string,
): Promise<IBrand | null> => {
  const brand = await Brand.findById(brandId);
  if (!brand) {
    return null;
  }

  const updatedBrand = await Brand.findByIdAndUpdate(
    brandId,
    {
      $set: {
        isActive: !brand.isActive,
        updatedAt: new Date(),
      },
    },
    { new: true },
  );

  // Invalidate cache
  await invalidateCache(brandId);

  loggerHelpers.business("brand_status_toggled", {
    brandId,
    newStatus: updatedBrand?.isActive ? "active" : "inactive",
  });

  return updatedBrand;
};

/**
 * Search brands for autocomplete/dropdown with pagination support
 */
export const searchBrands = async (
  query: string,
  options: {
    limit?: number;
    page?: number;
    includeDeleted?: boolean;
  } = {},
): Promise<IBrandSearchResponse> => {
  const { limit = 20, page = 1, includeDeleted = false } = options;
  const skip = (page - 1) * limit;
  const cacheKey = `${CACHE_PREFIX}search:${query}:${page}:${limit}:${includeDeleted}`;

  try {
    const cachedResult = await redisClient.get(cacheKey);
    if (cachedResult) {
      return JSON.parse(cachedResult);
    }
  } catch (error) {
    loggerHelpers.system("brand_cache_read_error", {
      error: (error as Error).message,
      cacheKey,
    });
  }

  // Build search query
  const searchQuery: FilterQuery<IBrand> = {
    isDeleted: includeDeleted,
  };

  if (query.trim()) {
    searchQuery.$or = [
      { name: { $regex: query, $options: "i" } },
      { description: { $regex: query, $options: "i" } },
      { shortDescription: { $regex: query, $options: "i" } },
    ];
  }

  // Get total count for pagination
  const totalCount = await Brand.countDocuments(searchQuery);
  const totalPages = Math.ceil(totalCount / limit);

  // Execute search with pagination
  const brands = await Brand.find(searchQuery)
    .select(
      "_id name slug description logo isActive isFeatured analytics.productCount",
    )
    .sort({ name: 1 })
    .skip(skip)
    .limit(Math.min(limit, 50)) // Max 50 results
    .lean();

  // Format results
  const results: IBrandSearchItem[] = brands.map((brand: any) => ({
    _id: brand._id.toString(),
    name: brand.name,
    slug: brand.slug,
    description: brand.description,
    logo: brand.logo,
    isActive: brand.isActive,
    isFeatured: brand.isFeatured,
    productCount: brand.analytics?.productCount || 0,
  }));

  const hasMore = page < totalPages;

  const response: IBrandSearchResponse = {
    results,
    pagination: {
      currentPage: page,
      totalPages,
      totalCount,
      hasMore,
      limit,
      count: results.length,
    },
    query: query || "",
  };

  // Cache results for 10 minutes (shorter for search results)
  try {
    await redisClient.setex(cacheKey, 600, JSON.stringify(response));
  } catch (error) {
    loggerHelpers.system("brand_cache_write_error", {
      error: (error as Error).message,
      cacheKey,
    });
  }

  return response;
};

/**
 * Get brand by slug (for public access)
 */
export const getBrandBySlug = async (slug: string): Promise<any> => {
  const cacheKey = `${CACHE_PREFIX}slug:${slug}`;

  try {
    const cachedResult = await redisClient.get(cacheKey);
    if (cachedResult) {
      return JSON.parse(cachedResult);
    }
  } catch (error) {
    loggerHelpers.system("brand_cache_read_error", {
      error: (error as Error).message,
      cacheKey,
    });
  }

  // Find brand by slug
  const brand = await Brand.findOne({ slug, isDeleted: false })
    .select("-__v -updatedBy -createdBy")
    .lean();

  if (brand) {
    // Cache the result
    try {
      await redisClient.setex(cacheKey, CACHE_TTL, JSON.stringify(brand));
    } catch (error) {
      loggerHelpers.system("brand_cache_write_error", {
        error: (error as Error).message,
        cacheKey,
      });
    }
  }

  return brand;
};

/**
 * Get brand statistics for admin dashboard
 */
export const getBrandStatistics = async (): Promise<IBrandStatistics> => {
  const cacheKey = `${CACHE_PREFIX}statistics:admin`;

  try {
    const cachedResult = await redisClient.get(cacheKey);
    if (cachedResult) {
      return JSON.parse(cachedResult);
    }
  } catch (error) {
    loggerHelpers.system("brand_cache_read_error", {
      error: (error as Error).message,
      cacheKey,
    });
  }

  const [
    totalBrands,
    activeBrands,
    inactiveBrands,
    featuredBrands,
    deletedBrands,
    brandsWithMostProducts,
    topPerformingBrands,
  ] = await Promise.all([
    Brand.countDocuments({ isDeleted: false }),
    Brand.countDocuments({ isDeleted: false, isActive: true }),
    Brand.countDocuments({ isDeleted: false, isActive: false }),
    Brand.countDocuments({ isDeleted: false, isFeatured: true }),
    Brand.countDocuments({ isDeleted: true }),
    Brand.find({ isDeleted: false, "analytics.productCount": { $gt: 0 } })
      .select("name analytics.productCount")
      .sort({ "analytics.productCount": -1 })
      .limit(5)
      .lean()
      .then((brands) =>
        brands.map((b: any) => ({
          _id: b._id.toString(),
          name: b.name,
          productCount: b.analytics.productCount,
        })),
      ),
    Brand.find({ isDeleted: false })
      .select("name analytics.viewCount analytics.productCount")
      .sort({ "analytics.viewCount": -1 })
      .limit(5)
      .lean()
      .then((brands) =>
        brands.map((b: any) => ({
          _id: b._id.toString(),
          name: b.name,
          viewCount: b.analytics.viewCount,
          productCount: b.analytics.productCount,
        })),
      ),
  ]);

  const avgProductsResult = await Brand.aggregate([
    { $match: { isDeleted: false } },
    { $group: { _id: null, avg: { $avg: "$analytics.productCount" } } },
  ]);

  const averageProductsPerBrand = avgProductsResult[0]?.avg || 0;
  const brandsWithoutProducts = await Brand.countDocuments({
    isDeleted: false,
    "analytics.productCount": 0,
  });

  const statistics: IBrandStatistics = {
    totalBrands,
    activeBrands,
    inactiveBrands,
    featuredBrands,
    deletedBrands,
    brandsWithMostProducts,
    averageProductsPerBrand: Math.round(averageProductsPerBrand * 100) / 100,
    brandsWithoutProducts,
    topPerformingBrands,
  };

  // Cache the result
  try {
    await redisClient.setex(cacheKey, CACHE_TTL, JSON.stringify(statistics));
  } catch (error) {
    loggerHelpers.system("brand_cache_write_error", {
      error: (error as Error).message,
      cacheKey,
    });
  }

  return statistics;
};

/**
 * Bulk actions on brands
 */
export const bulkAction = async (
  brandIds: string[],
  action: string,
  performedBy: string,
): Promise<{ success: number; failed: number; errors: string[] }> => {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const brandId of brandIds) {
    try {
      switch (action) {
        case "activate":
          await Brand.findByIdAndUpdate(brandId, { isActive: true });
          success++;
          break;
        case "deactivate":
          await Brand.findByIdAndUpdate(brandId, { isActive: false });
          success++;
          break;
        case "delete":
          await Brand.findByIdAndUpdate(brandId, { isDeleted: true });
          success++;
          break;
        case "restore":
          await Brand.findByIdAndUpdate(brandId, { isDeleted: false });
          success++;
          break;
        case "feature":
          await Brand.findByIdAndUpdate(brandId, { isFeatured: true });
          success++;
          break;
        case "unfeature":
          await Brand.findByIdAndUpdate(brandId, { isFeatured: false });
          success++;
          break;
        default:
          errors.push(`Invalid action: ${action}`);
          failed++;
      }
    } catch (error) {
      errors.push(
        `Failed to ${action} brand ${brandId}: ${(error as Error).message}`,
      );
      failed++;
    }
  }

  // Invalidate cache
  await invalidateCache();

  loggerHelpers.business("brand_bulk_action_completed", {
    action,
    success,
    failed,
    performedBy,
  });

  return { success, failed, errors };
};

// ================================
// DEFAULT EXPORT (for backward compatibility)
// ================================

const brandService = {
  getAllBrandsAdmin,
  getBrandByIdAdmin,
  createBrand,
  updateBrand,
  updateBrandRaw,
  deleteBrand,
  restoreBrand,
  toggleBrandStatus,
  searchBrands,
  getBrandBySlug,
  getBrandStatistics,
  bulkAction,
};

export default brandService;
