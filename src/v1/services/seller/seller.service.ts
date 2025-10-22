import { ClientSession, FilterQuery, startSession, Types } from "mongoose";
import {
  ICreateSellerAdminBody,
  ISellerAdminFilters,
  ISellerAdminItem,
  ISellerAdminListResponse,
  ISellerBulkActionResult,
  ISellerSearchItem,
  ISellerSearchResponse,
  ISellerStatistics,
  IUpdateSellerAdminBody,
} from "../../../@types/seller-admin.type";
import { ISeller } from "../../../@types/seller.type";
import Seller from "../../../model/seller";
import User from "../../../model/user";
import { redis as redisClient } from "../../../server";
import ErrorHandler from "../../../utils/ErrorHandler";
import { loggerHelpers } from "../../../utils/logger";
import { convertToSlug } from "../../../utils/logic";

// Constants (module-scoped, effectively private)
const CACHE_TTL = 3600; // 1 hour
const LIST_CACHE_TTL = 1800; // 30 minutes for lists
const CACHE_PREFIX = "seller:";

// ================================
// PRIVATE HELPER FUNCTIONS
// ================================

/**
 * Generate cache key for seller list with filters
 */
const generateListCacheKey = (filters: ISellerAdminFilters): string => {
  const filterStr = JSON.stringify(filters);
  return `${CACHE_PREFIX}list:${Buffer.from(filterStr).toString("base64")}`;
};

/**
 * Generate cache key for individual seller
 */
const generateCacheKey = (identifier: string): string => {
  return `${CACHE_PREFIX}${identifier}`;
};

/**
 * Build MongoDB filter query from admin filters
 */
const buildFilterQuery = (
  filters: ISellerAdminFilters,
): FilterQuery<ISeller> => {
  const query: FilterQuery<ISeller> = {};

  // Soft delete filter
  query.isDeleted = filters.isDeleted;

  // Search filter
  if (filters.search) {
    query.$or = [
      { storeName: { $regex: filters.search, $options: "i" } },
      { storeDescription: { $regex: filters.search, $options: "i" } },
      { contactEmail: { $regex: filters.search, $options: "i" } },
      { slug: { $regex: filters.search, $options: "i" } },
      { phoneNumber: { $regex: filters.search, $options: "i" } },
    ];
  }

  // Status filter
  if (filters.status !== "all") {
    query.status = filters.status;
  }

  // Verified filter
  if (filters.verified !== "all") {
    query.isVerified = filters.verified === "verified";
  }

  // Featured filter
  if (filters.featured !== "all") {
    query.isFeatured = filters.featured === "featured";
  }

  // Category filter
  if (filters.categories && filters.categories.length > 0) {
    query.categories = {
      $in: filters.categories.split(",").map((id) => new Types.ObjectId(id)),
    };
  }

  // Sales range filter
  if (filters.minSales !== undefined) {
    query.totalSales = { ...query.totalSales, $gte: filters.minSales };
  }
  if (filters.maxSales !== undefined) {
    query.totalSales = { ...query.totalSales, $lte: filters.maxSales };
  }

  // Rating range filter
  if (filters.minRating !== undefined) {
    query["ratings.averageRating"] = {
      ...query["ratings.averageRating"],
      $gte: filters.minRating,
    };
  }
  if (filters.maxRating !== undefined) {
    query["ratings.averageRating"] = {
      ...query["ratings.averageRating"],
      $lte: filters.maxRating,
    };
  }

  return query;
};

/**
 * Build sort object for MongoDB query
 */
const buildSortObject = (sortBy: string, sortOrder: string): any => {
  const sortDirection = sortOrder === "desc" ? -1 : 1;

  switch (sortBy) {
    case "storeName":
      return { storeName: sortDirection };
    case "createdAt":
      return { createdAt: sortDirection };
    case "joinedDate":
      return { joinedDate: sortDirection };
    case "totalSales":
      return { totalSales: sortDirection };
    case "totalOrders":
      return { totalOrders: sortDirection };
    case "averageRating":
      return { "ratings.averageRating": sortDirection };
    default:
      return { createdAt: -1 };
  }
};

