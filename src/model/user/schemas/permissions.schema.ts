import { Schema } from "mongoose";
import { IUserPermissions } from "../../../@types/user.type";

/**
 * Permissions schema for granular admin access control
 */
export const PermissionsSchema = new Schema<IUserPermissions>(
  {
    brands: {
      canCreate: { type: Boolean, default: false },
      canEdit: { type: Boolean, default: false },
      canDelete: { type: Boolean, default: false },
      canView: { type: Boolean, default: false },
      canArchive: { type: Boolean, default: false },
      canRestore: { type: Boolean, default: false },
    },
    categories: {
      canCreate: { type: Boolean, default: false },
      canEdit: { type: Boolean, default: false },
      canDelete: { type: Boolean, default: false },
      canView: { type: Boolean, default: false },
      canArchive: { type: Boolean, default: false },
      canRestore: { type: Boolean, default: false },
    },
    products: {
      canCreate: { type: Boolean, default: false },
      canEdit: { type: Boolean, default: false },
      canDelete: { type: Boolean, default: false },
      canView: { type: Boolean, default: false },
      canApprove: { type: Boolean, default: false },
      canArchive: { type: Boolean, default: false },
      canRestore: { type: Boolean, default: false },
    },
    users: {
      canCreate: { type: Boolean, default: false },
      canEdit: { type: Boolean, default: false },
      canDelete: { type: Boolean, default: false },
      canView: { type: Boolean, default: false },
      canBan: { type: Boolean, default: false },
      canArchive: { type: Boolean, default: false },
      canRestore: { type: Boolean, default: false },
    },
    sellers: {
      canCreate: { type: Boolean, default: false },
      canEdit: { type: Boolean, default: false },
      canDelete: { type: Boolean, default: false },
      canView: { type: Boolean, default: false },
      canApprove: { type: Boolean, default: false },
      canSuspend: { type: Boolean, default: false },
      canArchive: { type: Boolean, default: false },
      canRestore: { type: Boolean, default: false },
    },
    orders: {
      canView: { type: Boolean, default: false },
      canEdit: { type: Boolean, default: false },
      canCancel: { type: Boolean, default: false },
      canRefund: { type: Boolean, default: false },
    },
    admins: {
      canCreate: { type: Boolean, default: false },
      canEdit: { type: Boolean, default: false },
      canDelete: { type: Boolean, default: false },
      canView: { type: Boolean, default: false },
      canManagePermissions: { type: Boolean, default: false },
      canArchive: { type: Boolean, default: false },
      canRestore: { type: Boolean, default: false },
    },
    reports: {
      canView: { type: Boolean, default: false },
      canExport: { type: Boolean, default: false },
    },
  },
  { _id: false },
);
