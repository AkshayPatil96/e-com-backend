/**
 * ProductVersion Module Index
 * Main entry point for the enhanced ProductVersion system
 */

import mongoose, { Model, Schema } from "mongoose";
import { IProductVersion } from "../../@types/productVersion";

// Import all schemas
import {
  auditTrailSchema,
  versionAnalyticsSchema,
  versionComparisonSchema,
  versionDataSchema,
  versionMetadataSchema,
} from "./schemas";

// Import middleware
import {
  AuditMiddleware,
  ValidationMiddleware,
  VersioningMiddleware,
} from "./middleware";

// Import methods
import { AnalyticsMethods, VersionManagementMethods } from "./methods";

// Import static methods
import StaticMethods from "./methods/static.methods";

// Extend the Mongoose Model interface to include static methods
interface IProductVersionModel extends Model<IProductVersion> {
  // Static methods will be added dynamically
}

/**
 * Enhanced ProductVersion Schema
 * Complete version control with audit trails, analytics, and business logic
 */
const productVersionSchema = new Schema<IProductVersion>(
  {
    // Core product reference
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product ID is required"],
      index: true,
    },

    // Version identification
    versionNumber: {
      type: String,
      required: [true, "Version number is required"],
      trim: true,
      validate: {
        validator: function (value: string) {
          // Semantic versioning or simple versioning pattern
          const semanticRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)/;
          const simpleRegex = /^v?\d+(?:\.\d+)*$/i;
          return semanticRegex.test(value) || simpleRegex.test(value);
        },
        message: "Invalid version number format",
      },
    },

    // Version name (optional)
    versionName: {
      type: String,
      trim: true,
      maxlength: [100, "Version name cannot exceed 100 characters"],
    },

    // Version data (embedded schema)
    versionData: {
      type: versionDataSchema,
      required: [true, "Version data is required"],
    },

    // Version status flags
    isDraft: {
      type: Boolean,
      default: true,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: false,
      index: true,
    },

    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },

    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },

    // User references
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Created by user is required"],
      index: true,
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Updated by user is required"],
      index: true,
    },

    publishedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    archivedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    // Timestamp fields
    publishedAt: {
      type: Date,
      index: true,
    },

    archivedAt: {
      type: Date,
      index: true,
    },

    // Version relationships
    parentVersion: {
      type: Schema.Types.ObjectId,
      ref: "ProductVersion",
    },

    childVersions: {
      type: [{ type: Schema.Types.ObjectId, ref: "ProductVersion" }],
      default: [],
    },

    // Audit trail
    auditTrail: {
      type: [auditTrailSchema],
      default: [],
    },

    // Version metadata
    metadata: {
      type: versionMetadataSchema,
      default: () => ({
        size: 0,
        checksum: "",
        source: "manual",
      }),
    },

    // Analytics data
    analytics: {
      type: versionAnalyticsSchema,
      default: () => ({
        usage: {
          views: 0,
          downloads: 0,
          shares: 0,
          searchQueries: 0,
          compareViews: 0,
          exports: 0,
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
        performance: {},
        feedback: {
          ratings: [],
          averageRating: 0,
          reviewCount: 0,
          sentiment: {
            positive: 0,
            negative: 0,
            neutral: 0,
          },
        },
      }),
    },

    // Workflow status (optional)
    workflowStatus: {
      type: String,
      enum: ["draft", "review", "approved", "published"],
      default: "draft",
    },

    // Version creation timestamp (optional)
    versionCreatedAt: {
      type: Date,
      default: Date.now,
    },

    // Additional flags
    wasNew: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  },
);

// Create compound indexes for better query performance
productVersionSchema.index(
  { productId: 1, versionNumber: 1 },
  { unique: true },
);
productVersionSchema.index({ productId: 1, isActive: 1 });
productVersionSchema.index({ productId: 1, isPublished: 1 });
productVersionSchema.index({ productId: 1, createdAt: -1 });
productVersionSchema.index({ createdBy: 1, createdAt: -1 });
productVersionSchema.index({ "analytics.usage.views": -1 });
productVersionSchema.index({ "analytics.feedback.averageRating": -1 });
productVersionSchema.index({ workflowStatus: 1 });
productVersionSchema.index({ versionCreatedAt: -1 });