/**
 * Map seller document to admin list item
 */
const mapToAdminListItem = (seller: any): ISellerAdminItem => ({
  _id: seller._id.toString(),
  storeName: seller.storeName,
  slug: seller.slug,
  contactEmail: seller.contactEmail,
  phoneNumber: seller.phoneNumber,
  status: seller.status,
  isVerified: seller.isVerified,
  isDeleted: seller.isDeleted,
  isFeatured: seller.isFeatured,
  isTopSeller: seller.isTopSeller,
  image: seller.image
    ? {
        url: seller.image.url,
        alt: `${seller.storeName} logo`,
      }
    : undefined,
  totalSales: seller.totalSales,
  totalOrders: seller.totalOrders,
  totalProducts: seller.totalProducts,
  averageRating: seller.ratings?.averageRating || 0,
  totalRatings: seller.ratings?.totalRatings || 0,
  commissionRate: seller.commissionRate,
  joinedDate: seller.joinedDate,
  lastActiveDate: seller.lastActiveDate,
  createdAt: seller.createdAt,
  updatedAt: seller.updatedAt,
});

/**
 * Map seller document to search item
 */
const mapToSearchItem = (seller: any): ISellerSearchItem => ({
  _id: seller._id.toString(),
  storeName: seller.storeName,
  slug: seller.slug,
  contactEmail: seller.contactEmail,
  status: seller.status,
  isVerified: seller.isVerified,
  image: seller.image
    ? {
        url: seller.image.url,
        alt: `${seller.storeName} logo`,
      }
    : undefined,
});

/**
 * Invalidate cache for seller
 */
const invalidateCache = async (sellerId?: string): Promise<void> => {
  try {
    const keys = [`${CACHE_PREFIX}list:*`, `${CACHE_PREFIX}stats`];
    if (sellerId) {
      keys.push(generateCacheKey(sellerId));
    }

    for (const pattern of keys) {
      if (pattern.includes("*")) {
        const matchingKeys = await redisClient.keys(pattern);
        if (matchingKeys.length > 0) {
          await redisClient.del(...matchingKeys);
        }
      } else {
        await redisClient.del(pattern);
      }
    }

    loggerHelpers.system("seller_cache_invalidated", {
      sellerId,
      patterns: keys,
    });
  } catch (error) {
    loggerHelpers.system("seller_cache_invalidation_error", {
      sellerId,
      error: (error as Error).message,
    });
  }
};

// ================================
// PUBLIC SERVICE FUNCTIONS
// ================================

/**
 * Get all sellers for admin with filtering, sorting, and pagination
 */
export const getAllSellersAdmin = async (
  filters: ISellerAdminFilters,
): Promise<ISellerAdminListResponse> => {
  try {
    const cacheKey = generateListCacheKey(filters);

    // Try to get from cache first
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      loggerHelpers.business("seller_admin_list_cache_hit", { filters });
      return JSON.parse(cached);
    }

    // Build query and sort
    const query = buildFilterQuery(filters);
    const sort = buildSortObject(filters.sortBy, filters.sortOrder);

    // Calculate pagination
    const skip = (filters.page - 1) * filters.limit;

    // Execute queries in parallel
    const [sellers, totalCount] = await Promise.all([
      Seller.find(query)
        .sort(sort)
        .skip(skip)
        .limit(filters.limit)
        .populate("categories", "name slug")
        .populate("userId", "email firstName lastName")
        .lean()
        .exec(),
      Seller.countDocuments(query).exec(),
    ]);

    // Map to admin list items
    const data = sellers.map(mapToAdminListItem);

    const result: ISellerAdminListResponse = {
      data,
      totalCount,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(totalCount / filters.limit),
      hasMore: skip + sellers.length < totalCount,
    };

    // Cache the result
    await redisClient.setex(cacheKey, LIST_CACHE_TTL, JSON.stringify(result));

    loggerHelpers.business("seller_admin_list_fetched", {
      filters,
      resultCount: data.length,
      totalCount,
    });

    return result;
  } catch (error) {
    loggerHelpers.system("seller_admin_list_error", {
      filters,
      error: (error as Error).message,
    });
    throw error;
  }
};

