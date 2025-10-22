import { NextFunction, Request, Response } from "express";
import { IUser } from "../../@types/user.type";
import { CatchAsyncErrors } from "../../middleware/catchAsyncErrors";
import { redis } from "../../server";
import ErrorHandler, {
  ErrorCategory,
  ErrorSeverity,
} from "../../utils/ErrorHandler";
import { loggerHelpers } from "../../utils/logger";
import {
  changePasswordService,
  deactivateAccountService,
  deleteUserService,
  getAllUsersService,
  getUserService,
  updateUserService,
} from "../services/user.service";

const userController = {
  // Enhanced myProfile with better error handling
  myProfile: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const userId = req.user._id.toString();

      // Log profile access
      loggerHelpers.business("user_profile_accessed", {
        userId,
        ip: req.ip,
      });

      try {
        const result = await getUserService(userId);

        if (!result.success) {
          if (result.status === 404) {
            return next(ErrorHandler.notFound("User not found"));
          }
          return next(
            new ErrorHandler(
              result.status || 500,
              result.message || "Failed to fetch user profile",
              {
                category: ErrorCategory.SYSTEM,
                severity: ErrorSeverity.MEDIUM,
                context: { originalError: result.error },
              },
            ),
          );
        }

        res.status(200).json({
          success: true,
          message: "User profile retrieved successfully",
          data: result.user,
          cached: result.fromCache,
        });
      } catch (error: any) {
        loggerHelpers.security("profile_access_error", "MEDIUM", {
          userId,
          error: error.message,
          ip: req.ip,
        });

        return next(
          new ErrorHandler(500, "Failed to retrieve user profile", {
            category: ErrorCategory.SYSTEM,
            severity: ErrorSeverity.MEDIUM,
            context: { originalError: error.message },
          }),
        );
      }
    },
  ),

  // Enhanced updateProfile with comprehensive validation
  updateProfile: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const userId = req.user._id.toString();
      const updateData = req.body;

      // Log profile update attempt
      loggerHelpers.business("user_profile_update_attempt", {
        userId,
        fields: Object.keys(updateData),
        ip: req.ip,
      });

      // Prevent updating sensitive fields
      // const restrictedFields = [
      //   "_id",
      //   "email",
      //   "password",
      //   "role",
      //   "emailVerified",
      //   "createdAt",
      //   "isDeleted",
      // ];
      // const hasRestrictedFields = restrictedFields.some((field) =>
      //   updateData.hasOwnProperty(field),
      // );

      // if (hasRestrictedFields) {
      //   const foundFields = restrictedFields.filter((field) =>
      //     updateData.hasOwnProperty(field),
      //   );

      //   loggerHelpers.security("profile_update_restricted_fields", "MEDIUM", {
      //     userId,
      //     restrictedFields: foundFields,
      //     ip: req.ip,
      //   });

      //   return next(
      //     ErrorHandler.validation("Cannot update restricted fields", {
      //       restrictedFields: foundFields,
      //       allowedFields: [
      //         "firstName",
      //         "lastName",
      //         "phone",
      //         "alternatePhone",
      //         "gender",
      //         "dob",
      //         "addresses",
      //       ],
      //     }),
      //   );
      // }

      try {
        const result = await updateUserService({ _id: userId }, updateData);
        console.log("result: ", result);

        if (!result.success) {
          if (result.status === 404) {
            return next(ErrorHandler.notFound("User not found"));
          }
          if (result.status === 400) {
            return next(
              ErrorHandler.validation(result.message || "Invalid update data"),
            );
          }
          return next(
            new ErrorHandler(
              result.status || 500,
              result.message || "Failed to update profile",
              {
                category: ErrorCategory.SYSTEM,
                severity: ErrorSeverity.MEDIUM,
                context: { originalError: result.error },
              },
            ),
          );
        }

        // Log successful update
        loggerHelpers.business("user_profile_updated", {
          userId,
          updatedFields: Object.keys(updateData),
          ip: req.ip,
        });

        res.status(200).json({
          success: true,
          message: result.message,
          data: result.user,
        });
      } catch (error: any) {
        loggerHelpers.security("profile_update_error", "MEDIUM", {
          userId,
          error: error.message,
          ip: req.ip,
        });

        return next(
          new ErrorHandler(500, "Profile update failed", {
            category: ErrorCategory.SYSTEM,
            severity: ErrorSeverity.MEDIUM,
            context: { originalError: error.message },
          }),
        );
      }
    },
  ),

  // Enhanced getAllUsers with better filtering and authorization
  getAllUsers: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const requestingUser = req.user as IUser;

      // Check if user has permission to view all users (admin/manager roles)
      if (!["admin", "manager"].includes(requestingUser.role)) {
        loggerHelpers.security("unauthorized_user_list_access", "HIGH", {
          userId: requestingUser._id.toString(),
          role: requestingUser.role,
          ip: req.ip,
        });

        return next(
          ErrorHandler.authorization(
            "Insufficient permissions to view user list",
          ),
        );
      }

      const { page = 1, limit = 20, status, search, role } = req.query;

      // Build filter
      let filter: any = { isDeleted: false };

      if (status === "archive") {
        filter = { isDeleted: true };
      } else if (status && status !== "all") {
        filter.status = status;
      }

      if (role && role !== "all") {
        filter.role = role;
      }

      if (search) {
        filter.$or = [
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { username: { $regex: search, $options: "i" } },
        ];
      }

      // Log access attempt
      loggerHelpers.business("user_list_access", {
        requestedBy: requestingUser._id.toString(),
        filter,
        page: +page,
        limit: +limit,
        ip: req.ip,
      });

      try {
        const result = await getAllUsersService(
          filter,
          { createdAt: -1 },
          null,
          "-password -resetPasswordToken -resetPasswordExpires",
          +limit,
          +page,
        );

        if (!result.success) {
          return next(
            new ErrorHandler(
              result.status || 500,
              result.message || "Failed to fetch users",
              {
                category: ErrorCategory.SYSTEM,
                severity: ErrorSeverity.MEDIUM,
                context: { originalError: result.error },
              },
            ),
          );
        }

        res.status(200).json({
          success: true,
          message: "Users retrieved successfully",
          data: result.users,
          pagination: {
            page: result.page,
            limit: +limit,
            total: result.total,
            totalPages: result.totalPages,
            itemsPerPage: result.itemsPerPage,
          },
        });
      } catch (error: any) {
        loggerHelpers.security("get_all_users_error", "MEDIUM", {
          requestedBy: requestingUser._id.toString(),
          error: error.message,
          ip: req.ip,
        });

        return next(
          new ErrorHandler(500, "Failed to retrieve users", {
            category: ErrorCategory.SYSTEM,
            severity: ErrorSeverity.MEDIUM,
            context: { originalError: error.message },
          }),
        );
      }
    },
  ),

  // Enhanced deleteUser with proper authorization and logging
  deleteUser: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const { id } = req.params;
      const { permanent = false } = req.query;
      const requestingUser = req.user as IUser;

      // Check permissions
      if (!["admin"].includes(requestingUser.role)) {
        loggerHelpers.security("unauthorized_user_deletion", "HIGH", {
          requestedBy: requestingUser._id.toString(),
          targetUserId: id,
          role: requestingUser.role,
          ip: req.ip,
        });

        return next(
          ErrorHandler.authorization(
            "Insufficient permissions to delete users",
          ),
        );
      }

      // Prevent self-deletion
      if (requestingUser._id.toString() === id) {
        loggerHelpers.security("self_deletion_attempt", "HIGH", {
          userId: id,
          ip: req.ip,
        });

        return next(ErrorHandler.validation("Cannot delete your own account"));
      }

      // Log deletion attempt
      loggerHelpers.security("user_deletion_attempt", "HIGH", {
        requestedBy: requestingUser._id.toString(),
        targetUserId: id,
        permanent: permanent === "true",
        ip: req.ip,
      });

      try {
        const result = await deleteUserService(id, permanent === "true");

        if (!result.success) {
          if (result.status === 404) {
            return next(
              ErrorHandler.notFound(result.message || "User not found"),
            );
          }
          return next(
            new ErrorHandler(
              result.status || 500,
              result.message || "Failed to delete user",
              {
                category: ErrorCategory.SYSTEM,
                severity: ErrorSeverity.HIGH,
                context: { originalError: result.error },
              },
            ),
          );
        }

        res.status(200).json({
          success: true,
          message: result.message,
        });
      } catch (error: any) {
        loggerHelpers.security("user_deletion_error", "CRITICAL", {
          requestedBy: requestingUser._id.toString(),
          targetUserId: id,
          error: error.message,
          ip: req.ip,
        });

        return next(
          new ErrorHandler(500, "User deletion failed", {
            category: ErrorCategory.SYSTEM,
            severity: ErrorSeverity.CRITICAL,
            context: { originalError: error.message },
          }),
        );
      }
    },
  ),

  // New method: Change Password (moved from auth controller)
  changePassword: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const userId = req.user._id.toString();
      const { currentPassword, newPassword, confirmNewPassword } = req.body;

      // Log password change attempt
      loggerHelpers.security("password_change_attempt", "MEDIUM", {
        userId,
        ip: req.ip,
      });

      // Validation
      if (!currentPassword || !newPassword || !confirmNewPassword) {
        const missingFields = [];
        if (!currentPassword) missingFields.push("currentPassword");
        if (!newPassword) missingFields.push("newPassword");
        if (!confirmNewPassword) missingFields.push("confirmNewPassword");

        return next(
          ErrorHandler.validation("All password fields are required", {
            missingFields,
          }),
        );
      }

      if (newPassword !== confirmNewPassword) {
        loggerHelpers.security("password_change_mismatch", "LOW", {
          userId,
          ip: req.ip,
        });

        return next(
          ErrorHandler.validation("New passwords do not match", {
            field: "confirmNewPassword",
            code: "PASSWORD_MISMATCH",
          }),
        );
      }

      try {
        const result = await changePasswordService(
          userId,
          currentPassword,
          newPassword,
        );

        if (!result.success) {
          if (result.status === 401) {
            return next(
              ErrorHandler.authentication(
                result.message || "Current password is incorrect",
              ),
            );
          }
          if (result.status === 400) {
            return next(
              ErrorHandler.validation(result.message || "Invalid password"),
            );
          }
          return next(
            new ErrorHandler(
              result.status || 500,
              result.message || "Password change failed",
              {
                category: ErrorCategory.SYSTEM,
                severity: ErrorSeverity.HIGH,
                context: { originalError: result.error },
              },
            ),
          );
        }

        res.status(200).json({
          success: true,
          message: result.message,
        });
      } catch (error: any) {
        loggerHelpers.security("password_change_error", "HIGH", {
          userId,
          error: error.message,
          ip: req.ip,
        });

        return next(
          new ErrorHandler(500, "Password change failed", {
            category: ErrorCategory.SYSTEM,
            severity: ErrorSeverity.HIGH,
            context: { originalError: error.message },
          }),
        );
      }
    },
  ),

  // New method: Deactivate Account (moved from auth controller)
  deactivateAccount: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const userId = req.user._id.toString();
      const { password } = req.body;

      // Log account deactivation attempt
      loggerHelpers.security("account_deactivation_attempt", "HIGH", {
        userId,
        ip: req.ip,
      });

      if (!password) {
        return next(
          ErrorHandler.validation(
            "Password is required to deactivate account",
            {
              field: "password",
              code: "PASSWORD_REQUIRED_FOR_DEACTIVATION",
            },
          ),
        );
      }

      try {
        const result = await deactivateAccountService(userId, password);

        if (!result.success) {
          if (result.status === 401) {
            return next(
              ErrorHandler.authentication(result.message || "Invalid password"),
            );
          }
          if (result.status === 404) {
            return next(
              ErrorHandler.notFound(result.message || "User not found"),
            );
          }
          return next(
            new ErrorHandler(
              result.status || 500,
              result.message || "Account deactivation failed",
              {
                category: ErrorCategory.SYSTEM,
                severity: ErrorSeverity.CRITICAL,
                context: { originalError: result.error },
              },
            ),
          );
        }

        // Clear cookies
        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");

        res.status(200).json({
          success: true,
          message: result.message,
        });
      } catch (error: any) {
        loggerHelpers.security("account_deactivation_error", "CRITICAL", {
          userId,
          error: error.message,
          ip: req.ip,
        });

        return next(
          new ErrorHandler(500, "Account deactivation failed", {
            category: ErrorCategory.SYSTEM,
            severity: ErrorSeverity.CRITICAL,
            context: { originalError: error.message },
          }),
        );
      }
    },
  ),
};

export default userController;
