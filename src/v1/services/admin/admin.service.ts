import { IUser, IUserPermissions } from "../../../@types/user.type";
import User from "../../../model/user.model";
import { redis } from "../../../server";
import { generateDefaultPermissions } from "../../../utils/defaultPermissions";
import { loggerHelpers } from "../../../utils/logger";

interface AdminFilters {
  page: number;
  limit: number;
  search: string;
  statusFilter: "all" | "active" | "inactive" | "never-logged";
  permissionFilter: "all" | "high" | "medium" | "low";
  sortBy: "name" | "email" | "createdAt" | "lastLogin";
  sortOrder: "asc" | "desc";
  isArchived: boolean;
}

interface AdminListResponse {
  data: any[];
  totalPages: number;
  totalCount: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface CreateAdminData {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  phone?: string;
  permissions?: IUserPermissions; // Optional - will use defaults if not provided
}

class AdminService {
  private readonly CACHE_PREFIX = "admin:";
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly LIST_CACHE_TTL = 180; // 3 minutes for lists

  /**
   * Generate cache key for admin list with filters
   */
  private generateListCacheKey(filters: AdminFilters): string {
    const filterStr = JSON.stringify(filters);
    return `${this.CACHE_PREFIX}list:${Buffer.from(filterStr).toString("base64")}`;
  }

  /**
   * Generate cache key for individual admin
   */
  private generateAdminCacheKey(adminId: string): string {
    return `${this.CACHE_PREFIX}${adminId}`;
  }

  /**
   * Calculate permission level for an admin
   */
  private calculatePermissionLevel(permissions: IUserPermissions | undefined): {
    permissionLevel: "high" | "medium" | "low";
    permissionPercentage: number;
  } {
    if (!permissions) {
      return { permissionLevel: "low", permissionPercentage: 0 };
    }

    let totalPermissions = 0;
    let grantedPermissions = 0;

    Object.keys(permissions).forEach((module) => {
      const modulePermissions = permissions[module as keyof IUserPermissions];
      if (typeof modulePermissions === "object") {
        Object.values(modulePermissions).forEach((permission) => {
          totalPermissions++;
          if (permission === true) {
            grantedPermissions++;
          }
        });
      }
    });

    const permissionPercentage =
      totalPermissions > 0
        ? Math.round((grantedPermissions / totalPermissions) * 100)
        : 0;

    let permissionLevel: "high" | "medium" | "low" = "low";
    if (permissionPercentage >= 70) {
      permissionLevel = "high";
    } else if (permissionPercentage >= 30) {
      permissionLevel = "medium";
    }

    return { permissionLevel, permissionPercentage };
  }

  /**
   * Transform admin data with calculated fields
   */
  private transformAdminData(admin: any) {
    const { permissionLevel, permissionPercentage } =
      this.calculatePermissionLevel(admin.permissions);

    return {
      ...admin,
      permissionLevel,
      permissionPercentage,
      fullName: `${admin.firstName} ${admin.lastName}`,
      adminStatus: admin.lastLogin
        ? admin.status === "active"
          ? "active"
          : "inactive"
        : "never-logged",
    };
  }