/**
 * Get seller by ID for admin
 */
export const getSellerByIdAdmin = async (
  sellerId: string,
): Promise<ISeller | null> => {
  try {
    const cacheKey = generateCacheKey(sellerId);

    // Try cache first
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      loggerHelpers.business("seller_admin_cache_hit", { sellerId });
      return JSON.parse(cached);
    }

    const seller = await Seller.findById(sellerId)
      .populate("categories", "name slug")
      .populate("userId", "email firstName lastName")
      .exec();

    if (seller) {
      // Cache the result
      await redisClient.setex(cacheKey, CACHE_TTL, JSON.stringify(seller));
      loggerHelpers.business("seller_admin_fetched", { sellerId });
    }

    return seller;
  } catch (error) {
    loggerHelpers.system("seller_admin_fetch_error", {
      sellerId,
      error: (error as Error).message,
    });
    throw error;
  }
};

/**
 * Create new seller
 */
export const createSeller = async (
  requestData: any,
  createdBy: string,
  ip: any,
): Promise<{ seller: ISeller; newUserCreated: boolean; userId: string }> => {
  const session: ClientSession = await startSession();
  session.startTransaction();

  try {
    // Check if we need to create a User account or use existing one
    let userId = requestData.userId;
    let newUserCreated = false;

    if (!requestData.useExistingUser && !requestData.userId) {
      let userBody = {
        email: requestData.contactEmail.toLowerCase(),
        username:
          requestData.storeName.toLowerCase().replace(/[^a-z0-9]/g, "") +
          Math.floor(Math.random() * 1000),
        firstName:
          requestData.firstName ||
          requestData.storeName.split(" ")[0] ||
          "Seller",
        lastName: requestData.lastName || "Account",
        phone: requestData.phoneNumber,
        role: "seller",
        status: "active",
        emailVerified: true,
        password: requestData.password || "TempPassword123!",
        isTempPassword: true,
      };

      if (!userBody.password) {
        throw ErrorHandler.validation(
          "Password is required for new user creation",
          { field: "password" },
        );
      }

      // Check if user with this email already exists
      const existingUser = await User.findOne({
        email: userBody.email,
        isDeleted: false,
      }).session(session);

      if (existingUser) {
        // If user exists but is not a seller, update their role
        if (existingUser.role !== "seller") {
          existingUser.role = "seller";
          await existingUser.save();
          userId = existingUser._id.toString();
        } else {
          throw ErrorHandler.validation(
            "User with this email already has a seller account",
          );
        }
      } else {
        // Create new user
        const newUser = new User(userBody);
        const savedUser = await newUser.save({ session });
        userId = savedUser._id.toString();
        newUserCreated = true;

        loggerHelpers.business("seller_user_account_created", {
          userId: savedUser._id.toString(),
          email: savedUser.email,
          createdByAdmin: createdBy?.toString(),
          ip: ip,
        });
      }
    } else {
      // Verify the provided userId exists and update role if needed
      const existingUser = await User.findById(userId).session(session);
      if (!existingUser) {
        throw ErrorHandler.validation("Provided user ID does not exist");
      }
      if (existingUser.role !== "seller") {
        existingUser.role = "seller";
        await existingUser.save({ session });
      }
    }
    console.log("======================userId======================: ", userId);

    // Create seller data with minimal required fields
    const sellerData: ICreateSellerAdminBody = {
      userId: userId,
      storeName: requestData.storeName.trim(),
      slug: convertToSlug(requestData.storeName),
      storeDescription: requestData.storeDescription?.trim() || "",
      contactEmail: requestData.contactEmail.toLowerCase(),
      phoneNumber: requestData.phoneNumber.trim(),
      alternatePhone: requestData.alternatePhone?.trim(),

      // Optional fields with defaults
      categories: [],
      addresses: [],
      socialLinks: {},
      commissionRate: requestData.commissionRate || 5,
      isVerified: requestData.isVerified || false,
      isFeatured: requestData.isFeatured || false,
      isTopSeller: requestData.isTopSeller || false,
      status: requestData.status || "pending",

      // Empty optional fields
      image: undefined,
      banner: undefined,
      policies: undefined,
    };

    // Check if store name is unique
    const existingStore = await Seller.findOne({
      storeName: sellerData.storeName,
      isDeleted: false,
    }).session(session);

    if (existingStore) {
      throw ErrorHandler.validation("Store name already exists", {
        field: "storeName",
        value: sellerData.storeName,
      });
    }

    // Check if user already has a seller account
    const existingUserSeller = await Seller.findOne({
      userId: userId,
      isDeleted: false,
    }).session(session);

    if (existingUserSeller) {
      throw ErrorHandler.validation("User already has a seller account", {
        field: "userId",
        value: userId,
      });
    }

    // Create seller
    const seller = new Seller({
      ...sellerData,
      "metadata.createdBy": createdBy,
      "metadata.updatedBy": createdBy,
    });

    await seller.save({ session });
    await session.commitTransaction();
    await session.endSession();

    // Invalidate cache
    await invalidateCache();

    loggerHelpers.business("seller_created", {
      sellerId: (seller as any)._id.toString(),
      storeName: seller.storeName,
      createdBy,
    });

    return { seller, newUserCreated, userId };
  } catch (error) {
    await session.abortTransaction();
    await session.endSession();
    loggerHelpers.system("seller_create_error", {
      storeName: requestData.storeName,
      error: (error as Error).message,
    });
    throw error;
  }
};

