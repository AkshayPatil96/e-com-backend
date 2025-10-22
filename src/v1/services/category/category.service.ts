import { FilterQuery, Types } from "mongoose";
import {
  ICategoryAdminFilters,
  ICategoryAdminItem,
  ICategoryAdminListResponse,
  ICategoryBulkActionBody,
  ICategoryHierarchyAdminItem,
  ICategoryStatistics,
  ICreateCategoryAdminBody,
  IUpdateCategoryAdminBody,
} from "../../../@types/category-admin.type";
import { ICategory } from "../../../@types/category.type";
import Category from "../../../model/category";
import { redis } from "../../../server";
import { loggerHelpers } from "../../../utils/logger";

class CategoryService {
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly LIST_CACHE_TTL = 1800; // 30 minutes for lists
  private readonly CACHE_PREFIX = "category:";

  /**
   * Generate cache key for category list with filters
   */
  private generateListCacheKey(filters: ICategoryAdminFilters): string {
    const filterStr = JSON.stringify(filters);
    return `${this.CACHE_PREFIX}list:${Buffer.from(filterStr).toString("base64")}`;
  }

  /**
   * Generate cache key for individual category
   */
  private generateCacheKey(identifier: string): string {
    return `${this.CACHE_PREFIX}${identifier}`;
  }

