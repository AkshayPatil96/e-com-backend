import { NextFunction, Request, Response } from "express";
import { IUser, IUserPermissions } from "../@types/user.type";
import ErrorHandler from "../utils/ErrorHandler";

// Extend Request interface to include user
interface AuthenticatedRequest extends Request {
  user?: IUser;
}

/**
 * Middleware to check if user has specific permission for a resource and action
 * @param resource - The resource to check permission for (brands, categories, etc.)
 * @param action - The action to check permission for (canCreate, canEdit, etc.)
 * @returns Express middleware function
 */
export const checkPermission = (
  resource: keyof IUserPermissions,
  action: string,
) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return next(ErrorHandler.authentication("Authentication required"));
    }

    // Superadmin has all permissions
    if (user.role === "superadmin") {
      return next();
    }

    // Regular users and sellers have no admin permissions
    if (user.role !== "admin") {
      return next(ErrorHandler.authorization("Admin access required"));
    }

    // Check if admin has specific permission
    const userPermissions = user.permissions;
    if (!userPermissions || !userPermissions[resource]) {
      return next(ErrorHandler.authorization(`No permissions for ${resource}`));
    }

    const resourcePermissions = userPermissions[resource] as any;
    const hasPermission = resourcePermissions[action];

    if (!hasPermission) {
      return next(
        ErrorHandler.authorization(`No permission to ${action} ${resource}`),
      );
    }

    next();
  };
};

// Brand permission middleware
export const canCreateBrand = checkPermission("brands", "canCreate");
export const canEditBrand = checkPermission("brands", "canEdit");
export const canDeleteBrand = checkPermission("brands", "canDelete");
export const canViewBrand = checkPermission("brands", "canView");
export const canArchiveBrand = checkPermission("brands", "canArchive");
export const canRestoreBrand = checkPermission("brands", "canRestore");

// Category permission middleware
export const canCreateCategory = checkPermission("categories", "canCreate");
export const canEditCategory = checkPermission("categories", "canEdit");
export const canDeleteCategory = checkPermission("categories", "canDelete");
export const canViewCategory = checkPermission("categories", "canView");
export const canArchiveCategory = checkPermission("categories", "canArchive");
export const canRestoreCategory = checkPermission("categories", "canRestore");

// Product permission middleware
export const canCreateProduct = checkPermission("products", "canCreate");
export const canEditProduct = checkPermission("products", "canEdit");
export const canDeleteProduct = checkPermission("products", "canDelete");
export const canViewProduct = checkPermission("products", "canView");
export const canApproveProduct = checkPermission("products", "canApprove");
export const canArchiveProduct = checkPermission("products", "canArchive");
export const canRestoreProduct = checkPermission("products", "canRestore");

// User management permission middleware
export const canCreateUser = checkPermission("users", "canCreate");
export const canEditUser = checkPermission("users", "canEdit");
export const canDeleteUser = checkPermission("users", "canDelete");
export const canViewUser = checkPermission("users", "canView");
export const canBanUser = checkPermission("users", "canBan");
export const canArchiveUser = checkPermission("users", "canArchive");
export const canRestoreUser = checkPermission("users", "canRestore");

// Seller management permission middleware
export const canCreateSeller = checkPermission("sellers", "canCreate");
export const canEditSeller = checkPermission("sellers", "canEdit");
export const canDeleteSeller = checkPermission("sellers", "canDelete");
export const canViewSeller = checkPermission("sellers", "canView");
export const canApproveSeller = checkPermission("sellers", "canApprove");
export const canSuspendSeller = checkPermission("sellers", "canSuspend");
export const canArchiveSeller = checkPermission("sellers", "canArchive");
export const canRestoreSeller = checkPermission("sellers", "canRestore");

// Order permission middleware
export const canViewOrder = checkPermission("orders", "canView");
export const canEditOrder = checkPermission("orders", "canEdit");
export const canCancelOrder = checkPermission("orders", "canCancel");
export const canRefundOrder = checkPermission("orders", "canRefund");

// Admin management permission middleware
export const canCreateAdmin = checkPermission("admins", "canCreate");
export const canEditAdmin = checkPermission("admins", "canEdit");
export const canDeleteAdmin = checkPermission("admins", "canDelete");
export const canViewAdmin = checkPermission("admins", "canView");
export const canManagePermissions = checkPermission(
  "admins",
  "canManagePermissions",
);
export const canArchiveAdmin = checkPermission("admins", "canArchive");
export const canRestoreAdmin = checkPermission("admins", "canRestore");

// Reports permission middleware
export const canViewReports = checkPermission("reports", "canView");
export const canExportReports = checkPermission("reports", "canExport");

/**
 * Middleware to check if user has any of the specified permissions
 * @param permissions - Array of permission checks
 * @returns Express middleware function
 */
export const hasAnyPermission = (
  permissions: Array<{
    resource: keyof IUserPermissions;
    action: string;
  }>,
) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return next(ErrorHandler.authentication("Authentication required"));
    }

    // Superadmin has all permissions
    if (user.role === "superadmin") {
      return next();
    }

    // Regular users and sellers have no admin permissions
    if (user.role !== "admin") {
      return next(ErrorHandler.authorization("Admin access required"));
    }

    const userPermissions = user.permissions;
    if (!userPermissions) {
      return next(ErrorHandler.authorization("No permissions assigned"));
    }

    // Check if user has any of the specified permissions
    const hasPermission = permissions.some(({ resource, action }) => {
      const resourcePermissions = userPermissions[resource] as any;
      return resourcePermissions && resourcePermissions[action];
    });

    if (!hasPermission) {
      return next(
        ErrorHandler.authorization("Insufficient permissions for this action"),
      );
    }

    next();
  };
};

/**
 * Middleware to check if user has all of the specified permissions
 * @param permissions - Array of permission checks
 * @returns Express middleware function
 */
export const hasAllPermissions = (
  permissions: Array<{
    resource: keyof IUserPermissions;
    action: string;
  }>,
) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return next(ErrorHandler.authentication("Authentication required"));
    }

    // Superadmin has all permissions
    if (user.role === "superadmin") {
      return next();
    }

    // Regular users and sellers have no admin permissions
    if (user.role !== "admin") {
      return next(ErrorHandler.authorization("Admin access required"));
    }

    const userPermissions = user.permissions;
    if (!userPermissions) {
      return next(ErrorHandler.authorization("No permissions assigned"));
    }

    // Check if user has all of the specified permissions
    const hasAllPerms = permissions.every(({ resource, action }) => {
      const resourcePermissions = userPermissions[resource] as any;
      return resourcePermissions && resourcePermissions[action];
    });

    if (!hasAllPerms) {
      return next(
        ErrorHandler.authorization("Insufficient permissions for this action"),
      );
    }

    next();
  };
};
