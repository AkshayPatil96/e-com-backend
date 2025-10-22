import { isDate, parse } from "date-fns";
import User from "../../model/user.model";
import { redis } from "../../server";
import { loggerHelpers } from "../../utils/logger";

// Enhanced get user by id with error handling
export const getUserService = async (id: string, useCache: boolean = true) => {
  try {
    if (useCache && redis) {
      const userJson = await redis.get(id);
      if (userJson) {
        const user = JSON.parse(userJson as string);
        delete user.password;
        return { success: true, user, fromCache: true };
      }
    }

    const user = await User.findActiveOne({ _id: id })
      .populate("recentItems.recentlyViewedProducts", "name images pricing")
      .populate("recentItems.recentCategories", "name slug")
      .populate("recentItems.recentBrands", "name logo");

    if (!user) {
      return { success: false, message: "User not found", status: 404 };
    }

    return { success: true, user, fromCache: false };
  } catch (error: any) {
    loggerHelpers.security("get_user_service_error", "MEDIUM", {
      userId: id,
      error: error.message,
    });
    return {
      success: false,
      message: "Failed to fetch user",
      status: 500,
      error: error.message,
    };
  }
};

// Enhanced get all users with better filtering and error handling
export const getAllUsersService = async (
  filter: any = { isDeleted: false },
  sort: any = { createdAt: -1 },
  populate?: any,
  select?: any,
  limit?: number,
  page?: number,
) => {
  try {
    // Enhanced filtering with status validation
    const validStatuses = [
      "active",
      "inactive",
      "hold",
      "blocked",
      "suspended",
      "pending",
    ];
    if (filter.status && !validStatuses.includes(filter.status)) {
      return { success: false, message: "Invalid status filter", status: 400 };
    }

    if (page && limit) {
      const users = await User.find({ ...filter })
        .sort(sort)
        .populate(populate)
        .select(select)
        .limit(limit)
        .skip(limit * (page - 1));

      const total = await User.countDocuments(filter);

      loggerHelpers.business("users_list_accessed", {
        filter,
        page,
        limit,
        total,
      });

      return {
        success: true,
        users,
        total,
        itemsPerPage: limit,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } else {
      const users = await User.find({ ...filter })
        .sort(sort)
        .populate(populate)
        .select(select);

      const total = await User.countDocuments(filter);

      return { success: true, users, total };
    }
  } catch (error: any) {
    loggerHelpers.security("get_all_users_service_error", "MEDIUM", {
      filter,
      error: error.message,
    });
    return {
      success: false,
      message: "Failed to fetch users",
      status: 500,
      error: error.message,
    };
  }
};

// Enhanced update user with validation and cache management
export const updateUserService = async (
  filter: any,
  update: any,
  options: { validateOnly?: boolean; updateCache?: boolean } = {},
) => {
  try {
    const { validateOnly = false, updateCache = true } = options;

    // Validate update fields
    // const allowedFields = [
    //   "firstName",
    //   "lastName",
    //   "phone",
    //   "alternatePhone",
    //   "gender",
    //   "dob",
    //   "addresses",
    //   "avatar",
    //   "preferences",
    //   "status",
    // ];

    const updateKeys = Object.keys(update);
    // const invalidFields = updateKeys.filter(
    //   (key) => !allowedFields.includes(key),
    // );

    // if (invalidFields.length > 0) {
    //   return {
    //     success: false,
    //     message: `Invalid fields: ${invalidFields.join(", ")}`,
    //     status: 400,
    //   };
    // }

    // Validate specific fields
    if (update.gender && !["male", "female"].includes(update.gender)) {
      return {
        success: false,
        message: "Gender must be male or female",
        status: 400,
      };
    }

    // if (update.dob) {
    //   try {
    //     const parsedDob = isDate(update.dob)
    //       ? update.dob
    //       : parse(update.dob, "dd-mm-yyyy", new Date());
    //     if (isNaN(parsedDob.getTime())) {
    //       throw new Error("Invalid date");
    //     }
    //     update.dob = parsedDob;
    //   } catch (error) {
    //     return {
    //       success: false,
    //       message: "Invalid date format. Use dd-mm-yyyy",
    //       status: 400,
    //     };
    //   }
    // }

    if (update.addresses && Array.isArray(update.addresses)) {
      if (update.addresses.length > 5) {
        return {
          success: false,
          message: "Maximum 5 addresses allowed",
          status: 400,
        };
      }
    }

    if (validateOnly) {
      return { success: true, message: "Validation passed" };
    }

    const user = await User.findOneAndUpdate(
      { ...filter },
      { ...update, updatedAt: new Date() },
      { new: true },
    );
    console.log("user:=============> ", user);

    if (!user) {
      return { success: false, message: "User not found", status: 404 };
    }

    // Update cache if requested and Redis is available
    if (updateCache && redis) {
      try {
        const { password, ...userData } = user.toObject();
        await redis.setex(
          user._id.toString(),
          7 * 24 * 60 * 60,
          JSON.stringify(userData),
        );
      } catch (cacheError: any) {
        loggerHelpers.security("user_cache_update_failed", "LOW", {
          userId: user._id.toString(),
          error: cacheError.message,
        });
      }
    }

    loggerHelpers.business("user_updated", {
      userId: user._id.toString(),
      updatedFields: updateKeys,
    });

    return {
      success: true,
      user,
      message: "User updated successfully",
      status: 200,
    };
  } catch (error: any) {
    loggerHelpers.security("update_user_service_error", "MEDIUM", {
      filter,
      error: error.message,
    });
    return {
      success: false,
      message: "Failed to update user",
      status: 500,
      error: error.message,
    };
  }
};

// Enhanced delete user with proper logging
export const deleteUserService = async (
  id: string,
  permanent: boolean = false,
) => {
  try {
    if (permanent) {
      // Permanent deletion (hard delete)
      const user = await User.findOne({ _id: id, isDeleted: true });
      if (!user) {
        return {
          success: false,
          message: "User not found or not soft-deleted",
          status: 404,
        };
      }

      await user.deleteOne();

      // Clear cache
      if (redis) {
        await redis.del(id);
      }

      loggerHelpers.security("user_permanently_deleted", "HIGH", {
        userId: id,
        email: user.email,
      });

      return {
        success: true,
        message: "User permanently deleted",
        status: 200,
      };
    } else {
      // Soft delete
      const user = await User.findById(id);
      if (!user) {
        return { success: false, message: "User not found", status: 404 };
      }

      await user.softDelete();

      // Clear cache
      if (redis) {
        await redis.del(id);
      }

      loggerHelpers.security("user_soft_deleted", "MEDIUM", {
        userId: id,
        email: user.email,
      });

      return {
        success: true,
        message: "User soft deleted successfully",
        status: 200,
      };
    }
  } catch (error: any) {
    loggerHelpers.security("delete_user_service_error", "HIGH", {
      userId: id,
      permanent,
      error: error.message,
    });
    return {
      success: false,
      message: "Failed to delete user",
      status: 500,
      error: error.message,
    };
  }
};

// New service for password change with enhanced security
export const changePasswordService = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
) => {
  try {
    const user = await User.findById(userId).select("+password");

    if (!user) {
      return { success: false, message: "User not found", status: 404 };
    }

    const isCurrentPasswordValid = await user.comparePassword(currentPassword);

    if (!isCurrentPasswordValid) {
      loggerHelpers.security("password_change_invalid_current", "MEDIUM", {
        userId: userId,
      });
      return {
        success: false,
        message: "Current password is incorrect",
        status: 401,
      };
    }

    if (newPassword.length < 6) {
      return {
        success: false,
        message: "New password must be at least 6 characters",
        status: 400,
      };
    }

    user.password = newPassword;
    await user.save();

    // Update cache with new user data (without password)
    if (redis) {
      try {
        const { password, ...userData } = user.toObject();
        await redis.setex(userId, 7 * 24 * 60 * 60, JSON.stringify(userData));
      } catch (cacheError: any) {
        loggerHelpers.security("password_change_cache_update_failed", "LOW", {
          userId,
          error: cacheError.message,
        });
      }
    }

    loggerHelpers.security("password_changed", "MEDIUM", {
      userId: userId,
    });

    return {
      success: true,
      message: "Password changed successfully",
      status: 200,
    };
  } catch (error: any) {
    loggerHelpers.security("change_password_service_error", "HIGH", {
      userId,
      error: error.message,
    });
    return {
      success: false,
      message: "Failed to change password",
      status: 500,
      error: error.message,
    };
  }
};

// New service for account deactivation
export const deactivateAccountService = async (
  userId: string,
  password: string,
) => {
  try {
    const user = await User.findById(userId).select("+password");

    if (!user) {
      return { success: false, message: "User not found", status: 404 };
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      loggerHelpers.security("account_deactivation_invalid_password", "HIGH", {
        userId: userId,
      });
      return { success: false, message: "Invalid password", status: 401 };
    }

    // Soft delete the user
    await user.softDelete();

    // Clear cache and session
    if (redis) {
      await redis.del(userId);
    }

    loggerHelpers.security("account_deactivated", "HIGH", {
      userId: userId,
      email: user.email,
    });

    return {
      success: true,
      message: "Account deactivated successfully",
      status: 200,
    };
  } catch (error: any) {
    loggerHelpers.security("deactivate_account_service_error", "CRITICAL", {
      userId,
      error: error.message,
    });
    return {
      success: false,
      message: "Account deactivation failed",
      status: 500,
      error: error.message,
    };
  }
};