/**
 * Update seller with raw MongoDB operations (for $unset, etc.)
 */
export const updateSellerRaw = async (
  sellerId: string,
  updateOperation: any,
  updatedBy: string,
): Promise<ISeller | null> => {
  const seller = await Seller.findById(sellerId);
  if (!seller) {
    return null;
  }

  // Add metadata to the update operation
  const finalUpdateOperation = {
    ...updateOperation,
    $set: {
      ...(updateOperation.$set || {}),
      "metadata.updatedBy": updatedBy,
      updatedAt: new Date(),
    },
  };

  const updatedSeller = await Seller.findByIdAndUpdate(
    sellerId,
    finalUpdateOperation,
    { new: true },
  );

  // Invalidate cache
  await invalidateCache(sellerId);

  loggerHelpers.business("seller_updated_raw", {
    sellerId,
    operation: Object.keys(updateOperation),
    updatedBy,
  });

  return updatedSeller;
};

/**
 * Update seller
 */
export const updateSeller = async (
  sellerId: string,
  data: IUpdateSellerAdminBody,
  updatedBy: string,
): Promise<ISeller | null> => {
  const seller = await Seller.findById(sellerId);
  if (!seller) {
    return null;
  }

  // Check if store name is unique (if being updated)
  if (data.storeName && data.storeName !== seller.storeName) {
    const existingStore = await Seller.findOne({
      storeName: data.storeName,
      _id: { $ne: sellerId },
      isDeleted: false,
    });

    if (existingStore) {
      throw new Error("Store name already exists");
    }
  }

  const updatedSeller = await Seller.findByIdAndUpdate(
    sellerId,
    {
      $set: {
        ...data,
        "metadata.updatedBy": updatedBy,
        updatedAt: new Date(),
      },
    },
    { new: true },
  );

  // Invalidate cache
  await invalidateCache(sellerId);

  loggerHelpers.business("seller_updated", {
    sellerId,
    changes: Object.keys(data),
    updatedBy,
  });

  return updatedSeller;
};

/**
 * Soft delete seller
 */
export const deleteSeller = async (sellerId: string): Promise<boolean> => {
  const result = await Seller.findByIdAndUpdate(sellerId, {
    $set: {
      isDeleted: true,
      updatedAt: new Date(),
    },
  });

  if (!result) {
    return false;
  }

  // Invalidate cache
  await invalidateCache(sellerId);

  loggerHelpers.business("seller_deleted", { sellerId });

  return true;
};

/**
 * Restore deleted seller
 */
