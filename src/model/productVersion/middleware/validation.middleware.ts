/**
 * Version Validation Middleware
 * Comprehensive validation for product version data
 */

import { Document, Schema } from "mongoose";
import { IProductVersion, IVersionData } from "../../../@types/productVersion";

/**
 * Pre-save validation middleware
 */
export function preValidationMiddleware(
  this: Document & IProductVersion,
): void {
  // Validate version number format
  if (this.versionNumber && !this.isValidVersionNumber(this.versionNumber)) {
    throw new Error(
      "Invalid version number format. Use semantic versioning (e.g., 1.0.0)",
    );
  }

  // Ensure version uniqueness per product
  if (this.isNew && this.productId) {
    // This will be checked in pre-save hook
    this.validateUniqueness();
  }

  // Validate version data integrity
  if (this.versionData) {
    this.validateVersionData();
  }

  // Validate analytics data
  if (this.analytics) {
    this.validateAnalytics();
  }

  // Set default values
  this.setDefaultValues();
}

/**
 * Pre-save middleware for business logic
 */
export function preSaveMiddleware(this: Document & IProductVersion): void {
  // Update checksum if version data changed
  if (this.isModified("versionData")) {
    this.metadata.checksum = this.calculateChecksum();
    this.metadata.size = this.calculateDataSize();
  }

  // Update conversion rate if analytics changed
  if (this.isModified("analytics.conversion")) {
    this.analytics.conversion.conversionRate = this.calculateConversionRate();
  }

  // Update average rating if ratings changed
  if (this.isModified("analytics.feedback.ratings")) {
    this.analytics.feedback.averageRating = this.calculateAverageRating();
    this.analytics.feedback.reviewCount =
      this.analytics.feedback.ratings.length;
  }

  // Ensure only one active version per product
  if (this.isActive && (this.isNew || this.isModified("isActive"))) {
    this.ensureUniqueActiveVersion();
  }

  // Ensure only one published version per product
  if (this.isPublished && (this.isNew || this.isModified("isPublished"))) {
    this.ensureUniquePublishedVersion();
  }

  // Update parent-child relationships
  if (this.parentVersion && this.isNew) {
    this.updateVersionRelationships();
  }
}

/**
 * Post-save middleware for cleanup and notifications
 */
export function postSaveMiddleware(this: Document & IProductVersion): void {
  // Add audit entry for save
  if (this.wasNew) {
    this.addAuditEntry("created", this.createdBy);
  } else {
    this.addAuditEntry("updated", this.updatedBy, this.getChangedFields());
  }

  // Update related versions
  if (this.parentVersion) {
    this.updateParentVersion();
  }

  // Clear cache if needed
  this.clearVersionCache();

  // Trigger analytics update
  this.scheduleAnalyticsUpdate();
}

/**
 * Pre-remove middleware
 */
export function preRemoveMiddleware(this: Document & IProductVersion): void {
  // Prevent removal of active or published versions
  if (this.isActive) {
    throw new Error("Cannot delete active version");
  }

  if (this.isPublished && !this.isArchived) {
    throw new Error("Cannot delete published version that is not archived");
  }

  // Update relationships
  this.updateVersionRelationshipsOnDelete();

  // Add audit entry
  this.addAuditEntry("deleted", this.updatedBy, undefined, "Version deleted");
}

/**
 * Version number validation
 */
