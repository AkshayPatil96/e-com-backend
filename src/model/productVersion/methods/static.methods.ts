/**
 * Static Methods for ProductVersion Model
 * Class-level methods for batch operations and analytics
 */

import { FilterQuery, Model, Types } from "mongoose";
import { IProductVersion } from "../../../@types/productVersion";

/**
 * Get version history for a product
 */
export function getVersionHistory(
  this: Model<IProductVersion>,
  productId: Types.ObjectId,
  options?: {
    limit?: number;
    sortBy?: "createdAt" | "versionNumber";
    sortOrder?: "asc" | "desc";
    includeArchived?: boolean;
  },
): Promise<IProductVersion[]> {
  const {
    limit = 50,
    sortBy = "createdAt",
    sortOrder = "desc",
    includeArchived = false,
  } = options || {};

  const query: FilterQuery<IProductVersion> = { productId };

  if (!includeArchived) {
    query.isArchived = { $ne: true };
  }

  const sort: any = {};
  sort[sortBy] = sortOrder === "desc" ? -1 : 1;

  return this.find(query)
    .sort(sort)
    .limit(limit)
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email")
    .exec();
}

/**
 * Get active version for a product
 */
export function getActiveVersion(
  this: Model<IProductVersion>,
  productId: Types.ObjectId,
): Promise<IProductVersion | null> {
  return this.findOne({
    productId,
    isActive: true,
    isArchived: { $ne: true },
  }).exec();
}

/**
 * Get published version for a product
 */
export function getPublishedVersion(
  this: Model<IProductVersion>,
  productId: Types.ObjectId,
): Promise<IProductVersion | null> {
  return this.findOne({
    productId,
    isPublished: true,
    isArchived: { $ne: true },
  }).exec();
}

/**
 * Get latest version for a product
 */
export function getLatestVersion(
  this: Model<IProductVersion>,
  productId: Types.ObjectId,
): Promise<IProductVersion | null> {
  return this.findOne({
    productId,
    isArchived: { $ne: true },
  })
    .sort({ createdAt: -1 })
    .exec();
}

/**
 * Batch update versions
 */
export function batchUpdateVersions(
  this: Model<IProductVersion>,
  filter: FilterQuery<IProductVersion>,
  updateData: Partial<IProductVersion>,
  userId: Types.ObjectId,
): Promise<any> {
  const update = {
    ...updateData,
    updatedBy: userId,
    updatedAt: new Date(),
  };

  return this.updateMany(filter, { $set: update }).exec();
}

/**
 * Batch archive versions
 */
export function batchArchiveVersions(
  this: Model<IProductVersion>,
  versionIds: Types.ObjectId[],
  userId: Types.ObjectId,
  reason?: string,
): Promise<any> {
  return this.updateMany(
    { _id: { $in: versionIds } },
    {
      $set: {
        isArchived: true,
        archivedAt: new Date(),
        archivedBy: userId,
        updatedBy: userId,
        updatedAt: new Date(),
      },
      $push: {
        auditTrail: {
          action: "archived",
          timestamp: new Date(),
          userId: userId,
          userRole: "admin",
          changes: [
            {
              field: "isArchived",
              oldValue: false,
              newValue: true,
            },
          ],
          reason: reason || "Batch archive operation",
        },
      },
    },
  ).exec();
}

/**
 * Get version analytics summary for multiple products
 */
export function getAnalyticsSummary(
  this: Model<IProductVersion>,
  productIds?: Types.ObjectId[],
  dateRange?: { startDate: Date; endDate: Date },
): Promise<any> {
  const matchStage: any = {};

  if (productIds && productIds.length > 0) {
    matchStage.productId = { $in: productIds };
  }

  if (dateRange) {
    matchStage.createdAt = {
      $gte: dateRange.startDate,
      $lte: dateRange.endDate,
    };
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalVersions: { $sum: 1 },
        totalViews: { $sum: "$analytics.usage.views" },
        totalDownloads: { $sum: "$analytics.usage.downloads" },
        totalShares: { $sum: "$analytics.usage.shares" },
        totalPurchases: { $sum: "$analytics.conversion.purchases" },
        averageRating: { $avg: "$analytics.feedback.averageRating" },
        publishedVersions: {
          $sum: { $cond: ["$isPublished", 1, 0] },
        },
        archivedVersions: {
          $sum: { $cond: ["$isArchived", 1, 0] },
        },
      },
    },
  ])
    .exec()
    .then((results) => results[0] || {});
}

/**
 * Get top performing versions
 */
export function getTopPerformingVersions(
  this: Model<IProductVersion>,
  criteria: "views" | "downloads" | "conversion" | "rating" = "views",
  limit: number = 10,
  timeRange?: { startDate: Date; endDate: Date },
): Promise<IProductVersion[]> {
  const matchStage: any = { isArchived: { $ne: true } };

  if (timeRange) {
    matchStage.createdAt = {
      $gte: timeRange.startDate,
      $lte: timeRange.endDate,
    };
  }

  let sortField: string;
  switch (criteria) {
    case "views":
      sortField = "analytics.usage.views";
      break;
    case "downloads":
      sortField = "analytics.usage.downloads";
      break;
    case "conversion":
      sortField = "analytics.conversion.conversionRate";
      break;
    case "rating":
      sortField = "analytics.feedback.averageRating";
      break;
    default:
      sortField = "analytics.usage.views";
  }

  const sort: any = {};
  sort[sortField] = -1;

  return this.find(matchStage)
    .sort(sort)
    .limit(limit)
    .populate("productId", "name")
    .exec();
}

