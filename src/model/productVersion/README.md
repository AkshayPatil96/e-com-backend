# ProductVersion Module

A comprehensive, enterprise-ready version control system for product data management with advanced audit trails, analytics tracking, and business logic automation.

## 🚀 Features

### **Core Version Control**
- ✅ **Semantic Versioning Support** - Full support for semantic versioning (1.0.0) and simple versioning (v1, v2)
- ✅ **Version Relationships** - Parent-child version tracking and branching
- ✅ **Status Management** - Draft, Active, Published, and Archived states
- ✅ **Rollback Capabilities** - Complete rollback to any previous version
- ✅ **Publishing Workflow** - Controlled publishing with approval process

### **Comprehensive Audit System**
- ✅ **Complete Change Tracking** - Every modification is logged with timestamps
- ✅ **User Action Logging** - Track who made what changes and when
- ✅ **Change Reasons** - Optional reason documentation for all changes
- ✅ **IP and User Agent Tracking** - Security and compliance features
- ✅ **Audit Trail Query** - Advanced filtering by action, date, and user

### **Advanced Analytics**
- ✅ **Usage Metrics** - Views, downloads, shares tracking
- ✅ **Conversion Tracking** - Impressions, clicks, purchases, revenue
- ✅ **Performance Monitoring** - Load times, SEO scores, accessibility scores
- ✅ **User Feedback** - Ratings, reviews, sentiment analysis
- ✅ **Historical Data** - Preserve analytics snapshots over time

### **Business Logic Automation**
- ✅ **Automated Validation** - Comprehensive data integrity checks
- ✅ **Unique Constraints** - Ensure only one active/published version per product
- ✅ **Data Integrity** - Checksum validation and size tracking
- ✅ **Cache Management** - Automatic cache invalidation
- ✅ **Workflow Management** - Status transitions and approval workflows

## 📁 Project Structure

```
src/model/productVersion/
├── README.md                           # This file
├── index.ts                           # Main module exports
├── productVersion.ts                  # Enhanced model definition
├── schemas/                           # Data schemas
│   ├── index.ts                      # Schema exports
│   ├── auditTrail.schema.ts          # Audit logging schema
│   ├── versionAnalytics.schema.ts    # Analytics tracking schema
│   ├── versionComparison.schema.ts   # Version diff schema
│   ├── versionData.schema.ts         # Product data schema
│   └── versionMetadata.schema.ts     # Version metadata schema
├── middleware/                        # Business logic automation
│   ├── index.ts                      # Middleware exports
│   ├── audit.middleware.ts           # Audit trail automation
│   ├── validation.middleware.ts      # Data validation
│   └── versioning.middleware.ts      # Version management logic
├── methods/                          # Instance and static methods
│   ├── index.ts                      # Method exports
│   ├── analytics.methods.ts          # Analytics tracking methods
│   ├── static.methods.ts            # Class-level operations
│   └── versionManagement.methods.ts  # Version control methods
└── utils/                            # Helper utilities
    ├── index.ts                      # Utility exports
    ├── dataTransformation.utils.ts   # Data transformation helpers
    └── versionComparison.utils.ts    # Comparison and diff utilities
```

## 🛠 Installation & Setup

### 1. Import the Module

```typescript
import { ProductVersion } from './model/productVersion';
// Or import everything
import * as ProductVersionModule from './model/productVersion';
```

### 2. Basic Usage

```typescript
// Create a new version
const newVersion = new ProductVersion({
  productId: productObjectId,
  versionNumber: '1.0.0',
  versionData: {
    title: 'Product Title',
    description: 'Product Description',
    price: { basePrice: 99.99, currency: 'USD' },
    category: categoryObjectId,
    brand: brandObjectId,
    inventory: { sku: 'PROD-001', stock: 100 }
  },
  createdBy: userObjectId,
  updatedBy: userObjectId
});

await newVersion.save();
```

## 📚 API Reference

### **Instance Methods**

#### Version Management
```typescript
// Compare with another version
const comparison = await version.compareVersion(otherVersionId);

// Create detailed diff
const diff = await version.createDiff(otherVersionId);

// Rollback to previous version
const rolledBack = await version.rollbackToVersion(targetVersionId, 'Reverting due to bug');

// Publish version
await version.publishVersion('Ready for production');

// Archive version
await version.archiveVersion('Replaced by newer version');

// Duplicate version
const duplicate = await version.duplicateVersion('1.1.0');
```

#### Analytics Tracking
```typescript
// Track user interactions
await version.trackView({ source: 'search', referrer: 'google.com' });
await version.trackDownload('pdf');
await version.trackShare('twitter');
await version.trackConversion('purchase', 99.99);

// Add user rating
await version.addRating(5, 'Excellent product!');

// Update performance metrics
await version.updatePerformanceMetrics({
  loadTime: 1200,
  seoScore: 95,
  accessibilityScore: 88
});

// Get analytics summary
const summary = version.getAnalyticsSummary();

// Export analytics data
const csvData = version.exportAnalytics('csv');
```

### **Static Methods**

#### Version History
```typescript
// Get version history for a product
const history = await ProductVersion.getVersionHistory(productId, {
  limit: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc'
});

// Get active version
const active = await ProductVersion.getActiveVersion(productId);

// Get published version
const published = await ProductVersion.getPublishedVersion(productId);
```