export function validateVersionNumber(versionNumber: string): boolean {
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
 * Version data validation
 */
export function validateVersionDataIntegrity(
  versionData: IVersionData,
): string[] {
  const errors: string[] = [];

  // Validate required fields
  if (!versionData.title?.trim()) {
    errors.push("Product title is required");
  }

  if (!versionData.description?.trim()) {
    errors.push("Product description is required");
  }

  if (!versionData.price?.basePrice || versionData.price.basePrice <= 0) {
    errors.push("Valid base price is required");
  }

  if (
    versionData.price?.salePrice &&
    versionData.price.salePrice > versionData.price.basePrice
  ) {
    errors.push("Sale price cannot be higher than base price");
  }

  if (!versionData.category) {
    errors.push("Category is required");
  }

  if (!versionData.brand) {
    errors.push("Brand is required");
  }

  if (!versionData.inventory?.sku?.trim()) {
    errors.push("SKU is required");
  }

  if (versionData.inventory?.stock < 0) {
    errors.push("Stock cannot be negative");
  }

  // Validate media
  if (versionData.media?.images?.length > 0) {
    const primaryImages = versionData.media.images.filter(
      (img) => img.isPrimary,
    );
    if (primaryImages.length === 0) {
      errors.push("At least one primary image is required");
    }
    if (primaryImages.length > 1) {
      errors.push("Only one primary image is allowed");
    }
  }

  // Validate SEO
  if (!versionData.seo?.slug?.trim()) {
    errors.push("SEO slug is required");
  }

  // Validate shipping
  if (versionData.shipping?.weight && versionData.shipping.weight < 0) {
    errors.push("Shipping weight cannot be negative");
  }

  return errors;
}

/**
 * Analytics validation
 */
export function validateAnalyticsData(analytics: any): string[] {
  const errors: string[] = [];

  // Validate performance scores
  if (
    analytics.performance?.seoScore &&
    (analytics.performance.seoScore < 0 || analytics.performance.seoScore > 100)
  ) {
    errors.push("SEO score must be between 0 and 100");
  }

  if (
    analytics.performance?.accessibilityScore &&
    (analytics.performance.accessibilityScore < 0 ||
      analytics.performance.accessibilityScore > 100)
  ) {
    errors.push("Accessibility score must be between 0 and 100");
  }

  // Validate usage metrics
  if (analytics.usage?.views < 0) {
    errors.push("Views cannot be negative");
  }

  if (analytics.usage?.downloads < 0) {
    errors.push("Downloads cannot be negative");
  }

  if (analytics.usage?.shares < 0) {
    errors.push("Shares cannot be negative");
  }

  // Validate conversion metrics
  if (
    analytics.conversion?.conversionRate &&
    (analytics.conversion.conversionRate < 0 ||
      analytics.conversion.conversionRate > 100)
  ) {
    errors.push("Conversion rate must be between 0 and 100");
  }

  // Validate feedback
  if (analytics.feedback?.ratings) {
    for (const rating of analytics.feedback.ratings) {
      if (rating < 1 || rating > 5) {
        errors.push("Ratings must be between 1 and 5");
        break;
      }
    }
  }

  if (
    analytics.feedback?.averageRating &&
    (analytics.feedback.averageRating < 0 ||
      analytics.feedback.averageRating > 5)
  ) {
    errors.push("Average rating must be between 0 and 5");
  }

  return errors;
}

/**
 * Custom validation error handler
 */
export function handleValidationError(error: any): void {
  if (error.name === "ValidationError") {
    const messages = Object.values(error.errors).map((err: any) => err.message);
    throw new Error(`Validation failed: ${messages.join(", ")}`);
  }
  throw error;
}

/**
 * Apply all validation middleware to schema
 */
export function applyValidationMiddleware(schema: Schema): void {
  // Pre-validation hooks
  schema.pre("validate", preValidationMiddleware);

  // Pre-save hooks
  schema.pre("save", preSaveMiddleware);

  // Post-save hooks
  schema.post("save", postSaveMiddleware);

  // Pre-remove hooks
  schema.pre("deleteOne", preRemoveMiddleware);
  schema.pre("findOneAndDelete", preRemoveMiddleware);

  // Error handling
  schema.post("save", function (error: any, doc: any, next: any) {
    if (error) {
      handleValidationError(error);
    }
    next();
  });
}

export default {
  preValidationMiddleware,
  preSaveMiddleware,
  postSaveMiddleware,
  preRemoveMiddleware,
  validateVersionNumber,
  validateVersionDataIntegrity,
  validateAnalyticsData,
  handleValidationError,
  applyValidationMiddleware,
};
