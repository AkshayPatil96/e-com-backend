/**
 * Version Management Instance Methods
 * Methods for managing product version lifecycle
 */

import { Document, Types } from "mongoose";
import {
  IProductVersion,
  IVersionComparison,
} from "../../../@types/productVersion";

/**
 * Compare this version with another version
 */
export function compareVersion(
  this: Document & IProductVersion,
  otherVersionId: Types.ObjectId,
): Promise<IVersionComparison> {
  return new Promise(async (resolve, reject) => {
    try {
      const otherVersion = await (this.constructor as any).findById(
        otherVersionId,
      );
      if (!otherVersion) {
        reject(new Error("Version not found for comparison"));
        return;
      }

      const comparison: IVersionComparison = {
        fromVersion: this.versionNumber,
        toVersion: otherVersion.versionNumber,
        comparedAt: new Date(),
        comparedBy: this.updatedBy,
        changes: this.calculateChanges(
          this.versionData,
          otherVersion.versionData,
        ),
        summary: {
          totalChanges: 0,
          addedFields: 0,
          modifiedFields: 0,
          removedFields: 0,
          criticalChanges: 0,
          compatibilityScore: 100,
          significance: "minor" as "major" | "minor" | "patch",
        },
      };

      // Calculate summary
      comparison.summary.totalChanges = comparison.changes.length;
      comparison.summary.addedFields = comparison.changes.filter(
        (c) => c.type === "added",
      ).length;
      comparison.summary.modifiedFields = comparison.changes.filter(
        (c) => c.type === "modified",
      ).length;
      comparison.summary.removedFields = comparison.changes.filter(
        (c) => c.type === "removed",
      ).length;

      // Determine significance
      if (
        comparison.summary.totalChanges > 10 ||
        comparison.changes.some((c) => c.field === "price.basePrice")
      ) {
        comparison.summary.significance = "major";
      } else if (comparison.summary.totalChanges > 5) {
        comparison.summary.significance = "minor";
      } else {
        comparison.summary.significance = "patch";
      }

      resolve(comparison);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Calculate detailed changes between two version data objects
 */
export function calculateChanges(
  this: Document & IProductVersion,
  currentData: any,
  otherData: any,
): Array<{
  field: string;
  type: "added" | "modified" | "removed";
  oldValue: any;
  newValue: any;
}> {
  const changes: Array<{
    field: string;
    type: "added" | "modified" | "removed";
    oldValue: any;
    newValue: any;
  }> = [];

  // Get all unique field paths
  const allFields = new Set([
    ...this.getFieldPaths(currentData, ""),
    ...this.getFieldPaths(otherData, ""),
  ]);

  allFields.forEach((field) => {
    const currentValue = this.getNestedValue(currentData, field);
    const otherValue = this.getNestedValue(otherData, field);

    if (currentValue === undefined && otherValue !== undefined) {
      changes.push({
        field,
        type: "removed",
        oldValue: otherValue,
        newValue: undefined,
      });
    } else if (currentValue !== undefined && otherValue === undefined) {
      changes.push({
        field,
        type: "added",
        oldValue: undefined,
        newValue: currentValue,
      });
    } else if (JSON.stringify(currentValue) !== JSON.stringify(otherValue)) {
      changes.push({
        field,
        type: "modified",
        oldValue: otherValue,
        newValue: currentValue,
      });
    }
  });

  return changes;
}

/**
 * Get all field paths from an object
 */
export function getFieldPaths(
  this: Document & IProductVersion,
  obj: any,
  prefix: string,
): string[] {
  const paths: string[] = [];

  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    Object.keys(obj).forEach((key) => {
      const fullPath = prefix ? `${prefix}.${key}` : key;

      if (
        obj[key] &&
        typeof obj[key] === "object" &&
        !Array.isArray(obj[key])
      ) {
        paths.push(...this.getFieldPaths(obj[key], fullPath));
      } else {
        paths.push(fullPath);
      }
    });
  }

  return paths;
}

/**
 * Get nested value from object using dot notation
 */
export function getNestedValue(
  this: Document & IProductVersion,
  obj: any,
  path: string,
): any {
  return path.split(".").reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

/**
 * Create a diff summary between this version and another
 */
export function createDiff(
  this: Document & IProductVersion,
  otherVersionId: Types.ObjectId,
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const comparison = await this.compareVersion(otherVersionId);

      let diff = `Comparison between ${comparison.fromVersion} and ${comparison.toVersion}\n`;
      diff += `Total changes: ${comparison.summary.totalChanges}\n`;
      diff += `Significance: ${comparison.summary.significance}\n\n`;

      comparison.changes.forEach((change) => {
        diff += `${change.type.toUpperCase()}: ${change.field}\n`;
        if (change.type === "modified") {
          diff += `  Old: ${JSON.stringify(change.oldValue)}\n`;
          diff += `  New: ${JSON.stringify(change.newValue)}\n`;
        } else if (change.type === "added") {
          diff += `  Value: ${JSON.stringify(change.newValue)}\n`;
        } else if (change.type === "removed") {
          diff += `  Value: ${JSON.stringify(change.oldValue)}\n`;
        }
        diff += "\n";
      });

      resolve(diff);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Rollback to a previous version
 */
export function rollbackToVersion(
  this: Document & IProductVersion,
  targetVersionId: Types.ObjectId,
  reason?: string,
): Promise<IProductVersion> {
  return new Promise(async (resolve, reject) => {
    try {
      const targetVersion = await (this.constructor as any).findById(
        targetVersionId,
      );
      if (!targetVersion) {
        reject(new Error("Target version not found"));
        return;
      }

      if (targetVersion.productId.toString() !== this.productId.toString()) {
        reject(new Error("Cannot rollback to version of different product"));
        return;
      }

      // Store original data for audit
      const originalData = { ...this.versionData };
      const originalVersion = this.versionNumber;

      // Copy data from target version
      this.versionData = { ...targetVersion.versionData };
      this.versionNumber = this.generateRollbackVersionNumber(originalVersion);

      // Add to audit trail
      this.auditTrail.push({
        action: "restored",
        timestamp: new Date(),
        userId: this.updatedBy,
        userRole: "admin",
        changes: [
          {
            field: "rollback",
            oldValue: { version: originalVersion, data: originalData },
            newValue: {
              version: this.versionNumber,
              targetVersion: targetVersion.versionNumber,
            },
          },
        ],
        reason:
          reason || `Rolled back to version ${targetVersion.versionNumber}`,
      });

      await this.save();
      resolve(this);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate version number for rollback
 */
export function generateRollbackVersionNumber(
  this: Document & IProductVersion,
  originalVersion: string,
): string {
  const timestamp = new Date().getTime();
  return `${originalVersion}-rollback-${timestamp}`;
}

/**
 * Publish this version
 */
export function publishVersion(
  this: Document & IProductVersion,
  reason?: string,
): Promise<IProductVersion> {
  return new Promise(async (resolve, reject) => {
    try {
      if (this.isPublished) {
        reject(new Error("Version is already published"));
        return;
      }

      if (!this.versionData) {
        reject(new Error("Cannot publish version without data"));
        return;
      }

      // Validate version data before publishing
      const validationErrors = this.validateVersionData();
      if (validationErrors.length > 0) {
        reject(new Error(`Cannot publish: ${validationErrors.join(", ")}`));
        return;
      }

      // Set publish status
      this.isPublished = true;
      this.isDraft = false;
      this.publishedAt = new Date();
      this.publishedBy = this.updatedBy;

      // Add audit entry
      this.auditTrail.push({
        action: "published",
        timestamp: new Date(),
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
      });

      await this.save();
      resolve(this);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Archive this version
 */
export function archiveVersion(
  this: Document & IProductVersion,
  reason?: string,
): Promise<IProductVersion> {
  return new Promise(async (resolve, reject) => {
    try {
      if (this.isArchived) {
        reject(new Error("Version is already archived"));
        return;
      }

      if (this.isActive) {
        reject(new Error("Cannot archive active version"));
        return;
      }

      // Set archive status
      this.isArchived = true;
      this.isPublished = false;
      this.archivedAt = new Date();
      this.archivedBy = this.updatedBy;

      // Add audit entry
      this.auditTrail.push({
        action: "archived",
        timestamp: new Date(),
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
      });

      await this.save();
      resolve(this);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Restore from archive
 */
export function restoreFromArchive(
  this: Document & IProductVersion,
  reason?: string,
): Promise<IProductVersion> {
  return new Promise(async (resolve, reject) => {
    try {
      if (!this.isArchived) {
        reject(new Error("Version is not archived"));
        return;
      }

      // Restore from archive
      this.isArchived = false;
      this.archivedAt = undefined;
      this.archivedBy = undefined;
      this.isDraft = true; // Restore as draft

      // Add audit entry
      this.auditTrail.push({
        action: "restored",
        timestamp: new Date(),
        userId: this.updatedBy,
        userRole: "admin",
        changes: [
          {
            field: "isArchived",
            oldValue: true,
            newValue: false,
          },
        ],
        reason: reason || "Version restored from archive",
      });

      await this.save();
      resolve(this);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Duplicate this version
 */
export function duplicateVersion(
  this: Document & IProductVersion,
  newVersionNumber?: string,
): Promise<IProductVersion> {
  return new Promise(async (resolve, reject) => {
    try {
      const duplicateData = {
        ...this.toObject(),
        _id: new Types.ObjectId(),
        versionNumber: newVersionNumber || this.generateNextVersionNumber(),
        isDraft: true,
        isActive: false,
        isPublished: false,
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: undefined,
        archivedAt: undefined,
        publishedBy: undefined,
        archivedBy: undefined,
        parentVersion: this._id,
        auditTrail: [],
      };

      const newVersion = new (this.constructor as any)(duplicateData);

      // Add creation audit entry
      newVersion.auditTrail.push({
        action: "created",
        timestamp: new Date(),
        userId: this.updatedBy,
        userRole: "admin",
        changes: [
          {
            field: "duplicate",
            oldValue: null,
            newValue: `Duplicated from version ${this.versionNumber}`,
          },
        ],
        reason: `Duplicated from version ${this.versionNumber}`,
      });

      await newVersion.save();
      resolve(newVersion);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate next version number
 */
export function generateNextVersionNumber(
  this: Document & IProductVersion,
): string {
  const current = this.versionNumber;

  // Simple increment for now
  const match = current.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (match) {
    const [, major, minor, patch] = match;
    return `${major}.${minor}.${parseInt(patch) + 1}`;
  }

  // Fallback
  return `${current}-copy`;
}

export default {
  compareVersion,
  calculateChanges,
  getFieldPaths,
  getNestedValue,
  createDiff,
  rollbackToVersion,
  generateRollbackVersionNumber,
  publishVersion,
  archiveVersion,
  restoreFromArchive,
  duplicateVersion,
  generateNextVersionNumber,
};
