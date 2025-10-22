/**
 * Versioning Middleware for ProductVersion
 * Automated version control and business logic
 */

import crypto from "crypto";
import { Document, Schema } from "mongoose";
import { IProductVersion } from "../../../@types/productVersion";

/**
 * Pre-save versioning middleware
 */
export function preVersioningMiddleware(
  this: Document & IProductVersion,
): void {
  const now = new Date();

  // Set timestamps
  if (this.isNew) {
    this.createdAt = now;
    this.versionCreatedAt = now;
  }
  this.updatedAt = now;

  // Auto-increment version if this is a new version
  if (this.isNew && !this.versionNumber) {
    this.autoIncrementVersion();
  }

  // Update metadata
  this.updateVersionMetadata();

  // Set version status defaults
  this.setVersionDefaults();

  // Update analytics timestamps
  this.updateAnalyticsTimestamps();
}

/**
 * Auto-increment version number
 */
export function autoIncrementVersion(this: Document & IProductVersion): void {
  if (!this.versionNumber) {
    // For new products, start with version 1.0.0
    this.versionNumber = "1.0.0";
  }
}

/**
 * Update version metadata
 */
export function updateVersionMetadata(this: Document & IProductVersion): void {
  if (this.isModified("versionData")) {
    // Calculate checksum for data integrity
    const dataString = JSON.stringify(this.versionData);
    this.metadata.checksum = crypto
      .createHash("md5")
      .update(dataString)
      .digest("hex");

    // Calculate data size
    this.metadata.size = Buffer.byteLength(dataString, "utf8");

    // Update compression info if applicable
    if (!this.metadata.compression) {
      this.metadata.compression = "none";
    }

    // Set source if not already set
    if (!this.metadata.source) {
      this.metadata.source = this.isNew ? "manual" : "manual";
    }

    // Initialize tags if empty
    if (!this.metadata.tags) {
      this.metadata.tags = [];
    }
  }
}

/**
 * Set version defaults
 */
export function setVersionDefaults(this: Document & IProductVersion): void {
  // Set default status values
  if (this.isDraft === undefined) {
    this.isDraft = true;
  }

  if (this.isActive === undefined) {
    this.isActive = false;
  }

  if (this.isPublished === undefined) {
    this.isPublished = false;
  }

  if (this.isArchived === undefined) {
    this.isArchived = false;
  }

  // Set workflow status
  if (!this.workflowStatus) {
    this.workflowStatus = "draft";
  }

  // Initialize analytics if not present
  if (!this.analytics) {
    this.analytics = {
      usage: {
        views: 0,
        downloads: 0,
        shares: 0,
        clickThroughRate: 0,
        bounceRate: 0,
        timeOnPage: 0,
      },
      conversion: {
        impressions: 0,
        clicks: 0,
        purchases: 0,
        conversionRate: 0,
        addedToCart: 0,
        abandonmentRate: 0,
        revenue: 0,
      },
      performance: {
        loadTime: 0,
        seoScore: 0,
        accessibilityScore: 0,
        performanceScore: 0,
      },
      feedback: {
        ratings: [],
        averageRating: 0,
        reviewCount: 0,
        sentimentScore: 0,
      },
    };
  }
}

/**
 * Update analytics timestamps
 */
export function updateAnalyticsTimestamps(
  this: Document & IProductVersion,
): void {
  const now = new Date();

  if (this.isModified("analytics")) {
    if (!this.analytics.lastUpdated) {
      this.analytics.lastUpdated = now;
    }
  }
}

/**
 * Ensure unique active version per product
 */
export function ensureUniqueActiveVersion(
  this: Document & IProductVersion,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (this.isActive && this.productId) {
      // Find other active versions for this product
      (this.constructor as any)
        .updateMany(
          {
            productId: this.productId,
            _id: { $ne: this._id },
            isActive: true,
          },
          {
            $set: {
              isActive: false,
              updatedAt: new Date(),
            },
          },
        )
        .then(() => {
          resolve();
        })
        .catch(reject);
    } else {
      resolve();
    }
  });
}

/**
 * Ensure unique published version per product
 */
export function ensureUniquePublishedVersion(
  this: Document & IProductVersion,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (this.isPublished && this.productId) {
      // Find other published versions for this product
      (this.constructor as any)
        .updateMany(
          {
            productId: this.productId,
            _id: { $ne: this._id },
            isPublished: true,
          },
          {
            $set: {
              isPublished: false,
              updatedAt: new Date(),
            },
          },
        )
        .then(() => {
          resolve();
        })
        .catch(reject);
    } else {
      resolve();
    }
  });
}

/**
 * Update parent-child version relationships
 */
export function updateVersionRelationships(
  this: Document & IProductVersion,
): void {
  if (this.parentVersion) {
    // Add this version to parent's child versions
    (this.constructor as any)
      .findByIdAndUpdate(this.parentVersion, {
        $addToSet: { childVersions: this._id },
        $set: { updatedAt: new Date() },
      })
      .exec();
  }
}

/**
 * Update relationships when version is deleted
 */
export function updateVersionRelationshipsOnDelete(
  this: Document & IProductVersion,
): void {
  // Remove from parent's child versions
  if (this.parentVersion) {
    (this.constructor as any)
      .findByIdAndUpdate(this.parentVersion, {
        $pull: { childVersions: this._id },
        $set: { updatedAt: new Date() },
      })
      .exec();
  }

  // Update child versions to remove this as parent
  if (this.childVersions && this.childVersions.length > 0) {
    (this.constructor as any)
      .updateMany(
        { _id: { $in: this.childVersions } },
        {
          $unset: { parentVersion: 1 },
          $set: { updatedAt: new Date() },
        },
      )
      .exec();
  }
}

