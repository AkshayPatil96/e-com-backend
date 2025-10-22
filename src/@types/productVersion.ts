// Interface for the product version document
import { Document, Types } from "mongoose";

// Media interfaces
export interface IProductImage {
  url: string;
  alt: string;
  isPrimary: boolean;
  order: number;
}

export interface IProductVideo {
  url: string;
  thumbnail?: string;
  duration?: number;
  title?: string;
}

export interface IProductDocument {
  url: string;
  name: string;
  type: "manual" | "warranty" | "specification" | "certificate";
  size?: number;
}

export interface IProductMedia {
  images: IProductImage[];
  videos: IProductVideo[];
  documents: IProductDocument[];
}

// Product attribute interface
export interface IProductAttribute {
  name: string;
  value: string;
  type: "text" | "number" | "boolean" | "date" | "url";
}

// Price interface
export interface IProductPrice {
  basePrice: number;
  salePrice?: number;
  currency: "USD" | "EUR" | "GBP" | "INR" | "CAD" | "AUD";
}

// Inventory interface
export interface IProductInventory {
  sku: string;
  stock: number;
  lowStockThreshold: number;
  trackInventory: boolean;
}

// SEO interface
export interface IProductSEO {
  metaTitle?: string;
  metaDescription?: string;
  keywords: string[];
  slug: string;
}

// Shipping interface
export interface IProductDimensions {
  length?: number;
  width?: number;
  height?: number;
  unit: "cm" | "in";
}

export interface IProductShipping {
  weight?: number;
  dimensions: IProductDimensions;
  shippingClass: "standard" | "heavy" | "fragile" | "hazardous";
}

// Complete version data interface
export interface IVersionData {
  title: string;
  description: string;
  price: IProductPrice;
  category: Types.ObjectId;
  subcategory?: Types.ObjectId;
  brand: Types.ObjectId;
  specifications: Map<string, any>;
  attributes: IProductAttribute[];
  media: IProductMedia;
  inventory: IProductInventory;
  seo: IProductSEO;
  status: "draft" | "active" | "inactive" | "discontinued";
  visibility: "public" | "private" | "hidden";
  shipping: IProductShipping;
  variations: Types.ObjectId[];
  tags: string[];
  metadata: Map<string, any>;
}

// Audit trail interface
export interface IAuditTrail {
  action:
    | "created"
    | "updated"
    | "published"
    | "archived"
    | "restored"
    | "deleted";
  timestamp: Date;
  userId: Types.ObjectId;
  userRole: string;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

// Version metadata interface
export interface IVersionMetadata {
  size: number; // Size in bytes of the version data
  checksum: string; // MD5 hash for integrity verification
  compression?: "gzip" | "brotli" | "none";
  source: "manual" | "import" | "api" | "bulk" | "migration";
  migrationId?: string;
  importBatch?: string;
  tags: string[];
  notes?: string;
}

// Version comparison interface
export interface IVersionComparison {
  fromVersion: string;
  toVersion: string;
  comparedAt: Date;
  comparedBy: Types.ObjectId;
  changes: {
    field: string;
    type: "added" | "removed" | "modified";
    oldValue?: any;
    newValue?: any;
    impact: "low" | "medium" | "high" | "critical";
  }[];
  summary: {
    totalChanges: number;
    addedFields: number;
    modifiedFields: number;
    removedFields: number;
    criticalChanges: number;
    compatibilityScore: number; // 0-100
    significance: "major" | "minor" | "patch";
  };
}

// Version analytics interface
export interface IVersionAnalytics {
  performance: {
    loadTime?: number;
    renderTime?: number;
    seoScore?: number;
    accessibilityScore?: number;
    performanceScore?: number;
  };
  usage: {
    views: number;
    downloads: number;
    shares: number;
    lastAccessed?: Date;
    clickThroughRate?: number;
    bounceRate?: number;
    timeOnPage?: number;
    sources?: Record<string, number>;
    downloadFormats?: Record<string, number>;
    sharePlatforms?: Record<string, number>;
  };
  conversion: {
    impressions: number;
    clicks: number;
    purchases: number;
    conversionRate: number;
    addedToCart?: number;
    abandonmentRate?: number;
    revenue?: number;
  };
  feedback: {
    ratings: number[];
    averageRating: number;
    reviewCount: number;
    lastReviewDate?: Date;
    sentimentScore?: number;
  };
  lastUpdated?: Date;
  historical?: Array<{
    date: Date;
    snapshot: any;
  }>;
}

// Main ProductVersion interface
export interface IProductVersion extends Document {
  // Core identification
  productId: Types.ObjectId;
  versionNumber: string;
  versionName?: string;