export const restoreSeller = async (
  sellerId: string,
): Promise<ISeller | null> => {
  const seller = await Seller.findByIdAndUpdate(
    sellerId,
    {
      $set: {
        isDeleted: false,
        updatedAt: new Date(),
      },
    },
    { new: true },
  );

  if (seller) {
    // Invalidate cache
    await invalidateCache(sellerId);

    loggerHelpers.business("seller_restored", { sellerId });
  }

  return seller;
};

/**
 * Toggle seller status
 */
export const toggleSellerStatus = async (
  sellerId: string,
): Promise<ISeller | null> => {
  const seller = await Seller.findById(sellerId);
  if (!seller) {
    return null;
  }

  const newStatus = seller.status === "active" ? "inactive" : "active";

  const updatedSeller = await Seller.findByIdAndUpdate(
    sellerId,
    {
      $set: {
        status: newStatus,
        updatedAt: new Date(),
      },
    },
    { new: true },
  );

  // Invalidate cache
  await invalidateCache(sellerId);

  loggerHelpers.business("seller_status_toggled", {
    sellerId,
    newStatus,
  });

  return updatedSeller;
};

/**
 * Search sellers
 */
export const searchSellers = async (
  query: string,
  options: { limit?: number; page?: number; includeDeleted?: boolean } = {},
): Promise<ISellerSearchResponse> => {
  const { limit = 20, page = 1, includeDeleted = false } = options;

  try {
    const searchQuery: FilterQuery<ISeller> = {
      isDeleted: includeDeleted ? { $in: [true, false] } : false,
    };

    if (query.trim()) {
      searchQuery.$or = [
        { storeName: { $regex: query, $options: "i" } },
        { contactEmail: { $regex: query, $options: "i" } },
        { slug: { $regex: query, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [sellers, totalCount] = await Promise.all([
      Seller.find(searchQuery)
        .sort({ storeName: 1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      Seller.countDocuments(searchQuery).exec(),
    ]);

    const results = sellers.map(mapToSearchItem);

    return {
      results,
      pagination: {
        page,
        limit,
        totalCount,
        hasMore: skip + sellers.length < totalCount,
        count: results.length,
      },
      query,
    };
  } catch (error) {
    loggerHelpers.system("seller_search_error", {
      query,
      error: (error as Error).message,
    });
    throw error;
  }
};

/**
 * Get seller statistics
 */
export const getSellerStatistics = async (): Promise<ISellerStatistics> => {
  try {
    const cacheKey = `${CACHE_PREFIX}stats`;

    // Try cache first
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Calculate date ranges
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Execute all statistics queries
    const [
      totalSellers,
      activeSellers,
      pendingSellers,
      suspendedSellers,
      verifiedSellers,
      featuredSellers,
      topSellers,
      deletedSellers,
      newSellersThisMonth,
      newSellersLastMonth,
      statusBreakdown,
      totalSalesAgg,
      avgCommissionAgg,
    ] = await Promise.all([
      Seller.countDocuments({ isDeleted: false }),
      Seller.countDocuments({ status: "active", isDeleted: false }),
      Seller.countDocuments({ status: "pending", isDeleted: false }),
      Seller.countDocuments({ status: "suspended", isDeleted: false }),
      Seller.countDocuments({ isVerified: true, isDeleted: false }),
      Seller.countDocuments({ isFeatured: true, isDeleted: false }),
      Seller.countDocuments({ isTopSeller: true, isDeleted: false }),
      Seller.countDocuments({ isDeleted: true }),
      Seller.countDocuments({
        createdAt: { $gte: startOfMonth },
        isDeleted: false,
      }),
      Seller.countDocuments({
        createdAt: { $gte: startOfLastMonth, $lt: startOfMonth },
        isDeleted: false,
      }),
      Seller.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Seller.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: null, total: { $sum: "$totalSales" } } },
      ]),
      Seller.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: null, avg: { $avg: "$commissionRate" } } },
      ]),
    ]);

    // Process status breakdown
    const statusBreakdownMap = {
      active: 0,
      suspended: 0,
      pending: 0,
      rejected: 0,
      inactive: 0,
    };

    statusBreakdown.forEach((item: any) => {
      if (item._id in statusBreakdownMap) {
        statusBreakdownMap[item._id as keyof typeof statusBreakdownMap] =
          item.count;
      }
    });

    const statistics: ISellerStatistics = {
      totalSellers,
      activeSellers,
      pendingSellers,
      suspendedSellers,
      verifiedSellers,
      featuredSellers,
      topSellers,
      deletedSellers,
      totalSales: totalSalesAgg[0]?.total || 0,
      averageCommissionRate:
        Math.round((avgCommissionAgg[0]?.avg || 0) * 100) / 100,
      newSellersThisMonth,
      newSellersLastMonth,
      statusBreakdown: statusBreakdownMap,
      verificationBreakdown: {
        verified: verifiedSellers,
        unverified: totalSellers - verifiedSellers,
      },
    };

    // Cache the result
    await redisClient.setex(cacheKey, CACHE_TTL, JSON.stringify(statistics));

    loggerHelpers.business("seller_statistics_calculated", statistics);

    return statistics;
  } catch (error) {
    loggerHelpers.system("seller_statistics_error", {
      error: (error as Error).message,
    });
    throw error;
  }
};