/**
 * Calculate conversion rate
 */
export function calculateConversionRate(
  this: Document & IProductVersion,
): number {
  if (!this.analytics?.conversion) return 0;

  const { addedToCart = 0, purchases = 0 } = this.analytics.conversion;
  if (addedToCart === 0) return 0;

  return Number(((purchases / addedToCart) * 100).toFixed(2));
}

/**
 * Calculate average rating
 */
export function calculateAverageRating(
  this: Document & IProductVersion,
): number {
  if (
    !this.analytics?.feedback?.ratings ||
    this.analytics.feedback.ratings.length === 0
  ) {
    return 0;
  }

  const sum = this.analytics.feedback.ratings.reduce(
    (acc: number, rating: number) => acc + rating,
    0,
  );
  return Number((sum / this.analytics.feedback.ratings.length).toFixed(1));
}

/**
 * Calculate data size in bytes
 */
export function calculateDataSize(this: Document & IProductVersion): number {
  if (!this.versionData) return 0;

  const dataString = JSON.stringify(this.versionData);
  return Buffer.byteLength(dataString, "utf8");
}

/**
 * Calculate checksum for data integrity
 */
export function calculateChecksum(this: Document & IProductVersion): string {
  if (!this.versionData) return "";

  const dataString = JSON.stringify(this.versionData);
  return crypto.createHash("md5").update(dataString).digest("hex");
}

/**
 * Clear version cache (placeholder for cache implementation)
 */
export function clearVersionCache(this: Document & IProductVersion): void {
  // This would integrate with your caching system (Redis, etc.)
  // For now, it's a placeholder
  console.log(
    `Clearing cache for version ${this.versionNumber} of product ${this.productId}`,
  );
}

/**
 * Schedule analytics update (placeholder for background job)
 */
export function scheduleAnalyticsUpdate(
  this: Document & IProductVersion,
): void {
  // This would schedule a background job to update analytics
  // For now, it's a placeholder
  console.log(`Scheduling analytics update for version ${this.versionNumber}`);
}

/**
 * Validate version uniqueness
 */
export function validateUniqueness(
  this: Document & IProductVersion,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (this.isNew && this.productId && this.versionNumber) {
      (this.constructor as any)
        .findOne({
          productId: this.productId,
          versionNumber: this.versionNumber,
          _id: { $ne: this._id },
        })
        .then((existingVersion: any) => {
          if (existingVersion) {
            reject(
              new Error(
                `Version ${this.versionNumber} already exists for this product`,
              ),
            );
          } else {
            resolve();
          }
        })
        .catch(reject);
    } else {
      resolve();
    }
  });
}

/**
 * Check if version number is valid
 */
export function isValidVersionNumber(
  this: Document & IProductVersion,
  versionNumber: string,
): boolean {
  // Semantic versioning pattern (MAJOR.MINOR.PATCH)
  const semanticVersionRegex =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

  // Simple versioning pattern (v1, v2, etc.)
  const simpleVersionRegex = /^v?\d+(?:\.\d+)*$/i;

  return (
    semanticVersionRegex.test(versionNumber) ||
    simpleVersionRegex.test(versionNumber)
  );
}

/**
 * Apply versioning middleware to schema
 */
export function applyVersioningMiddleware(schema: Schema): void {
  // Pre-save hooks
  schema.pre("save", preVersioningMiddleware);
  schema.pre("save", ensureUniqueActiveVersion);
  schema.pre("save", ensureUniquePublishedVersion);

  // Instance methods
  schema.methods.autoIncrementVersion = autoIncrementVersion;
  schema.methods.updateVersionMetadata = updateVersionMetadata;
  schema.methods.setVersionDefaults = setVersionDefaults;
  schema.methods.updateAnalyticsTimestamps = updateAnalyticsTimestamps;
  schema.methods.ensureUniqueActiveVersion = ensureUniqueActiveVersion;
  schema.methods.ensureUniquePublishedVersion = ensureUniquePublishedVersion;
  schema.methods.updateVersionRelationships = updateVersionRelationships;
  schema.methods.updateVersionRelationshipsOnDelete =
    updateVersionRelationshipsOnDelete;
  schema.methods.calculateConversionRate = calculateConversionRate;
  schema.methods.calculateAverageRating = calculateAverageRating;
  schema.methods.calculateDataSize = calculateDataSize;
  schema.methods.calculateChecksum = calculateChecksum;
  schema.methods.clearVersionCache = clearVersionCache;
  schema.methods.scheduleAnalyticsUpdate = scheduleAnalyticsUpdate;
  schema.methods.validateUniqueness = validateUniqueness;
  schema.methods.isValidVersionNumber = isValidVersionNumber;
}

export default {
  preVersioningMiddleware,
  autoIncrementVersion,
  updateVersionMetadata,
  setVersionDefaults,
  updateAnalyticsTimestamps,
  ensureUniqueActiveVersion,
  ensureUniquePublishedVersion,
  updateVersionRelationships,
  updateVersionRelationshipsOnDelete,
  calculateConversionRate,
  calculateAverageRating,
  calculateDataSize,
  calculateChecksum,
  clearVersionCache,
  scheduleAnalyticsUpdate,
  validateUniqueness,
  isValidVersionNumber,
  applyVersioningMiddleware,
};
