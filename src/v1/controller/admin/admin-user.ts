import { NextFunction, Request, Response } from "express";
import { IUser } from "../../../@types/user.type";
import { CatchAsyncErrors } from "../../../middleware/catchAsyncErrors";
import ErrorHandler from "../../../utils/ErrorHandler";
import { loggerHelpers } from "../../../utils/logger";
import adminService from "../../services/admin/admin.service";

// Extend Request interface to include user
interface AuthenticatedRequest extends Request {
  user?: IUser;
}

const adminController = {
  /**
   * Update admin permissions (only superadmin can do this)
   */
  updateAdminPermissions: CatchAsyncErrors(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const { adminId } = req.params;
      const { permissions } = req.body;
      const currentUser = req.user;

      // Log permission update attempt
      loggerHelpers.business("admin_permission_update_attempt", {
        currentUserId: currentUser?._id?.toString(),
        targetAdminId: adminId,
        ip: req.ip,
      });

      // Only superadmin can manage permissions
      if (currentUser?.role !== "superadmin") {
        loggerHelpers.security("unauthorized_permission_update", "HIGH", {
          currentUserId: currentUser?._id?.toString(),
          currentUserRole: currentUser?.role,
          targetAdminId: adminId,
          ip: req.ip,
        });

        return next(
          ErrorHandler.authorization("Only superadmin can manage permissions"),
        );
      }

      // Validation for required fields
      if (!permissions) {
        return next(
          ErrorHandler.validation("Permissions object is required", {
            field: "permissions",
            code: "MISSING_PERMISSIONS",
          }),
        );
      }

      try {
        const admin = await adminService.updateAdminPermissions(
          adminId,
          permissions,
        );

        if (!admin) {
          loggerHelpers.security(
            "admin_not_found_for_permission_update",
            "MEDIUM",
            {
              currentUserId: currentUser._id.toString(),
              targetAdminId: adminId,
              ip: req.ip,
            },
          );

          return next(ErrorHandler.notFound("Admin not found"));
        }

        loggerHelpers.auth(
          "admin_permissions_updated",
          currentUser._id.toString(),
          {
            targetAdminId: adminId,
            targetAdminEmail: admin.email,
            updatedPermissions: permissions,
            ip: req.ip,
          },
        );

        res.status(200).json({
          success: true,
          message: "Admin permissions updated successfully",
          data: {
            adminId: admin._id,
            adminEmail: admin.email,
            adminName: `${admin.firstName} ${admin.lastName}`,
            permissions: admin.permissions,
          },
        });
      } catch (error) {
        return next(
          new ErrorHandler(500, "Failed to update admin permissions"),
        );
      }
    },
  ),

  /**
   * List all admins with comprehensive filtering, sorting, and pagination (superadmin only)
   */
  getAllAdmins: CatchAsyncErrors(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const currentUser = req.user;

      // Log admin list view attempt
      loggerHelpers.business("admin_list_view_attempt", {
        currentUserId: currentUser?._id?.toString(),
        ip: req.ip,
      });

      // Extract and validate query parameters
      const {
        page = 1,
        limit = 20,
        search = "",
        statusFilter = "all",
        permissionFilter = "all",
        sortBy = "name",
        sortOrder = "asc",
        isArchived = false,
      } = req.query;

      // Validation
      const pageNum = Math.max(1, parseInt(page as string) || 1);
      const limitNum = [5, 10, 20, 50, 100].includes(parseInt(limit as string))
        ? parseInt(limit as string)
        : 10;
      const searchQuery = (search as string).trim().substring(0, 100);

      // Validate enum values
      const validStatusFilters = ["all", "active", "inactive", "never-logged"];
      const validPermissionFilters = ["all", "high", "medium", "low"];
      const validSortBy = ["name", "email", "createdAt", "lastLogin"];
      const validSortOrder = ["asc", "desc"];

      if (!validStatusFilters.includes(statusFilter as string)) {
        return next(ErrorHandler.validation("Invalid statusFilter value"));
      }
      if (!validPermissionFilters.includes(permissionFilter as string)) {
        return next(ErrorHandler.validation("Invalid permissionFilter value"));
      }
      if (!validSortBy.includes(sortBy as string)) {
        return next(ErrorHandler.validation("Invalid sortBy value"));
      }
      if (!validSortOrder.includes(sortOrder as string)) {
        return next(ErrorHandler.validation("Invalid sortOrder value"));
      }

      try {
        // Build filters object for service
        const filters = {
          page: pageNum,
          limit: limitNum,
          search: searchQuery,
          statusFilter: statusFilter as
            | "all"
            | "active"
            | "inactive"
            | "never-logged",
          permissionFilter: permissionFilter as
            | "all"
            | "high"
            | "medium"
            | "low",
          sortBy: sortBy as "name" | "email" | "createdAt" | "lastLogin",
          sortOrder: sortOrder as "asc" | "desc",
          isArchived: String(isArchived) === "true",
        };

        const result = await adminService.getAllAdmins(filters);

        loggerHelpers.business("admin_list_viewed", {
          currentUserId: currentUser?._id.toString(),
          adminCount: result.data.length,
          totalCount: result.totalCount,
          filters: {
            search: searchQuery,
            statusFilter,
            permissionFilter,
            isArchived: filters.isArchived,
          },
          pagination: {
            page: pageNum,
            limit: limitNum,
          },
          ip: req.ip,
        });

        res.status(200).json({
          success: true,
          ...result,
        });
      } catch (error) {
        return next(new ErrorHandler(500, "Failed to get admin list"));
      }
    },
  ),

  /**
   * Create admin with specific permissions (superadmin only)
   */
  createAdminWithPermissions: CatchAsyncErrors(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const {
        email,
        phone,
        firstName,
        lastName,
        password: reqPassword,
      } = req.body;
      const creator = req.user;

      // Log admin creation attempt
      loggerHelpers.business("admin_creation_with_permissions_attempt", {
        email: email?.substring(0, 3) + "***",
        creatorId: creator?._id?.toString(),
        ip: req.ip,
      });

      // Only superadmin can create admin with custom permissions
      if (creator?.role !== "superadmin") {
        return next(
          ErrorHandler.authorization(
            "Only superadmin can create admin accounts",
          ),
        );
      }

      // Validate required fields
      if (!email || !firstName || !lastName) {
        const missingFields = [];
        if (!email) missingFields.push("email");
        if (!firstName) missingFields.push("firstName");
        if (!lastName) missingFields.push("lastName");
        return next(
          ErrorHandler.validation("Required fields are missing", {
            missingFields,
          }),
        );
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return next(
          ErrorHandler.validation("Please provide a valid email address", {
            field: "email",
            value: email,
          }),
        );
      }

      // Password: use provided or generate random
      let password = reqPassword;
      if (!password) {
        password =
          Math.random().toString(36).slice(-10) +
          Math.random().toString(36).slice(-2);
      }
      if (password.length < 6) {
        return next(
          ErrorHandler.validation(
            "Password must be at least 6 characters long",
            {
              field: "password",
              minLength: 6,
            },
          ),
        );
      }

      try {
        // Check for existing user
        const emailExists = await adminService.checkEmailExists(email);
        if (emailExists) {
          return next(
            ErrorHandler.validation("User with this email already exists", {
              field: "email",
              value: email,
            }),
          );
        }

        // Create admin user with permissions (using default permissions from backend)
        const adminUser = await adminService.createAdmin({
          email,
          firstName,
          lastName,
          password,
          phone,
        });

        loggerHelpers.auth(
          "admin_created_with_permissions",
          adminUser._id.toString(),
          {
            email: adminUser.email,
            createdBy: creator._id?.toString(),
            hasCustomPermissions: false, // Always false since we use backend defaults
            ip: req.ip,
          },
        );

        res.status(201).json({
          success: true,
          message: "Admin account created with permissions.",
          data: {
            adminId: adminUser._id,
            email,
            tempPassword: password,
            permissions: adminUser.permissions,
          },
        });
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "User with this email already exists"
        ) {
          return next(
            ErrorHandler.validation("User with this email already exists", {
              field: "email",
              value: email,
            }),
          );
        }
        return next(new ErrorHandler(500, "Failed to create admin account"));
      }
    },
  ),

  /**
   * Update admin basic details (superadmin or admin with admins.canEdit permission)
   */
  updateAdminDetails: CatchAsyncErrors(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const { adminId } = req.params;
      const { firstName, lastName, phone, status } = req.body;
      const currentUser = req.user;

      // Log admin update attempt
      loggerHelpers.business("admin_details_update_attempt", {
        currentUserId: currentUser?._id?.toString(),
        targetAdminId: adminId,
        ip: req.ip,
      });

      // Check permissions: superadmin or admin with admins.canEdit permission
      const hasPermission =
        currentUser?.role === "superadmin" ||
        (currentUser?.role === "admin" &&
          currentUser?.permissions?.admins?.canEdit);

      if (!hasPermission) {
        loggerHelpers.security("unauthorized_admin_details_update", "HIGH", {
          currentUserId: currentUser?._id?.toString(),
          currentUserRole: currentUser?.role,
          targetAdminId: adminId,
          ip: req.ip,
        });

        return next(
          ErrorHandler.authorization(
            "You don't have permission to edit admin details",
          ),
        );
      }

      // Prevent admin from editing their own status (only superadmin can)
      if (
        currentUser?._id.toString() === adminId &&
        currentUser?.role !== "superadmin"
      ) {
        if (status !== undefined) {
          return next(
            ErrorHandler.authorization("You cannot modify your own status"),
          );
        }
      }

      // Only superadmin can modify certain status changes
      if (currentUser?.role !== "superadmin") {
        if (status && !["active", "inactive"].includes(status)) {
          return next(
            ErrorHandler.authorization(
              "Only superadmin can set status to blocked, suspended, hold, or pending",
            ),
          );
        }
      }

      // Validation
      if (
        firstName &&
        (firstName.trim().length < 1 || firstName.trim().length > 50)
      ) {
        return next(
          ErrorHandler.validation(
            "First name must be between 1-50 characters",
            {
              field: "firstName",
              minLength: 1,
              maxLength: 50,
            },
          ),
        );
      }

      if (
        lastName &&
        (lastName.trim().length < 1 || lastName.trim().length > 50)
      ) {
        return next(
          ErrorHandler.validation("Last name must be between 1-50 characters", {
            field: "lastName",
            minLength: 1,
            maxLength: 50,
          }),
        );
      }

      if (phone && !/^\+?[1-9]\d{1,14}$/.test(phone)) {
        return next(
          ErrorHandler.validation("Invalid phone number format", {
            field: "phone",
            pattern: "E.164 format",
          }),
        );
      }

      // if (gender && !["male", "female"].includes(gender.toLowerCase())) {
      //   return next(
      //     ErrorHandler.validation("Gender must be 'male' or 'female'", {
      //       field: "gender",
      //       allowedValues: ["male", "female"],
      //     })
      //   );
      // }

      if (
        status &&
        ![
          "active",
          "inactive",
          "hold",
          "blocked",
          "suspended",
          "pending",
        ].includes(status)
      ) {
        return next(
          ErrorHandler.validation("Invalid status value", {
            field: "status",
            allowedValues: [
              "active",
              "inactive",
              "hold",
              "blocked",
              "suspended",
              "pending",
            ],
          }),
        );
      }

      // if (dob) {
      //   const birthDate = new Date(dob);
      //   const today = new Date();
      //   const age = today.getFullYear() - birthDate.getFullYear();
      //   if (age < 18 || age > 100) {
      //     return next(
      //       ErrorHandler.validation("Admin must be between 18-100 years old", {
      //         field: "dob",
      //         minAge: 18,
      //         maxAge: 100,
      //       })
      //     );
      //   }
      // }

      try {
        // Build update object
        const updateData: any = {};
        if (firstName !== undefined) updateData.firstName = firstName.trim();
        if (lastName !== undefined) updateData.lastName = lastName.trim();
        if (phone !== undefined) updateData.phone = phone || null;
        // if (gender !== undefined) updateData.gender = gender.toLowerCase();
        // if (dob !== undefined) updateData.dob = new Date(dob);
        if (status !== undefined) updateData.status = status;

        const updatedAdmin = await adminService.updateAdminDetails(
          adminId,
          updateData,
        );

        if (!updatedAdmin) {
          loggerHelpers.security(
            "admin_not_found_for_details_update",
            "MEDIUM",
            {
              currentUserId: currentUser._id.toString(),
              targetAdminId: adminId,
              ip: req.ip,
            },
          );

          return next(ErrorHandler.notFound("Admin not found"));
        }

        loggerHelpers.auth(
          "admin_details_updated",
          currentUser._id.toString(),
          {
            targetAdminId: adminId,
            targetAdminEmail: updatedAdmin.email,
            updatedFields: Object.keys(updateData),
            ip: req.ip,
          },
        );

        res.status(200).json({
          success: true,
          message: "Admin details updated successfully",
          data: {
            adminId: updatedAdmin._id,
            firstName: updatedAdmin.firstName,
            lastName: updatedAdmin.lastName,
            fullName: `${updatedAdmin.firstName} ${updatedAdmin.lastName}`,
            email: updatedAdmin.email,
            phone: updatedAdmin.phone,
            gender: updatedAdmin.gender,
            dob: updatedAdmin.dob,
            status: updatedAdmin.status,
            updatedAt: updatedAdmin.updatedAt,
          },
        });
      } catch (error) {
        if (error instanceof Error && error.message === "Admin not found") {
          return next(ErrorHandler.notFound("Admin not found"));
        }
        return next(new ErrorHandler(500, "Failed to update admin details"));
      }
    },
  ),

  /**
   * Soft delete admin (archive)
   * Access controlled by middleware (admins.canDelete permission or superadmin)
   */
  archiveAdmin: CatchAsyncErrors(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const { adminId } = req.params;
      const currentUser = req.user;

      // Log archive attempt
      loggerHelpers.business("admin_archive_attempt", {
        currentUserId: currentUser?._id?.toString(),
        targetAdminId: adminId,
        ip: req.ip,
      });

      // Authorization is handled by middleware (canDeleteAdmin + authorizeRoles)
      // Additional business logic checks below

      // Prevent admin from archiving themselves
      if (currentUser?._id.toString() === adminId) {
        loggerHelpers.security("admin_self_archive_attempt", "HIGH", {
          currentUserId: currentUser._id.toString(),
          ip: req.ip,
        });

        return next(
          ErrorHandler.authorization("You cannot archive your own account"),
        );
      }

      try {
        const archivedAdmin = await adminService.archiveAdmin(adminId);

        if (!archivedAdmin) {
          loggerHelpers.security("admin_not_found_for_archive", "MEDIUM", {
            currentUserId: currentUser?._id?.toString(),
            targetAdminId: adminId,
            ip: req.ip,
          });

          return next(ErrorHandler.notFound("Admin not found"));
        }

        loggerHelpers.auth("admin_archived", currentUser?._id?.toString(), {
          targetAdminId: adminId,
          targetAdminEmail: archivedAdmin.email,
          ip: req.ip,
        });

        res.status(200).json({
          success: true,
          message: "Admin account archived successfully",
          data: {
            adminId: archivedAdmin._id,
            email: archivedAdmin.email,
            fullName: `${archivedAdmin.firstName} ${archivedAdmin.lastName}`,
            archivedAt: new Date(),
            isDeleted: archivedAdmin.isDeleted,
          },
        });
      } catch (error) {
        return next(new ErrorHandler(500, "Failed to archive admin account"));
      }
    },
  ),

  /**
   * Restore archived admin
   * Access controlled by middleware (admins.canDelete permission or superadmin)
   */
  restoreAdmin: CatchAsyncErrors(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const { adminId } = req.params;
      const currentUser = req.user;

      // Log restore attempt
      loggerHelpers.business("admin_restore_attempt", {
        currentUserId: currentUser?._id?.toString(),
        targetAdminId: adminId,
        ip: req.ip,
      });

      // Authorization is handled by middleware (canDeleteAdmin + authorizeRoles)

      try {
        const restoredAdmin = await adminService.restoreAdmin(adminId);

        if (!restoredAdmin) {
          loggerHelpers.security("admin_not_found_for_restore", "MEDIUM", {
            currentUserId: currentUser?._id?.toString(),
            targetAdminId: adminId,
            ip: req.ip,
          });

          return next(ErrorHandler.notFound("Admin not found or not archived"));
        }

        loggerHelpers.auth("admin_restored", currentUser?._id?.toString(), {
          targetAdminId: adminId,
          targetAdminEmail: restoredAdmin.email,
          ip: req.ip,
        });

        res.status(200).json({
          success: true,
          message: "Admin account restored successfully",
          data: {
            adminId: restoredAdmin._id,
            email: restoredAdmin.email,
            fullName: `${restoredAdmin.firstName} ${restoredAdmin.lastName}`,
            restoredAt: new Date(),
            isDeleted: restoredAdmin.isDeleted,
            status: restoredAdmin.status,
          },
        });
      } catch (error) {
        return next(new ErrorHandler(500, "Failed to restore admin account"));
      }
    },
  ),

  /**
   * Permanently delete admin (irreversible)
   * Access restricted to superadmin only with additional confirmation
   */
  permanentlyDeleteAdmin: CatchAsyncErrors(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const { adminId } = req.params;
      const { confirmDelete } = req.body;
      const currentUser = req.user;

      // Log permanent delete attempt
      loggerHelpers.security("admin_permanent_delete_attempt", "CRITICAL", {
        currentUserId: currentUser?._id?.toString(),
        targetAdminId: adminId,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      });

      // Prevent superadmin from deleting themselves
      if (currentUser?._id?.toString() === adminId) {
        loggerHelpers.security("superadmin_self_delete_attempt", "CRITICAL", {
          currentUserId: currentUser?._id?.toString(),
          ip: req.ip,
        });

        return next(
          ErrorHandler.authorization(
            "You cannot permanently delete your own account",
          ),
        );
      }

      // Require explicit confirmation
      if (confirmDelete !== "DELETE PERMANENTLY") {
        return next(
          ErrorHandler.validation(
            "Permanent deletion requires explicit confirmation",
            {
              field: "confirmDelete",
              expectedValue: "DELETE PERMANENTLY",
              code: "CONFIRMATION_REQUIRED",
            },
          ),
        );
      }

      try {
        const deleted = await adminService.permanentlyDeleteAdmin(adminId);

        if (!deleted) {
          return next(
            ErrorHandler.notFound("Admin not found or deletion failed"),
          );
        }

        loggerHelpers.security("admin_permanently_deleted", "CRITICAL", {
          currentUserId: currentUser?._id?.toString(),
          deletedAdminId: adminId,
          deletedAdminEmail: deleted.email,
          deletedAdminName: `${deleted.name || `${deleted.firstName} ${deleted.lastName}`}`,
          ip: req.ip,
        });

        res.status(200).json({
          success: true,
          message: "Admin account permanently deleted successfully",
          data: {
            deletedAdminId: adminId,
            deletedAt: new Date(),
            warning: "This action is irreversible",
          },
        });
      } catch (error) {
        return next(
          new ErrorHandler(500, "Failed to permanently delete admin account"),
        );
      }
    },
  ),
};

export default adminController;