  /**
   * Invalidate admin-related caches
   */
  private async invalidateAdminCaches(adminId?: string): Promise<void> {
    try {
      // Clear individual admin cache
      if (adminId) {
        await redis.del(this.generateAdminCacheKey(adminId));
      }

      // Clear all list caches (pattern-based deletion)
      const listKeys = await redis.keys(`${this.CACHE_PREFIX}list:*`);
      if (listKeys.length > 0) {
        await redis.del(...listKeys);
      }

      loggerHelpers.business("admin_cache_invalidated", {
        adminId,
        clearedKeys: listKeys.length + (adminId ? 1 : 0),
      });
    } catch (error) {
      loggerHelpers.business("admin_cache_invalidation_failed", {
        adminId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Get all admins with filtering, sorting, and pagination
   */
  async getAllAdmins(filters: AdminFilters): Promise<AdminListResponse> {
    const cacheKey = this.generateListCacheKey(filters);

    try {
      // Try to get from cache first
      const cachedResult = await redis.get(cacheKey);
      if (cachedResult) {
        loggerHelpers.business("admin_list_cache_hit", { cacheKey });
        return JSON.parse(cachedResult);
      }
    } catch (error) {
      loggerHelpers.business("admin_list_cache_miss", {
        cacheKey,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    // Build database query
    const baseQuery: any = {
      role: "admin",
      isDeleted: filters.isArchived,
    };

    // Apply search filter
    if (filters.search) {
      baseQuery.$or = [
        { firstName: { $regex: filters.search, $options: "i" } },
        { lastName: { $regex: filters.search, $options: "i" } },
        { email: { $regex: filters.search, $options: "i" } },
        { phone: { $regex: filters.search, $options: "i" } },
      ];
    }

    // Apply status filter
    if (filters.statusFilter !== "all") {
      switch (filters.statusFilter) {
        case "active":
          baseQuery.status = "active";
          baseQuery.lastLogin = { $ne: null };
          break;
        case "inactive":
          baseQuery.status = { $in: ["inactive", "hold", "suspended"] };
          break;
        case "never-logged":
          baseQuery.lastLogin = null;
          break;
      }
    }

    // Get total count for pagination
    const totalCount = await User.countDocuments(baseQuery);
    const totalPages = Math.ceil(totalCount / filters.limit);
    const skip = (filters.page - 1) * filters.limit;

    // Build sort object
    let sortObject: any = {};
    switch (filters.sortBy) {
      case "name":
        sortObject = {
          firstName: filters.sortOrder === "asc" ? 1 : -1,
          lastName: filters.sortOrder === "asc" ? 1 : -1,
        };
        break;
      case "email":
        sortObject = { email: filters.sortOrder === "asc" ? 1 : -1 };
        break;
      case "createdAt":
        sortObject = { createdAt: filters.sortOrder === "asc" ? 1 : -1 };
        break;
      case "lastLogin":
        sortObject = { lastLogin: filters.sortOrder === "asc" ? 1 : -1 };
        break;
      default:
        sortObject = { firstName: 1, lastName: 1 };
    }

    // Fetch admins from database
    const admins = await User.find(baseQuery)
      .select(
        "firstName lastName name email permissions createdAt lastLogin profileImage phone status updatedAt",
      )
      .sort(sortObject)
      .skip(skip)
      .limit(filters.limit)
      .lean();

    // Transform admin data with calculated fields
    let transformedAdmins = admins.map(this.transformAdminData.bind(this));

    // Apply permission filter after calculation
    if (filters.permissionFilter !== "all") {
      transformedAdmins = transformedAdmins.filter(
        (admin) => admin.permissionLevel === filters.permissionFilter,
      );
    }

    // Recalculate pagination if permission filter was applied
    const finalCount =
      filters.permissionFilter !== "all"
        ? transformedAdmins.length
        : totalCount;
    const finalTotalPages = Math.ceil(finalCount / filters.limit);

    // If permission filter was applied, we need to re-paginate
    if (filters.permissionFilter !== "all") {
      const startIndex = (filters.page - 1) * filters.limit;
      const endIndex = startIndex + filters.limit;
      transformedAdmins = transformedAdmins.slice(startIndex, endIndex);
    }

    const result: AdminListResponse = {
      data: transformedAdmins,
      totalPages: finalTotalPages,
      totalCount: finalCount,
      currentPage: filters.page,
      hasNextPage: filters.page < finalTotalPages,
      hasPreviousPage: filters.page > 1,
    };

    // Cache the result
    try {
      await redis.setex(cacheKey, this.LIST_CACHE_TTL, JSON.stringify(result));
      loggerHelpers.business("admin_list_cached", { cacheKey });
    } catch (error) {
      loggerHelpers.business("admin_list_cache_failed", {
        cacheKey,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    return result;
  }

  /**
   * Get admin by ID with caching
   */
  async getAdminById(adminId: string): Promise<IUser | null> {
    const cacheKey = this.generateAdminCacheKey(adminId);

    try {
      // Try to get from cache first
      const cachedAdmin = await redis.get(cacheKey);
      if (cachedAdmin) {
        loggerHelpers.business("admin_cache_hit", { adminId });
        return JSON.parse(cachedAdmin);
      }
    } catch (error) {
      loggerHelpers.business("admin_cache_miss", {
        adminId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    // Get from database
    const admin = await User.findOne({
      _id: adminId,
      role: "admin",
      isDeleted: false,
    })
      .select(
        "permissions firstName lastName email createdAt lastLogin profileImage phone status",
      )
      .lean();

    if (!admin) {
      return null;
    }

    // Cache the result
    try {
      await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(admin));
      loggerHelpers.business("admin_cached", { adminId });
    } catch (error) {
      loggerHelpers.business("admin_cache_failed", {
        adminId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    return admin as IUser;
  }

  /**
   * Update admin permissions
   */
  async updateAdminPermissions(
    adminId: string,
    permissions: Partial<IUserPermissions>,
  ): Promise<IUser | null> {
    const admin = await User.findOne({
      _id: adminId,
      role: "admin",
      isDeleted: false,
    });

    if (!admin) {
      return null;
    }

    // Update permissions
    admin.permissions = {
      ...admin.permissions,
      ...permissions,
    } as IUserPermissions;

    await admin.save();

    // Invalidate caches
    await this.invalidateAdminCaches(adminId);

    return admin;
  }

  /**
   * Create admin with permissions
   */
  async createAdmin(adminData: CreateAdminData): Promise<IUser> {
    // Check for existing user
    const existingUser = await User.findOne({ email: adminData.email });
    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Create admin user
    const adminUser = await User.create({
      email: adminData.email,
      firstName: adminData.firstName,
      lastName: adminData.lastName,
      password: adminData.password,
      phone: adminData.phone || undefined,
      username: adminData.email.split("@")[0],
      emailVerified: true,
      loginType: "email",
      role: "admin",
      status: "active",
      addresses: [],
      recentItems: {
        recentlyViewedProducts: [],
        recentlySearchedProducts: [],
        recentCategories: [],
        recentBrands: [],
        recentSearches: [],
      },
      lastLogin: null,
      isTempPassword: true,
      permissions: adminData.permissions || generateDefaultPermissions(),
    });

    // Invalidate caches
    await this.invalidateAdminCaches();

    return adminUser;
  }

  /**
   * Check if email exists
   */
  async checkEmailExists(email: string): Promise<boolean> {
    const existingUser = await User.findOne({ email });
    return !!existingUser;
  }

  /**
   * Soft delete admin (archive)
   */
  async archiveAdmin(adminId: string): Promise<IUser | null> {
    const admin = await User.findOneAndUpdate(
      { _id: adminId, role: "admin" },
      { isDeleted: true },
      { new: true },
    );

    if (admin) {
      // Invalidate caches
      await this.invalidateAdminCaches(adminId);
    }

    return admin;
  }

  /**
   * Restore archived admin
   */
  async restoreAdmin(adminId: string): Promise<IUser | null> {
    const admin = await User.findOneAndUpdate(
      { _id: adminId, role: "admin" },
      { isDeleted: false },
      { new: true },
    );

    if (admin) {
      // Invalidate caches
      await this.invalidateAdminCaches(adminId);
    }

    return admin;
  }

  /**
   * Permanently delete admin (irreversible)
   * This completely removes the admin from the database
   */
  async permanentlyDeleteAdmin(adminId: string): Promise<IUser | null> {
    const result = await User.findOneAndDelete({
      _id: adminId,
      role: "admin",
    });

    if (result) {
      // Invalidate caches
      await this.invalidateAdminCaches(adminId);

      loggerHelpers.business("admin_permanently_deleted", {
        adminId,
        deletedCount: 1,
      });

      return result;
    }

    return null;
  }

  /**
   * Update admin basic details
   */
  async updateAdminDetails(
    adminId: string,
    updateData: any,
  ): Promise<IUser | null> {
    const admin = await User.findOneAndUpdate(
      {
        _id: adminId,
        role: "admin",
        isDeleted: false,
      },
      updateData,
      {
        new: true,
        runValidators: true,
      },
    ).select(
      "firstName lastName email phone gender dob status updatedAt profileImage",
    );

    if (!admin) {
      throw new Error("Admin not found");
    }

    // Invalidate caches
    await this.invalidateAdminCaches(adminId);

    return admin;
  }
}

export const adminService = new AdminService();
export default adminService;