// Virtual for version age
productVersionSchema.virtual("versionAge").get(function () {
  return Date.now() - this.createdAt.getTime();
});

// Virtual for formatted version number
productVersionSchema.virtual("displayVersion").get(function () {
  return `v${this.versionNumber}`;
});

// Virtual for status summary
productVersionSchema.virtual("statusSummary").get(function () {
  if (this.isArchived) return "archived";
  if (this.isPublished) return "published";
  if (this.isActive) return "active";
  if (this.isDraft) return "draft";
  return "unknown";
});

// Apply middleware
AuditMiddleware.applyAuditMiddleware(productVersionSchema);
ValidationMiddleware.applyValidationMiddleware(productVersionSchema);
VersioningMiddleware.applyVersioningMiddleware(productVersionSchema);

// Apply instance methods - Version Management Methods
productVersionSchema.methods.compareVersion =
  VersionManagementMethods.compareVersion;
productVersionSchema.methods.calculateChanges =
  VersionManagementMethods.calculateChanges;
productVersionSchema.methods.getFieldPaths =
  VersionManagementMethods.getFieldPaths;
productVersionSchema.methods.getNestedValue =
  VersionManagementMethods.getNestedValue;
productVersionSchema.methods.createDiff = VersionManagementMethods.createDiff;
productVersionSchema.methods.rollbackToVersion =
  VersionManagementMethods.rollbackToVersion;
productVersionSchema.methods.generateRollbackVersionNumber =
  VersionManagementMethods.generateRollbackVersionNumber;
productVersionSchema.methods.publishVersion =
  VersionManagementMethods.publishVersion;
productVersionSchema.methods.archiveVersion =
  VersionManagementMethods.archiveVersion;
productVersionSchema.methods.restoreFromArchive =
  VersionManagementMethods.restoreFromArchive;
productVersionSchema.methods.duplicateVersion =
  VersionManagementMethods.duplicateVersion;
productVersionSchema.methods.generateNextVersionNumber =
  VersionManagementMethods.generateNextVersionNumber;

// Apply instance methods - Analytics Methods
productVersionSchema.methods.trackView = AnalyticsMethods.trackView;
productVersionSchema.methods.trackDownload = AnalyticsMethods.trackDownload;
productVersionSchema.methods.trackShare = AnalyticsMethods.trackShare;
productVersionSchema.methods.trackConversion = AnalyticsMethods.trackConversion;
productVersionSchema.methods.addRating = AnalyticsMethods.addRating;
productVersionSchema.methods.updatePerformanceMetrics =
  AnalyticsMethods.updatePerformanceMetrics;
productVersionSchema.methods.getAnalyticsSummary =
  AnalyticsMethods.getAnalyticsSummary;
productVersionSchema.methods.getPerformanceTrends =
  AnalyticsMethods.getPerformanceTrends;
productVersionSchema.methods.resetAnalytics = AnalyticsMethods.resetAnalytics;
productVersionSchema.methods.exportAnalytics = AnalyticsMethods.exportAnalytics;

// Apply static methods
Object.keys(StaticMethods).forEach((methodName) => {
  productVersionSchema.statics[methodName] =
    StaticMethods[methodName as keyof typeof StaticMethods];
});

// Pre-save hook for additional validation
productVersionSchema.pre("save", function (next) {
  // Ensure only one active version per product
  if (this.isActive && this.isModified("isActive")) {
    (this.constructor as any)
      .updateMany(
        {
          productId: this.productId,
          _id: { $ne: this._id },
          isActive: true,
        },
        { $set: { isActive: false } },
      )
      .exec();
  }

  // Ensure only one published version per product
  if (this.isPublished && this.isModified("isPublished")) {
    (this.constructor as any)
      .updateMany(
        {
          productId: this.productId,
          _id: { $ne: this._id },
          isPublished: true,
        },
        { $set: { isPublished: false } },
      )
      .exec();
  }

  next();
});

// Create the model
const ProductVersion: IProductVersionModel = mongoose.model<
  IProductVersion,
  IProductVersionModel
>("ProductVersion", productVersionSchema);

export default ProductVersion;

// Also export the schema for external use
export { productVersionSchema };
