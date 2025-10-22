import e from "express";
import { ClientSession, FilterQuery, startSession, Types } from "mongoose";
import {
  IUserSearchItem,
  IUserSearchResponse,
} from "../../../@types/user.type";
import User from "../../../model/user";
import { redis, redis as redisClient } from "../../../server";
import ErrorHandler from "../../../utils/ErrorHandler";
import { loggerHelpers } from "../../../utils/logger";
import { convertToSlug } from "../../../utils/logic";

// Constants (module-scoped, effectively private)
const CACHE_TTL = 3600; // 1 hour
const LIST_CACHE_TTL = 1800; // 30 minutes for lists
const CACHE_PREFIX = "user:";

// ================================
// PRIVATE HELPER FUNCTIONS
// ================================

/**
 * Generate cache key for seller list with filters
 */
const generateListCacheKey = (filters: any): string => {
  const filterString = JSON.stringify(filters);
  return `${CACHE_PREFIX}list:${Buffer.from(filterString).toString("base64")}`;
};

/**
 * Generate cache key for individual seller
 */
const generateCacheKey = (identifier: string): string => {
  return `${CACHE_PREFIX}${identifier}`;
};

/**
 * Map seller document to search item
 */
const mapToSearchItem = (seller: any): IUserSearchItem => ({
  _id: seller._id.toString(),
  name: seller.firstName + " " + seller.lastName,
  email: seller.email,
  username: seller.username,
  role: seller.role,
});

const searchUsers = async (
  query: string,
  options: {
    limit: number;
    page: number;
    includeDeleted: boolean;
    excludeExistingSellers: boolean;
  },
): Promise<IUserSearchResponse> => {
  const {
    limit = 20,
    page = 1,
    includeDeleted = false,
    excludeExistingSellers = true,
  } = options;

  try {
    const searchQuery: FilterQuery<any> = {
      isDeleted: includeDeleted ? { $in: [true, false] } : false,
    };

    if (query.trim()) {
      searchQuery.$or = [
        { name: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
        { username: { $regex: query, $options: "i" } },
      ];
    }

    if (excludeExistingSellers) {
      searchQuery.role = { $ne: "seller" };
    }

    const skip = (page - 1) * limit;

    const [users, totalCount] = await Promise.all([
      User.find(searchQuery)
        .sort({ firstName: -1, lastName: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      User.countDocuments(searchQuery).exec(),
    ]);

    const results = users.map(mapToSearchItem);

    return {
      results,
      pagination: {
        page,
        limit,
        totalCount,
        hasMore: skip + limit < totalCount,
      },
    };
  } catch (error) {
    loggerHelpers.system("user_search_error", {
      query,
      error: (error as Error).message,
    });
    throw error;
  }
};

const getUserByIdAdmin = async (userId: string): Promise<any> => {
  if (!Types.ObjectId.isValid(userId)) {
    loggerHelpers.system("user_admin_get_error", {
      userId,
      error: "Invalid user ID format",
    });
    throw ErrorHandler.validation("Invalid user ID format");
  }

  const cacheKey = generateCacheKey(userId);

  try {
    if (redis && redis.status === "ready") {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        loggerHelpers.system("user_admin_get_cache_hit", { userId });
        return JSON.parse(cachedData);
      }
    }
  } catch (error) {
    loggerHelpers.system("user_admin_get_error", {
      userId,
      error: (error as Error).message,
    });
    throw error;
  }

  try {
    const seller = await User.findById(userId).lean().exec();

    if (!seller) {
      loggerHelpers.system("user_admin_get_not_found", { userId });
      throw ErrorHandler.notFound("User not found");
    }

    // Cache the result
    if (seller && redis && redis.status === "ready") {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(seller));
      loggerHelpers.system("user_admin_get_cache_set", { userId });
    }
  } catch (error) {
    loggerHelpers.system("user_admin_get_error", {
      userId,
      error: (error as Error).message,
    });
    throw error;
  }
};

const userService = {
  searchUsers,
  getUserByIdAdmin,
};

export default userService;