  /**
   * Build MongoDB filter query from admin filters
   */
  private buildFilterQuery(
    filters: ICategoryAdminFilters,
  ): FilterQuery<ICategory> {
    const query: FilterQuery<ICategory> = {};

    // Soft delete filter
    query.isDeleted = filters.isDeleted;

    // Search filter
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: "i" } },
        { description: { $regex: filters.search, $options: "i" } },
        { shortDescription: { $regex: filters.search, $options: "i" } },
        { searchKeywords: { $in: [new RegExp(filters.search, "i")] } },
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

    // Parent filter
    if (filters.parent === "root") {
      query.parent = { $exists: false };
    } else if (filters.parent && filters.parent !== "all") {
      query.parent = filters.parent;
    }

    // Level filter
    if (filters.level !== null && !isNaN(filters.level)) {
      query.level = filters.level;
    }

    // Menu and homepage filters
    if (filters.showInMenu !== undefined) {
      query.showInMenu = filters.showInMenu;
    }

    if (filters.showInHomepage !== undefined) {
      query.showInHomepage = filters.showInHomepage;
    }

    return query;
  }

  /**
   * Build sort object for MongoDB query
   */
  private buildSortObject(sortBy: string, sortOrder: string): any {
    const sortDirection = sortOrder === "desc" ? -1 : 1;

    switch (sortBy) {
      case "name":
        return { name: sortDirection };
      case "createdAt":
        return { createdAt: sortDirection };
      case "order":
        return { order: sortDirection, name: 1 };
      case "productCount":
        return { productCount: sortDirection };
      case "viewCount":
        return { viewCount: sortDirection };
      default:
        return { order: 1, name: 1 };
    }
  }

  /**
   * Generate slug from name
   */
  private generateSlug(name: string, existingSlugs: string[] = []): string {
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
  }

  /**
   * Invalidate category-related caches
   */
  private async invalidateCache(categoryId?: string): Promise<void> {
    try {
      if (!redis || redis.status !== "ready") {
        loggerHelpers.system("redis_not_available", {
          operation: "cache_invalidation",
          categoryId,
        });
        return;
      }

      const patterns = [
        `${this.CACHE_PREFIX}list:*`,
        `${this.CACHE_PREFIX}hierarchy:*`,
        `${this.CACHE_PREFIX}statistics:*`,
        `${this.CACHE_PREFIX}search:*`,
        `${this.CACHE_PREFIX}statistics:*`,
      ];

      if (categoryId) {
        patterns.push(`${this.CACHE_PREFIX}${categoryId}`);
      }

      for (const pattern of patterns) {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      }

      loggerHelpers.business("category_cache_invalidated", {
        categoryId,
        patterns: patterns.length,
      });
    } catch (error) {
      loggerHelpers.system("category_cache_invalidation_failed", {
        categoryId,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Get all categories with filtering, sorting, and pagination for admin
   */
  async getAllCategoriesAdmin(
    filters: ICategoryAdminFilters,
  ): Promise<ICategoryAdminListResponse> {
    const cacheKey = this.generateListCacheKey(filters);

    try {
      // Try to get from cache first
      if (redis && redis.status === "ready") {
        const cachedResult = await redis.get(cacheKey);
        if (cachedResult) {
          loggerHelpers.business("category_list_cache_hit", { filters });
          return JSON.parse(cachedResult);
        }
      }
    } catch (error) {
      loggerHelpers.system("category_list_cache_error", {
        error: (error as Error).message,
      });
    }

    // Build database query
    const filterQuery = this.buildFilterQuery(filters);
    const sortObject = this.buildSortObject(filters.sortBy, filters.sortOrder);

    // Get total count
    const totalCount = await Category.countDocuments(filterQuery);
    const totalPages = Math.ceil(totalCount / filters.limit);
    const skip = (filters.page - 1) * filters.limit;

    // Execute aggregation pipeline for enhanced data
    const pipeline = [
      { $match: filterQuery },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "parent",
          as: "children",
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "parent",
          foreignField: "_id",
          as: "parentCategory",
        },
      },
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
          hasChildren: { $gt: [{ $size: "$children" }, 0] },
          childrenCount: { $size: "$children" },
          parentName: { $arrayElemAt: ["$parentCategory.name", 0] },
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
          children: 0,
          parentCategory: 0,
          creator: 0,
          updater: 0,
          attributes: 0,
          brands: 0,
          metadata: 0,
          settings: 0,
        },
      },
      { $sort: sortObject },
      { $skip: skip },
      { $limit: filters.limit },
    ];

    const categories = await Category.aggregate(pipeline);

    // Get statistics if needed
    let statistics;
    if (filters.page === 1) {
      statistics = await this.getCategoryStatistics();
    }

    const result: ICategoryAdminListResponse = {
      data: categories,
      totalPages,
      totalCount,
      currentPage: filters.page,
      hasNextPage: filters.page < totalPages,
      hasPreviousPage: filters.page > 1,
      statistics,
    };

    // Cache the result
    try {
      if (redis && redis.status === "ready") {
        await redis.setex(
          cacheKey,
          this.LIST_CACHE_TTL,
          JSON.stringify(result),
        );
        loggerHelpers.business("category_list_cached", { filters });
      }
    } catch (error) {
      loggerHelpers.system("category_list_cache_set_error", {
        error: (error as Error).message,
      });
    }

    loggerHelpers.business("categories_retrieved", {
      count: categories.length,
      totalCount,
      filters,
    });

    return result;
  }

  /**
   * Get category by ID with enhanced data for admin
   */
  async getCategoryByIdAdmin(
    categoryId: string,
  ): Promise<ICategoryAdminItem | null> {
    // Validate ObjectId format
    if (!Types.ObjectId.isValid(categoryId)) {
      loggerHelpers.system("invalid_category_id", {
        categoryId,
        error: "Invalid ObjectId format",
      });
      return null;
    }

    const cacheKey = this.generateCacheKey(`admin:${categoryId}`);

    try {
      // Try cache first
      if (redis && redis.status === "ready") {
        const cached = await redis.get(cacheKey);
        if (cached) {
          loggerHelpers.business("category_cache_hit", { categoryId });
          return JSON.parse(cached);
        }
      }
    } catch (error) {
      loggerHelpers.system("category_cache_get_error", {
        categoryId,
        error: (error as Error).message,
      });
    }

    // Get from database with enhanced data
    const pipeline = [
      { $match: { _id: new Types.ObjectId(categoryId) } },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "parent",
          as: "children",
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "parent",
          foreignField: "_id",
          as: "parentCategory",
        },
      },
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
          hasChildren: { $gt: [{ $size: "$children" }, 0] },
          childrenCount: { $size: "$children" },
          parentName: { $arrayElemAt: ["$parentCategory.name", 0] },
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
          children: 0,
          parentCategory: 0,
          creator: 0,
          updater: 0,
        },
      },
    ];

    const result = await Category.aggregate(pipeline);
    const category = result[0] || null;

    if (!category) {
      return null;
    }

    // Cache the result
    try {
      if (redis && redis.status === "ready") {
        await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(category));
        loggerHelpers.business("category_cached", { categoryId });
      }
    } catch (error) {
      loggerHelpers.system("category_cache_set_error", {
        categoryId,
        error: (error as Error).message,
      });
    }

    return category;
  }

  /**
   * Create new category
   */
  async createCategory(
    data: ICreateCategoryAdminBody,
    createdBy: string,
  ): Promise<ICategory> {
    // Check if slug already exists and generate unique one
    const existingSlugs = await Category.find({ isDeleted: false })
      .select("slug")
      .lean()
      .then((categories) => categories.map((c) => c.slug));

    const slug = this.generateSlug(data.name, existingSlugs);

    // Calculate hierarchy if parent is provided
    let level = 0;
    let ancestors: string[] = [];
    let path = data.name;
    let materializedPath = "/";

    if (data.parent) {
      const parent = await Category.findById(data.parent);
      if (!parent) {
        throw new Error("Parent category not found");
      }
      level = parent.level + 1;
      ancestors = [
        ...parent.ancestors.map((id) => id.toString()),
        parent._id.toString(),
      ];
      path = `${parent.path} > ${data.name}`;
      materializedPath = `${parent.materializedPath}${parent._id}/`;
    }

    const categoryData = {
      ...data,
      slug,
      level,
      ancestors,
      path,
      materializedPath,
      createdBy,
      updatedBy: createdBy,
      order: data.order || 0,
      isActive: data.isActive !== false, // default to true unless explicitly set to false
      productCount: 0,
      totalProductCount: 0,
      viewCount: 0,
    };

    const category = new Category(categoryData);
    await category.save();

    // Invalidate cache
    await this.invalidateCache();

    loggerHelpers.business("category_created", {
      categoryId: category._id,
      name: data.name,
      createdBy,
      level,
    });

    return category;
  }

  /**
   * Update category
   */
  async updateCategory(
    categoryId: string,
    data: IUpdateCategoryAdminBody,
    updatedBy: string,
  ): Promise<ICategory | null> {
    const category = await Category.findById(categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    // Generate new slug if name changed
    if (data.name && data.name !== category.name) {
      const existingSlugs = await Category.find({
        isDeleted: false,
        _id: { $ne: categoryId },
      })
        .select("slug")
        .lean()
        .then((categories) => categories.map((c) => c.slug));

      data.slug = this.generateSlug(data.name, existingSlugs);
    }

    // Handle parent change
    if (
      data.parent !== undefined &&
      data.parent !== category.parent?.toString()
    ) {
      if (data.parent) {
        const parent = await Category.findById(data.parent);
        if (!parent) {
          throw new Error("Parent category not found");
        }

        // Prevent circular reference
        if (
          parent.ancestors.includes(categoryId as any) ||
          parent._id.toString() === categoryId
        ) {
          throw new Error("Cannot move category to its own descendant");
        }

        data.level = parent.level + 1;
        data.ancestors = [
          ...parent.ancestors.map((id) => id.toString()),
          parent._id.toString(),
        ];
        data.path = `${parent.path} > ${data.name || category.name}`;
        data.materializedPath = `${parent.materializedPath}${parent._id}/`;
      } else {
        // Moving to root level
        data.level = 0;
        data.ancestors = [];
        data.path = data.name || category.name;
        data.materializedPath = "/";
      }
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      categoryId,
      {
        $set: {
          ...data,
          updatedBy,
          updatedAt: new Date(),
        },
      },
      { new: true, runValidators: true },
    );

    // If hierarchy changed, update all descendants
    if (data.level !== undefined || data.ancestors !== undefined) {
      await Category.updateDescendantHierarchy(categoryId);
    }

    // Invalidate cache
    await this.invalidateCache(categoryId);

    loggerHelpers.business("category_updated", {
      categoryId,
      changes: Object.keys(data),
      updatedBy,
    });

    return updatedCategory;
  }

  /**
   * Soft delete category
   */
  async deleteCategory(categoryId: string): Promise<boolean> {
    // Check if category has children
    const childrenCount = await Category.countDocuments({
      parent: categoryId,
      isDeleted: false,
    });

    if (childrenCount > 0) {
      throw new Error(
        "Cannot delete category with subcategories. Delete or move subcategories first.",
      );
    }

    // Check if category has products (if products collection exists)
    // This would be implemented when products are added

    const result = await Category.findByIdAndUpdate(categoryId, {
      $set: {
        isDeleted: true,
        updatedAt: new Date(),
      },
    });

    if (!result) {
      throw new Error("Category not found");
    }

    // Invalidate cache
    await this.invalidateCache(categoryId);

    loggerHelpers.business("category_deleted", { categoryId });

    return true;
  }

  /**
   * Restore deleted category
   */
  async restoreCategory(categoryId: string): Promise<ICategory | null> {
    const category = await Category.findByIdAndUpdate(
      categoryId,
      {
        $set: {
          isDeleted: false,
          updatedAt: new Date(),
        },
      },
      { new: true },
    );

    if (!category) {
      throw new Error("Category not found");
    }

    // Invalidate cache
    await this.invalidateCache(categoryId);

    loggerHelpers.business("category_restored", { categoryId });

    return category;
  }

  /**
   * Toggle category status (active/inactive)
   */
  async toggleCategoryStatus(categoryId: string): Promise<ICategory | null> {
    const category = await Category.findById(categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      categoryId,
      {
        $set: {
          isActive: !category.isActive,
          updatedAt: new Date(),
        },
      },
      { new: true },
    );

    // Invalidate cache
    await this.invalidateCache(categoryId);

    loggerHelpers.business("category_status_toggled", {
      categoryId,
      newStatus: updatedCategory?.isActive ? "active" : "inactive",
    });

    return updatedCategory;
  }

  /**
   * Get category hierarchy tree for admin
   */
  async getCategoryHierarchyAdmin(): Promise<ICategoryHierarchyAdminItem[]> {
    const cacheKey = `${this.CACHE_PREFIX}hierarchy:admin`;

    try {
      // Try cache first
      if (redis && redis.status === "ready") {
        const cached = await redis.get(cacheKey);
        if (cached) {
          loggerHelpers.business("category_hierarchy_cache_hit", {});
          return JSON.parse(cached);
        }
      }
    } catch (error) {
      loggerHelpers.system("category_hierarchy_cache_error", {
        error: (error as Error).message,
      });
    }

    // Build hierarchy tree using aggregation
    const categories = await Category.aggregate([
      { $match: { isDeleted: false } },
      { $sort: { order: 1, name: 1 } },
      {
        $group: {
          _id: "$parent",
          categories: {
            $push: {
              _id: "$_id",
              name: "$name",
              slug: "$slug",
              level: "$level",
              isActive: "$isActive",
              isFeatured: "$isFeatured",
              showInMenu: "$showInMenu",
              productCount: "$productCount",
              totalProductCount: "$totalProductCount",
              order: "$order",
            },
          },
        },
      },
    ]);

    // Build tree structure
    const buildTree = (parentId: any = null): ICategoryHierarchyAdminItem[] => {
      const group = categories.find((g) =>
        g._id === null && parentId === null
          ? true
          : g._id && g._id.toString() === parentId,
      );

      if (!group) return [];

      return group.categories.map((category: any) => ({
        ...category,
        children: buildTree(category._id.toString()),
      }));
    };

    const hierarchy = buildTree();

    // Cache the result
    try {
      if (redis && redis.status === "ready") {
        await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(hierarchy));
        loggerHelpers.business("category_hierarchy_cached", {});
      }
    } catch (error) {
      loggerHelpers.system("category_hierarchy_cache_set_error", {
        error: (error as Error).message,
      });
    }

    return hierarchy;
  }

  /**
   * Bulk actions on categories
   */
  async bulkAction(
    categoryIds: string[],
    action: string,
    performedBy: string,
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const categoryId of categoryIds) {
      try {
        switch (action) {
          case "activate":
            await Category.findByIdAndUpdate(categoryId, {
              $set: {
                isActive: true,
                updatedBy: performedBy,
                updatedAt: new Date(),
              },
            });
            break;
          case "deactivate":
            await Category.findByIdAndUpdate(categoryId, {
              $set: {
                isActive: false,
                updatedBy: performedBy,
                updatedAt: new Date(),
              },
            });
            break;
          case "feature":
            await Category.findByIdAndUpdate(categoryId, {
              $set: {
                isFeatured: true,
                updatedBy: performedBy,
                updatedAt: new Date(),
              },
            });
            break;
          case "unfeature":
            await Category.findByIdAndUpdate(categoryId, {
              $set: {
                isFeatured: false,
                updatedBy: performedBy,
                updatedAt: new Date(),
              },
            });
            break;
          case "delete":
            await this.deleteCategory(categoryId);
            break;
          case "restore":
            await this.restoreCategory(categoryId);
            break;
          default:
            throw new Error("Invalid action");
        }
        success++;
      } catch (error) {
        failed++;
        errors.push(`Category ${categoryId}: ${(error as Error).message}`);
        loggerHelpers.business("bulk_action_category_failed", {
          categoryId,
          action,
          error: (error as Error).message,
        });
      }
    }

    // Invalidate cache
    await this.invalidateCache();

    loggerHelpers.business("category_bulk_action_completed", {
      action,
      success,
      failed,
      performedBy,
    });

    return { success, failed, errors };
  }

  /**
   * Search categories for autocomplete/dropdown with pagination support
   */
  async searchCategories(
    query: string,
    options: {
      limit?: number;
      page?: number;
      includeDeleted?: boolean;
    } = {},
  ): Promise<{
    results: Array<{
      _id: string;
      name: string;
      slug: string;
      level: number;
      isActive: boolean;
      isFeatured: boolean;
      parentId?: string;
      parentName?: string;
    }>;
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      hasMore: boolean;
      limit: number;
      count: number;
    };
    query: string;
  }> {
    const { limit = 20, page = 1, includeDeleted = false } = options;
    const skip = (page - 1) * limit;
    const cacheKey = `${this.CACHE_PREFIX}search:${query}:${page}:${limit}:${includeDeleted}`;

    try {
      // Try cache first
      if (redis && redis.status === "ready") {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      }
    } catch (error) {
      loggerHelpers.system("category_search_cache_error", {
        error: (error as Error).message,
      });
    }

    // Build search query
    const searchQuery: FilterQuery<ICategory> = {
      isDeleted: includeDeleted,
    };

    if (query.trim()) {
      searchQuery.$or = [
        { name: { $regex: query.trim(), $options: "i" } },
        { slug: { $regex: query.trim(), $options: "i" } },
        { description: { $regex: query.trim(), $options: "i" } },
      ];
    }

    // Get total count for pagination
    const totalCount = await Category.countDocuments(searchQuery);
    const totalPages = Math.ceil(totalCount / limit);

    // Execute search with pagination
    const categories = await Category.find(searchQuery)
      .select("_id name slug level isActive isFeatured parent")
      .populate("parent", "name")
      .sort({ level: 1, name: 1 })
      .skip(skip)
      .limit(Math.min(limit, 50)) // Cap at 50 results per page
      .lean();

    // Format results
    const results = categories.map((category: any) => ({
      _id: category._id.toString(),
      name: category.name,
      slug: category.slug,
      level: category.level,
      isActive: category.isActive,
      isFeatured: category.isFeatured,
      parentId: category.parent?._id?.toString(),
      parentName: category.parent?.name,
    }));

    const hasMore = page < totalPages;

    const response = {
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
      if (redis && redis.status === "ready") {
        await redis.setex(cacheKey, 600, JSON.stringify(response));
      }
    } catch (error) {
      loggerHelpers.system("category_search_cache_set_error", {
        error: (error as Error).message,
      });
    }

    return response;
  }

  /**
   * Get category by slug (for public access)
   */
  async getCategoryBySlug(slug: string): Promise<any> {
    const cacheKey = `${this.CACHE_PREFIX}slug:${slug}`;

    try {
      // Try cache first
      if (redis && redis.status === "ready") {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      }
    } catch (error) {
      loggerHelpers.system("category_by_slug_cache_error", {
        error: (error as Error).message,
      });
    }

    // Find category by slug with parent information
    const category = await Category.findOne({ slug, isDeleted: false })
      .populate("parent", "name slug")
      .select("-__v -updatedBy -createdBy")
      .lean();

    if (category) {
      // Cache for 1 hour
      try {
        if (redis && redis.status === "ready") {
          await redis.setex(cacheKey, 3600, JSON.stringify(category));
        }
      } catch (error) {
        loggerHelpers.system("category_by_slug_cache_set_error", {
          error: (error as Error).message,
        });
      }
    }

    return category;
  }

  /**
   * Get category statistics for admin dashboard
   */
  async getCategoryStatistics(): Promise<ICategoryStatistics> {
    const cacheKey = `${this.CACHE_PREFIX}statistics:admin`;

    try {
      // Try cache first
      if (redis && redis.status === "ready") {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      }
    } catch (error) {
      loggerHelpers.system("category_statistics_cache_error", {
        error: (error as Error).message,
      });
    }

    const [
      totalCategories,
      activeCategories,
      inactiveCategories,
      featuredCategories,
      deletedCategories,
      rootCategories,
      leafCategories,
      categoriesWithMostProducts,
    ] = await Promise.all([
      Category.countDocuments({ isDeleted: false }),
      Category.countDocuments({ isDeleted: false, isActive: true }),
      Category.countDocuments({ isDeleted: false, isActive: false }),
      Category.countDocuments({ isDeleted: false, isFeatured: true }),
      Category.countDocuments({ isDeleted: true }),
      Category.countDocuments({ isDeleted: false, parent: { $exists: false } }),
      Category.aggregate([
        { $match: { isDeleted: false } },
        {
          $lookup: {
            from: "categories",
            localField: "_id",
            foreignField: "parent",
            as: "children",
          },
        },
        { $match: { children: { $size: 0 } } },
        { $count: "leafCategories" },
      ]).then((result) => result[0]?.leafCategories || 0),
      Category.find({ isDeleted: false, productCount: { $gt: 0 } })
        .select("name productCount")
        .sort({ productCount: -1 })
        .limit(5)
        .lean()
        .then((categories) =>
          categories.map((c) => ({
            _id: c._id.toString(),
            name: c.name,
            productCount: c.productCount,
          })),
        ),
    ]);

    const avgProductsResult = await Category.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: null, avg: { $avg: "$productCount" } } },
    ]);

    const averageProductsPerCategory = avgProductsResult[0]?.avg || 0;
    const categoriesWithoutProducts = await Category.countDocuments({
      isDeleted: false,
      productCount: 0,
    });

    const statistics: ICategoryStatistics = {
      totalCategories,
      activeCategories,
      inactiveCategories,
      featuredCategories,
      deletedCategories,
      rootCategories,
      leafCategories,
      averageProductsPerCategory:
        Math.round(averageProductsPerCategory * 100) / 100,
      categoriesWithoutProducts,
      categoriesWithMostProducts,
    };

    // Cache the result
    try {
      if (redis && redis.status === "ready") {
        await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(statistics));
      }
    } catch (error) {
      loggerHelpers.system("category_statistics_cache_set_error", {
        error: (error as Error).message,
      });
    }

    return statistics;
  }

  /**
   * Move category to different parent or change order
   */
  async moveCategory(
    categoryId: string,
    newParentId?: string,
    newOrder?: number,
  ): Promise<ICategory | null> {
    const category = await Category.findById(categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    const updateData: any = {};

    // Handle parent change
    if (newParentId !== undefined) {
      if (newParentId) {
        const newParent = await Category.findById(newParentId);
        if (!newParent) {
          throw new Error("New parent category not found");
        }

        // Prevent circular reference
        if (
          newParent.ancestors.includes(categoryId as any) ||
          newParent._id.toString() === categoryId
        ) {
          throw new Error("Cannot move category to its own descendant");
        }

        updateData.parent = newParentId;
        updateData.level = newParent.level + 1;
        updateData.ancestors = [
          ...newParent.ancestors.map((id) => id.toString()),
          newParent._id.toString(),
        ];
        updateData.path = `${newParent.path} > ${category.name}`;
        updateData.materializedPath = `${newParent.materializedPath}${newParent._id}/`;
      } else {
        // Moving to root level
        updateData.parent = null;
        updateData.level = 0;
        updateData.ancestors = [];
        updateData.path = category.name;
        updateData.materializedPath = "/";
      }
    }

    // Handle order change
    if (newOrder !== undefined) {
      updateData.order = newOrder;
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      categoryId,
      { $set: { ...updateData, updatedAt: new Date() } },
      { new: true },
    );

    // Update all descendants if hierarchy changed
    if (updateData.level !== undefined) {
      await Category.updateDescendantHierarchy(categoryId);
    }

    // Invalidate cache
    await this.invalidateCache(categoryId);

    loggerHelpers.business("category_moved", {
      categoryId,
      newParentId,
      newOrder,
    });

    return updatedCategory;
  }
}

export const categoryService = new CategoryService();
export default categoryService;
