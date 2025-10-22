/**
 * Audit Middleware for ProductVersion
 * Comprehensive audit logging and trail management
 */

import { Document, Schema, Types } from "mongoose";
import { IAuditTrail, IProductVersion } from "../../../@types/productVersion";

/**
 * Pre-save audit middleware
 */
export function preAuditMiddleware(this: Document & IProductVersion): void {
  const now = new Date();

  if (this.isNew) {
    // Set creation audit
    this.createdAt = now;
    this.updatedAt = now;

    if (!this.auditTrail) {
      this.auditTrail = [];
    }

    // Add creation audit entry
    this.auditTrail.push({
      action: "created",
      timestamp: now,
      userId: this.createdBy,
      userRole: "admin", // This should come from user context
      changes: [
        {
          field: "version",
          oldValue: null,
          newValue: this.versionNumber,
        },
      ],
      reason: "Initial version creation",
      ipAddress: this.get("_auditIP"),
      userAgent: this.get("_auditUserAgent"),
    });
  } else {
    // Update modification audit
    this.updatedAt = now;

    const modifiedFields = this.modifiedPaths();
    if (modifiedFields.length > 0) {
      const changes = getChangedFieldsWithValues.call(this, modifiedFields);

      this.auditTrail.push({
        action: "updated",
        timestamp: now,
        userId: this.updatedBy,
        userRole: "admin", // This should come from user context
        changes: changes,
        reason: this.get("_changeReason") || "Version updated",
        ipAddress: this.get("_auditIP"),
        userAgent: this.get("_auditUserAgent"),
      });
    }
  }
}

/**
 * Version status change audit
 */
export function auditStatusChange(this: Document & IProductVersion): void {
  const statusFields = ["isActive", "isPublished", "isArchived", "isDraft"];
  const changedStatus = statusFields.filter((field) => this.isModified(field));

  if (changedStatus.length > 0) {
    const now = new Date();

    changedStatus.forEach((field) => {
      const oldValue = this.get(`$original.${field}`);
      const newValue = this.get(field);

      this.auditTrail.push({
        action: "updated",
        timestamp: now,
        userId: this.updatedBy,
        userRole: "admin",
        changes: [
          {
            field: field,
            oldValue: oldValue,
            newValue: newValue,
          },
        ],
        reason: this.get("_statusChangeReason") || `${field} status updated`,
        ipAddress: this.get("_auditIP"),
        userAgent: this.get("_auditUserAgent"),
      });
    });
  }
}

/**
 * Version data change audit
 */
export function auditVersionDataChange(this: Document & IProductVersion): void {
  if (this.isModified("versionData")) {
    const now = new Date();
    const oldData = this.get("$original.versionData");
    const newData = this.versionData;

    const changedFields = getVersionDataChanges(oldData, newData);

    if (changedFields.length > 0) {
      const changes = changedFields.map((field: string) => ({
        field: `versionData.${field}`,
        oldValue: oldData?.[field],
        newValue: (newData as any)?.[field],
      }));

      this.auditTrail.push({
        action: "updated",
        timestamp: now,
        userId: this.updatedBy,
        userRole: "admin",
        changes: changes,
        reason: this.get("_dataChangeReason") || "Version data updated",
        ipAddress: this.get("_auditIP"),
        userAgent: this.get("_auditUserAgent"),
      });
    }
  }
}

/**
 * Pre-remove audit middleware
 */
export function preRemoveAuditMiddleware(
  this: Document & IProductVersion,
): void {
  const now = new Date();

  this.auditTrail.push({
    action: "deleted",
    timestamp: now,
    userId: this.updatedBy,
    userRole: "admin",
    changes: [
      {
        field: "deleted",
        oldValue: false,
        newValue: true,
      },
    ],
    reason: this.get("_deleteReason") || "Version deleted",
    ipAddress: this.get("_auditIP"),
    userAgent: this.get("_auditUserAgent"),
  });
}

/**
 * Rollback audit
 */
export function auditRollback(
  this: Document & IProductVersion,
  targetVersion: string,
  reason?: string,
): void {
  const now = new Date();

  this.auditTrail.push({
    action: "restored",
    timestamp: now,
    userId: this.updatedBy,
    userRole: "admin",
    changes: [
      {
        field: "versionNumber",
        oldValue: this.versionNumber,
        newValue: targetVersion,
      },
    ],
    reason: reason || `Rollback to version ${targetVersion}`,
    ipAddress: this.get("_auditIP"),
    userAgent: this.get("_auditUserAgent"),
  });
}