  // Version data and metadata
  versionData: IVersionData;
  metadata: IVersionMetadata;

  // Version control
  parentVersion?: Types.ObjectId;
  childVersions?: Types.ObjectId[];
  isActive: boolean;
  isPublished: boolean;
  isDraft: boolean;
  isArchived: boolean;

  // Audit and tracking
  auditTrail: IAuditTrail[];
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  publishedBy?: Types.ObjectId;
  publishedAt?: Date;
  archivedBy?: Types.ObjectId;
  archivedAt?: Date;

  // Analytics and performance
  analytics: IVersionAnalytics;

  // Workflow status
  workflowStatus?: "draft" | "review" | "approved" | "published";

  // Version creation timestamp
  versionCreatedAt?: Date;

  // Additional flags
  wasNew?: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Validation and utility methods
  isValidVersionNumber(versionNumber: string): boolean;
  validateUniqueness(): Promise<void>;
  validateVersionData(): string[];
  validateAnalytics(): string[];
  setDefaultValues(): void;

  // Data calculation methods
  calculateDataSize(): number;
  calculateChecksum(): string;
  calculateConversionRate(): number;
  calculateAverageRating(): number;

  // Version management methods
  ensureUniqueActiveVersion(): Promise<void>;
  ensureUniquePublishedVersion(): Promise<void>;
  updateVersionRelationships(): void;
  updateVersionRelationshipsOnDelete(): void;

  // Audit helper methods
  getChangedFields(): any[];
  getChangedFieldsWithValues(modifiedPaths: string[]): any[];
  getVersionDataChanges(oldData: any, newData: any): string[];

  // Parent/child relationship methods
  updateParentVersion(): void;

  // Cache and analytics methods
  clearVersionCache(): void;
  scheduleAnalyticsUpdate(): void;
  updateAnalyticsTimestamps(): void;

  // Version metadata methods
  autoIncrementVersion(): void;
  updateVersionMetadata(): void;
  setVersionDefaults(): void;

  // Version management instance methods
  compareVersion(otherVersionId: Types.ObjectId): Promise<IVersionComparison>;
  calculateChanges(currentData: any, otherData: any): any[];
  getFieldPaths(obj: any, prefix: string): string[];
  getNestedValue(obj: any, path: string): any;
  createDiff(otherVersionId: Types.ObjectId): Promise<string>;
  rollbackToVersion(
    targetVersionId: Types.ObjectId,
    reason?: string,
  ): Promise<IProductVersion>;
  generateRollbackVersionNumber(originalVersion: string): string;
  publishVersion(reason?: string): Promise<IProductVersion>;
  archiveVersion(reason?: string): Promise<IProductVersion>;
  restoreFromArchive(reason?: string): Promise<IProductVersion>;
  duplicateVersion(newVersionNumber?: string): Promise<IProductVersion>;
  generateNextVersionNumber(): string;

