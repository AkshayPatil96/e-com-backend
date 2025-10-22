import { IUserPermissions } from "../@types/user.type";

/**
 * Generate default permissions structure with all permissions set to false
 * This ensures new admins have no permissions by default and must be granted explicitly
 *
 * @returns IUserPermissions - Complete permissions object with all values set to false
 */
export const generateDefaultPermissions = (): IUserPermissions => {
  return {
    brands: {
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canView: false,
      canArchive: false,
      canRestore: false,
    },
    categories: {
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canView: false,
      canArchive: false,
      canRestore: false,
    },
    products: {
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canView: false,
      canApprove: false,
      canArchive: false,
      canRestore: false,
    },
    users: {
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canView: false,
      canBan: false,
      canArchive: false,
      canRestore: false,
    },
    sellers: {
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canView: false,
      canApprove: false,
      canSuspend: false,
      canArchive: false,
      canRestore: false,
    },
    orders: {
      canView: false,
      canEdit: false,
      canCancel: false,
      canRefund: false,
      canArchive: false,
      canRestore: false,
    },
    admins: {
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canView: false,
      canManagePermissions: false,
      canArchive: false,
      canRestore: false,
    },
    reports: {
      canView: false,
      canExport: false,
    },
  };
};

/**
 * Generate full permissions (all true) - useful for superadmin setup or testing
 * This gives complete access to all resources and actions
 *
 * @returns IUserPermissions - Complete permissions object with all values set to true
 */
export const generateFullPermissions = (): IUserPermissions => {
  return {
    brands: {
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canView: true,
      canArchive: true,
      canRestore: true,
    },
    categories: {
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canView: true,
      canArchive: true,
      canRestore: true,
    },
    products: {
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canView: true,
      canApprove: true,
      canArchive: true,
      canRestore: true,
    },
    users: {
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canView: true,
      canBan: true,
      canArchive: true,
      canRestore: true,
    },
    sellers: {
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canView: true,
      canApprove: true,
      canSuspend: true,
      canArchive: true,
      canRestore: true,
    },
    orders: {
      canView: true,
      canEdit: true,
      canCancel: true,
      canRefund: true,
      canArchive: true,
      canRestore: true,
    },
    admins: {
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canView: true,
      canManagePermissions: true,
      canArchive: true,
      canRestore: true,
    },
    reports: {
      canView: true,
      canExport: true,
    },
  };
};

/**
 * Generate permissions for a specific role
 * This is a convenience function for common role-based permission patterns
 *
 * @param role - The role to generate permissions for
 * @returns IUserPermissions - Permissions appropriate for the role
 */
export const generateRoleBasedPermissions = (
  role: "admin" | "superadmin" | "user",
): IUserPermissions => {
  switch (role) {
    case "superadmin":
      return generateFullPermissions();
    case "admin":
      return generateDefaultPermissions(); // Start with no permissions, grant as needed
    case "user":
    default:
      return generateDefaultPermissions(); // Regular users have no admin permissions
  }
};

/**
 * Merge permissions objects - useful for updating existing permissions
 *
 * @param existingPermissions - Current permissions object
 * @param newPermissions - New permissions to merge/override
 * @returns IUserPermissions - Merged permissions object
 */
export const mergePermissions = (
  existingPermissions: Partial<IUserPermissions>,
  newPermissions: Partial<IUserPermissions>,
): IUserPermissions => {
  const defaultPerms = generateDefaultPermissions();

  return {
    brands: {
      ...defaultPerms.brands,
      ...existingPermissions.brands,
      ...newPermissions.brands,
    },
    categories: {
      ...defaultPerms.categories,
      ...existingPermissions.categories,
      ...newPermissions.categories,
    },
    products: {
      ...defaultPerms.products,
      ...existingPermissions.products,
      ...newPermissions.products,
    },
    users: {
      ...defaultPerms.users,
      ...existingPermissions.users,
      ...newPermissions.users,
    },
    sellers: {
      ...defaultPerms.sellers,
      ...existingPermissions.sellers,
      ...newPermissions.sellers,
    },
    orders: {
      ...defaultPerms.orders,
      ...existingPermissions.orders,
      ...newPermissions.orders,
    },
    admins: {
      ...defaultPerms.admins,
      ...existingPermissions.admins,
      ...newPermissions.admins,
    },
    reports: {
      ...defaultPerms.reports,
      ...existingPermissions.reports,
      ...newPermissions.reports,
    },
  };
};