/**
 * Archive audit
 */
export function auditArchive(
  this: Document & IProductVersion,
  reason?: string,
): void {
  const now = new Date();

  this.auditTrail.push({
    action: "archived",
    timestamp: now,
    userId: this.updatedBy,
    userRole: "admin",
    changes: [
      {
        field: "isArchived",
        oldValue: false,
        newValue: true,
      },
    ],
    reason: reason || "Version archived",
    ipAddress: this.get("_auditIP"),
    userAgent: this.get("_auditUserAgent"),
  });
}

/**
 * Publish audit
 */
export function auditPublish(
  this: Document & IProductVersion,
  reason?: string,
): void {
  const now = new Date();

  this.auditTrail.push({
    action: "published",
    timestamp: now,
    userId: this.updatedBy,
    userRole: "admin",
    changes: [
      {
        field: "isPublished",
        oldValue: false,
        newValue: true,
      },
    ],
    reason: reason || "Version published",
    ipAddress: this.get("_auditIP"),
    userAgent: this.get("_auditUserAgent"),
  });
}

/**
 * Get audit trail by action type
 */
export function getAuditByAction(
  this: Document & IProductVersion,
  action: string,
): IAuditTrail[] {
  return this.auditTrail.filter((entry) => entry.action === action);
}

/**
 * Get audit trail by date range
 */
export function getAuditByDateRange(
  this: Document & IProductVersion,
  startDate: Date,
  endDate: Date,
): IAuditTrail[] {
  return this.auditTrail.filter(
    (entry) => entry.timestamp >= startDate && entry.timestamp <= endDate,
  );
}

/**
 * Get audit trail by user
 */
export function getAuditByUser(
  this: Document & IProductVersion,
  userId: Types.ObjectId,
): IAuditTrail[] {
  return this.auditTrail.filter(
    (entry) => entry.userId && entry.userId.toString() === userId.toString(),
  );
}

/**
 * Clean old audit entries (keep last N entries)
 */
export function cleanOldAuditEntries(
  this: Document & IProductVersion,
  keepLast: number = 100,
): void {
  if (this.auditTrail.length > keepLast) {
    // Sort by timestamp descending and keep only the latest entries
    this.auditTrail.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );
    this.auditTrail = this.auditTrail.slice(0, keepLast);
  }
}

/**
 * Helper method to get changed fields with their old and new values
 */
function getChangedFieldsWithValues(
  this: Document & IProductVersion,
  modifiedPaths: string[],
): { field: string; oldValue: any; newValue: any }[] {
  return modifiedPaths.map((path) => ({
    field: path,
    oldValue: this.get(`$original.${path}`),
    newValue: this.get(path),
  }));
}

/**
 * Helper method to get version data changes
 */
function getVersionDataChanges(oldData: any, newData: any): string[] {
  const changes: string[] = [];

  if (!oldData) return Object.keys(newData || {});

  const allKeys = new Set([
    ...Object.keys(oldData),
    ...Object.keys(newData || {}),
  ]);

  allKeys.forEach((key) => {
    if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
      changes.push(key);
    }
  });

  return changes;
}

/**
 * Apply audit middleware to schema
 */
export function applyAuditMiddleware(schema: Schema): void {
  // Pre-save audit hooks
  schema.pre("save", preAuditMiddleware);
  schema.pre("save", auditStatusChange);
  schema.pre("save", auditVersionDataChange);

  // Pre-remove audit hooks
  schema.pre("deleteOne", preRemoveAuditMiddleware);
  schema.pre("findOneAndDelete", preRemoveAuditMiddleware);

  // Instance methods for audit functionality
  schema.methods.auditRollback = auditRollback;
  schema.methods.auditArchive = auditArchive;
  schema.methods.auditPublish = auditPublish;
  schema.methods.getAuditByAction = getAuditByAction;
  schema.methods.getAuditByDateRange = getAuditByDateRange;
  schema.methods.getAuditByUser = getAuditByUser;
  schema.methods.cleanOldAuditEntries = cleanOldAuditEntries;
  schema.methods.getChangedFieldsWithValues = getChangedFieldsWithValues;
  schema.methods.getVersionDataChanges = getVersionDataChanges;
}

export default {
  preAuditMiddleware,
  auditStatusChange,
  auditVersionDataChange,
  preRemoveAuditMiddleware,
  auditRollback,
  auditArchive,
  auditPublish,
  getAuditByAction,
  getAuditByDateRange,
  getAuditByUser,
  cleanOldAuditEntries,
  applyAuditMiddleware,
};