/**
 * Bulk actions on sellers
 */
export const bulkAction = async (
  sellerIds: string[],
  action: string,
  performedBy: string,
): Promise<ISellerBulkActionResult> => {
  const result: ISellerBulkActionResult = {
    success: 0,
    failed: 0,
    errors: [],
  };

  try {
    for (const sellerId of sellerIds) {
      try {
        switch (action) {
          case "activate":
            await Seller.findByIdAndUpdate(sellerId, { status: "active" });
            break;
          case "suspend":
            await Seller.findByIdAndUpdate(sellerId, { status: "suspended" });
            break;
          case "delete":
            await Seller.findByIdAndUpdate(sellerId, { isDeleted: true });
            break;
          case "restore":
            await Seller.findByIdAndUpdate(sellerId, { isDeleted: false });
            break;
          case "verify":
            await Seller.findByIdAndUpdate(sellerId, { isVerified: true });
            break;
          case "unverify":
            await Seller.findByIdAndUpdate(sellerId, { isVerified: false });
            break;
          case "feature":
            await Seller.findByIdAndUpdate(sellerId, { isFeatured: true });
            break;
          case "unfeature":
            await Seller.findByIdAndUpdate(sellerId, { isFeatured: false });
            break;
          case "approve":
            await Seller.findByIdAndUpdate(sellerId, {
              status: "active",
              isVerified: true,
            });
            break;
          case "reject":
            await Seller.findByIdAndUpdate(sellerId, { status: "rejected" });
            break;
          default:
            throw new Error(`Unknown action: ${action}`);
        }
        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push(`${sellerId}: ${(error as Error).message}`);
      }
    }

    // Invalidate cache
    await invalidateCache();

    loggerHelpers.business("seller_bulk_action_completed", {
      action,
      sellerIds,
      result,
      performedBy,
    });

    return result;
  } catch (error) {
    loggerHelpers.system("seller_bulk_action_error", {
      action,
      sellerIds,
      error: (error as Error).message,
    });
    throw error;
  }
};

/**
 * Get seller by slug for public viewing
 */
export const getSellerBySlug = async (
  slug: string,
): Promise<ISeller | null> => {
  try {
    const seller = await Seller.findOne({
      slug,
      isDeleted: false,
      status: "active",
    })
      .populate("categories", "name slug")
      .select("-metadata -businessVerification")
      .lean()
      .exec();

    return seller;
  } catch (error) {
    loggerHelpers.system("seller_public_fetch_error", {
      slug,
      error: (error as Error).message,
    });
    throw error;
  }
};

// ================================
// DEFAULT EXPORT (for backward compatibility)
// ================================

const sellerService = {
  getAllSellersAdmin,
  getSellerByIdAdmin,
  createSeller,
  updateSeller,
  updateSellerRaw,
  deleteSeller,
  restoreSeller,
  toggleSellerStatus,
  searchSellers,
  getSellerBySlug,
  getSellerStatistics,
  bulkAction,
};

export default sellerService;