  // Analytics methods
  trackView(metadata?: any): Promise<void>;
  trackDownload(format?: string): Promise<void>;
  trackShare(platform?: string): Promise<void>;
  trackConversion(
    event: "impression" | "click" | "purchase",
    value?: number,
  ): Promise<void>;
  addRating(rating: number, review?: string): Promise<void>;
  updatePerformanceMetrics(metrics: any): Promise<void>;
  getAnalyticsSummary(): any;
  getPerformanceTrends(period?: "daily" | "weekly" | "monthly"): Promise<any>;
  resetAnalytics(preserveHistorical?: boolean): Promise<void>;
  exportAnalytics(format?: "json" | "csv"): any;

  // Audit methods
  auditRollback(targetVersion: string, reason?: string): void;
  auditArchive(reason?: string): void;
  auditPublish(reason?: string): void;
  getAuditByAction(action: string): IAuditTrail[];
  getAuditByDateRange(startDate: Date, endDate: Date): IAuditTrail[];
  getAuditByUser(userId: Types.ObjectId): IAuditTrail[];
  cleanOldAuditEntries(keepLast?: number): void;

  // Legacy methods for compatibility
  compare(otherVersion: IProductVersion): Promise<IVersionComparison>;
  getDiff(otherVersion: IProductVersion): Promise<any>;
  rollback(): Promise<IProductVersion>;
  publish(userId: Types.ObjectId): Promise<boolean>;
  archive(userId: Types.ObjectId, reason?: string): Promise<boolean>;
  restore(userId: Types.ObjectId): Promise<boolean>;
  validateVersion(): Promise<{ isValid: boolean; errors: string[] }>;
  updateAnalytics(data: Partial<IVersionAnalytics>): Promise<void>;
  addAuditEntry(
    action: IAuditTrail["action"],
    userId: Types.ObjectId,
    changes?: IAuditTrail["changes"],
    reason?: string,
  ): Promise<void>;
}

// Static methods interface for model
export interface IProductVersionModel {
  getVersionHistory(productId: Types.ObjectId): Promise<IProductVersion[]>;
  getActiveVersion(productId: Types.ObjectId): Promise<IProductVersion | null>;
  getPublishedVersion(
    productId: Types.ObjectId,
  ): Promise<IProductVersion | null>;
  compareVersions(
    version1: string,
    version2: string,
  ): Promise<IVersionComparison>;
  findByVersionNumber(
    productId: Types.ObjectId,
    versionNumber: string,
  ): Promise<IProductVersion | null>;
  createNewVersion(
    productId: Types.ObjectId,
    versionData: IVersionData,
    userId: Types.ObjectId,
  ): Promise<IProductVersion>;
  bulkArchive(
    productIds: Types.ObjectId[],
    userId: Types.ObjectId,
  ): Promise<number>;
  bulkRestore(
    versionIds: Types.ObjectId[],
    userId: Types.ObjectId,
  ): Promise<number>;
  getVersionAnalytics(
    productId: Types.ObjectId,
    dateRange?: { from: Date; to: Date },
  ): Promise<any>;
  cleanupOldVersions(retentionDays: number): Promise<number>;
  exportVersions(productIds: Types.ObjectId[]): Promise<any>;
  importVersions(
    data: any[],
    userId: Types.ObjectId,
  ): Promise<IProductVersion[]>;
}

// Enums for constants
export enum VersionStatus {
  DRAFT = "draft",
  ACTIVE = "active",
  PUBLISHED = "published",
  ARCHIVED = "archived",
  DELETED = "deleted",
}

export enum VersionAction {
  CREATED = "created",
  UPDATED = "updated",
  PUBLISHED = "published",
  ARCHIVED = "archived",
  RESTORED = "restored",
  DELETED = "deleted",
}

export enum ChangeImpact {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

// Search and filter interfaces
export interface IVersionSearchFilters {
  productId?: Types.ObjectId;
  versionNumber?: string;
  status?: VersionStatus;
  createdBy?: Types.ObjectId;
  dateRange?: {
    from: Date;
    to: Date;
  };
  isActive?: boolean;
  isPublished?: boolean;
  tags?: string[];
}

export interface IVersionSearchResult {
  versions: IProductVersion[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
