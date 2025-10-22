/**
 * Methods Index for ProductVersion
 * Combines all instance method modules
 */

import { Schema } from "mongoose";
import AnalyticsMethods from "./analytics.methods";
import VersionManagementMethods from "./versionManagement.methods";

/**
 * Apply all instance methods to the ProductVersion schema
 */
export function applyAllMethods(schema: Schema): void {
  // Version Management Methods
  schema.methods.compareVersion = VersionManagementMethods.compareVersion;
  schema.methods.calculateChanges = VersionManagementMethods.calculateChanges;
  schema.methods.getFieldPaths = VersionManagementMethods.getFieldPaths;
  schema.methods.getNestedValue = VersionManagementMethods.getNestedValue;
  schema.methods.createDiff = VersionManagementMethods.createDiff;
  schema.methods.rollbackToVersion = VersionManagementMethods.rollbackToVersion;
  schema.methods.generateRollbackVersionNumber =
    VersionManagementMethods.generateRollbackVersionNumber;
  schema.methods.publishVersion = VersionManagementMethods.publishVersion;
  schema.methods.archiveVersion = VersionManagementMethods.archiveVersion;
  schema.methods.restoreFromArchive =
    VersionManagementMethods.restoreFromArchive;
  schema.methods.duplicateVersion = VersionManagementMethods.duplicateVersion;
  schema.methods.generateNextVersionNumber =
    VersionManagementMethods.generateNextVersionNumber;

  // Analytics Methods
  schema.methods.trackView = AnalyticsMethods.trackView;
  schema.methods.trackDownload = AnalyticsMethods.trackDownload;
  schema.methods.trackShare = AnalyticsMethods.trackShare;
  schema.methods.trackConversion = AnalyticsMethods.trackConversion;
  schema.methods.addRating = AnalyticsMethods.addRating;
  schema.methods.updatePerformanceMetrics =
    AnalyticsMethods.updatePerformanceMetrics;
  schema.methods.getAnalyticsSummary = AnalyticsMethods.getAnalyticsSummary;
  schema.methods.getPerformanceTrends = AnalyticsMethods.getPerformanceTrends;
  schema.methods.resetAnalytics = AnalyticsMethods.resetAnalytics;
  schema.methods.exportAnalytics = AnalyticsMethods.exportAnalytics;
}

// Export individual method modules
export { AnalyticsMethods, VersionManagementMethods };

export default {
  applyAllMethods,
  VersionManagementMethods,
  AnalyticsMethods,
};