/**
 * Get version comparison data
 */
export function getVersionComparisons(
  this: Model<IProductVersion>,
  productId: Types.ObjectId,
  fromVersion?: string,
  toVersion?: string,
): Promise<any> {
  const pipeline: any[] = [{ $match: { productId } }];

  if (fromVersion && toVersion) {
    pipeline.push({
      $match: {
        versionNumber: { $in: [fromVersion, toVersion] },
      },
    });
  }

  pipeline.push(
    { $sort: { createdAt: 1 } },
    {
      $group: {
        _id: "$productId",
        versions: {
          $push: {
            versionNumber: "$versionNumber",
            createdAt: "$createdAt",
            analytics: "$analytics",
            isPublished: "$isPublished",
            isActive: "$isActive",
          },
        },
      },
    },
  );

  return this.aggregate(pipeline).exec();
}

/**
 * Clean up old versions
 */
export function cleanupOldVersions(
  this: Model<IProductVersion>,
  options: {
    olderThanDays: number;
    keepMinimum: number;
    excludePublished?: boolean;
    excludeActive?: boolean;
  },
): Promise<any> {
  const {
    olderThanDays,
    keepMinimum,
    excludePublished = true,
    excludeActive = true,
  } = options;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  return this.aggregate([
    {
      $match: {
        createdAt: { $lt: cutoffDate },
        isArchived: { $ne: true },
        ...(excludePublished && { isPublished: { $ne: true } }),
        ...(excludeActive && { isActive: { $ne: true } }),
      },
    },
    {
      $group: {
        _id: "$productId",
        versions: {
          $push: {
            _id: "$_id",
            versionNumber: "$versionNumber",
            createdAt: "$createdAt",
          },
        },
      },
    },
    {
      $project: {
        versionsToDelete: {
          $slice: [
            {
              $sortArray: {
                input: "$versions",
                sortBy: { createdAt: -1 },
              },
            },
            keepMinimum,
            { $subtract: [{ $size: "$versions" }, keepMinimum] },
          ],
        },
      },
    },
  ])
    .exec()
    .then(async (results) => {
      const idsToDelete: Types.ObjectId[] = [];

      results.forEach((result: any) => {
        if (result.versionsToDelete) {
          idsToDelete.push(...result.versionsToDelete.map((v: any) => v._id));
        }
      });

      if (idsToDelete.length > 0) {
        return this.updateMany(
          { _id: { $in: idsToDelete } },
          {
            $set: {
              isArchived: true,
              archivedAt: new Date(),
              updatedAt: new Date(),
            },
          },
        ).exec();
      }

      return { modifiedCount: 0 };
    });
}

/**
 * Export version data
 */
export function exportVersionData(
  this: Model<IProductVersion>,
  filter: FilterQuery<IProductVersion>,
  format: "json" | "csv" = "json",
  fields?: string[],
): Promise<any> {
  let query = this.find(filter);

  if (fields && fields.length > 0) {
    query = query.select(fields.join(" "));
  }

  return query.exec().then((versions) => {
    if (format === "csv") {
      if (versions.length === 0) return "";

      // Convert to CSV
      const headers = Object.keys(versions[0].toObject());
      const csvData = [
        headers.join(","),
        ...versions.map((version) =>
          headers
            .map((header) => JSON.stringify(version.get(header) || ""))
            .join(","),
        ),
      ].join("\n");

      return csvData;
    }

    return versions;
  });
}

/**
 * Get version statistics
 */
export function getVersionStatistics(
  this: Model<IProductVersion>,
  groupBy: "product" | "date" | "status" = "product",
): Promise<any> {
  let groupStage: any;

  switch (groupBy) {
    case "product":
      groupStage = {
        _id: "$productId",
        totalVersions: { $sum: 1 },
        publishedVersions: { $sum: { $cond: ["$isPublished", 1, 0] } },
        archivedVersions: { $sum: { $cond: ["$isArchived", 1, 0] } },
        draftVersions: { $sum: { $cond: ["$isDraft", 1, 0] } },
        averageViews: { $avg: "$analytics.usage.views" },
        totalDownloads: { $sum: "$analytics.usage.downloads" },
      };
      break;
    case "date":
      groupStage = {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" },
        },
        totalVersions: { $sum: 1 },
        publishedVersions: { $sum: { $cond: ["$isPublished", 1, 0] } },
      };
      break;
    case "status":
      groupStage = {
        _id: {
          isPublished: "$isPublished",
          isArchived: "$isArchived",
          isDraft: "$isDraft",
          isActive: "$isActive",
        },
        count: { $sum: 1 },
      };
      break;
  }

  return this.aggregate([{ $group: groupStage }, { $sort: { _id: 1 } }]).exec();
}

export default {
  getVersionHistory,
  getActiveVersion,
  getPublishedVersion,
  getLatestVersion,
  batchUpdateVersions,
  batchArchiveVersions,
  getAnalyticsSummary,
  getTopPerformingVersions,
  getVersionComparisons,
  cleanupOldVersions,
  exportVersionData,
  getVersionStatistics,
};