#### Batch Operations
```typescript
// Batch archive versions
await ProductVersion.batchArchiveVersions(
  [versionId1, versionId2], 
  userId, 
  'Cleanup old versions'
);

// Get analytics summary across products
const analytics = await ProductVersion.getAnalyticsSummary([productId1, productId2]);

// Export version data
const exportData = await ProductVersion.exportVersionData(
  { productId: { $in: productIds } },
  'csv'
);
```

## 🔧 Configuration

### Validation Settings
```typescript
// Configure validation rules in validation.middleware.ts
const validationConfig = {
  requireTitle: true,
  requireDescription: true,
  minTitleLength: 3,
  maxTitleLength: 200,
  allowNegativeStock: false
};
```

### Analytics Configuration
```typescript
// Configure analytics tracking
const analyticsConfig = {
  trackViews: true,
  trackDownloads: true,
  enablePerformanceMonitoring: true,
  retentionDays: 365
};
```

## 📊 Data Models

### Core Version Data
```typescript
interface IVersionData {
  title: string;
  description: string;
  price: {
    basePrice: number;
    salePrice?: number;
    currency: string;
  };
  category: ObjectId;
  brand: ObjectId;
  inventory: {
    sku: string;
    stock: number;
    lowStockThreshold: number;
    trackInventory: boolean;
  };
  media: {
    images: IProductImage[];
    videos: IProductVideo[];
    documents: IProductDocument[];
  };
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    keywords: string[];
    slug: string;
  };
  // ... more fields
}
```

### Analytics Data
```typescript
interface IVersionAnalytics {
  usage: {
    views: number;
    downloads: number;
    shares: number;
    // ... more metrics
  };
  conversion: {
    impressions: number;
    clicks: number;
    purchases: number;
    conversionRate: number;
    // ... more metrics
  };
  performance: {
    loadTime?: number;
    seoScore?: number;
    accessibilityScore?: number;
    // ... more metrics
  };
  feedback: {
    ratings: number[];
    averageRating: number;
    reviewCount: number;
    // ... more metrics
  };
}
```

## 🔍 Query Examples

### Find Versions
```typescript
// Find all published versions
const published = await ProductVersion.find({ isPublished: true });

// Find versions by date range
const recent = await ProductVersion.find({
  createdAt: { $gte: new Date('2024-01-01') }
});

// Find top performing versions
const topVersions = await ProductVersion.getTopPerformingVersions('views', 10);
```

### Analytics Queries
```typescript
// Get version statistics
const stats = await ProductVersion.getVersionStatistics('product');

// Get performance trends
const trends = await version.getPerformanceTrends('weekly');

// Get audit trail
const auditByUser = version.getAuditByUser(userId);
const auditByDate = version.getAuditByDateRange(startDate, endDate);
```

## 🚨 Error Handling

### Common Validation Errors
```typescript
try {
  await version.save();
} catch (error) {
  if (error.name === 'ValidationError') {
    console.log('Validation errors:', error.errors);
  }
}
```

### Version Conflicts
```typescript
try {
  await version.publishVersion();
} catch (error) {
  if (error.message.includes('already published')) {
    // Handle conflict
  }
}
```

## 🔧 Maintenance & Cleanup

### Cleanup Old Versions
```typescript
// Auto-cleanup old versions
await ProductVersion.cleanupOldVersions({
  olderThanDays: 90,
  keepMinimum: 5,
  excludePublished: true,
  excludeActive: true
});
```

### Archive Management
```typescript
// Archive old versions
await ProductVersion.batchArchiveVersions(oldVersionIds, userId);

// Clean audit trails
version.cleanOldAuditEntries(100); // Keep last 100 entries
```

## 📈 Performance Optimization

### Indexing Strategy
The module includes optimized indexes for:
- Product-version relationships
- Status-based queries
- Date-based filtering
- User-based audit trails
- Analytics performance

### Caching Integration
```typescript
// Cache management hooks are built-in
version.clearVersionCache(); // Called automatically on updates
```

## 🔒 Security & Compliance

### Audit Trail Security
- All changes are immutably logged
- IP address and user agent tracking
- Comprehensive change reason documentation
- User-based access control integration

### Data Integrity
- Checksum validation for version data
- Automatic data size tracking
- Validation middleware for all operations

## 📝 Migration Guide

### From Basic Version to Enhanced
```typescript
// Old basic version
const oldVersion = {
  productId: id,
  versionNumber: 1,
  versionData: data,
  updatedBy: userId
};

// New enhanced version
const newVersion = new ProductVersion({
  productId: id,
  versionNumber: '1.0.0', // String-based semantic versioning
  versionData: transformedData, // Enhanced data structure
  createdBy: userId,
  updatedBy: userId,
  isDraft: true, // Explicit status management
  metadata: { source: 'migration' }, // Enhanced metadata
  analytics: { /* initialized automatically */ }
});
```

## 🤝 Contributing

1. Follow the modular architecture pattern
2. Add comprehensive tests for new features
3. Update type definitions for new properties
4. Document all public methods and interfaces
5. Ensure backward compatibility

## 📄 License

This module is part of the e-commerce backend system.

---

**Version**: 2.0.0  
**Last Updated**: September 2025  
**Maintainer**: Development Team