# Brand Model

This directory contains the comprehensive organization of the Brand model for the e-commerce platform. The Brand model represents manufacturers, companies, and labels associated with products, providing rich brand information, analytics, and business data.

## Structure

```
brand/
├── index.ts                        # Main model assembly and exports
├── schemas/
│   ├── analytics.schema.ts         # Brand performance metrics and analytics
│   ├── businessInfo.schema.ts      # Company information and legal details
│   ├── seo.schema.ts               # SEO metadata and optimization
│   ├── socialMedia.schema.ts       # Social media links (from common)
│   └── index.ts                    # Schema exports
├── methods/
│   ├── analytics.methods.ts        # Analytics tracking and updates
│   ├── instance.methods.ts         # Instance methods for brand operations
│   ├── static.methods.ts           # Static methods for querying
│   └── index.ts                    # Methods exports
├── middleware/
│   ├── preSave.middleware.ts       # Pre-save slug and SEO generation
│   ├── preDelete.middleware.ts     # Pre-delete validation and cleanup
│   └── index.ts                    # Middleware exports
└── README.md                       # This file
```

## Core Features

### 🏢 **Brand Identity**
- **Basic Information**: Name, slug, description, short description
- **Visual Assets**: Logo, banner, multiple brand images
- **Unique Identifiers**: Auto-generated slugs, text search indexing
- **Search Keywords**: Custom searchable terms for better discovery

### 🏛️ **Business Information**
- **Company Details**: Legal name, registration number, tax ID
- **Corporate Structure**: Parent company relationships
- **Geographic Data**: Origin country, headquarters location
- **Historical Information**: Founding year with validation

### 📱 **Social Media & Online Presence**
- **Social Platforms**: Facebook, Twitter/X, Instagram, LinkedIn, YouTube, TikTok
- **Website Links**: Official brand websites and landing pages
- **URL Validation**: Platform-specific validation for social media links
- **Handle Support**: Support for both URLs and social media handles

### 📊 **Analytics & Performance**
- **Product Metrics**: Product count, total sales, average ratings
- **Engagement Analytics**: View count, search count, conversion rate
- **Performance Tracking**: Real-time analytics updates
- **Popularity Indicators**: Auto-calculated popularity flags

### 🔍 **SEO Optimization**
- **Meta Information**: Title, description, keywords
- **Open Graph**: Social media sharing optimization
- **Canonical URLs**: Duplicate content prevention
- **Text Search**: Weighted full-text search capabilities

### 🏷️ **Category Relationships**
- **Multi-Category Support**: 1-20 category associations
- **Category Management**: Add/remove from categories
- **Bidirectional Sync**: Automatic category-brand relationship updates
- **Validation**: Ensure minimum category association

### 🎯 **Brand Status & Features**
- **Status Management**: Active/inactive, verified, deleted states
- **Feature Flags**: Featured, popular, premium brand designations
- **Display Controls**: Homepage visibility, display order
- **Hierarchical Structure**: Parent-child brand relationships

## Schema Definitions

### BrandAnalyticsSchema
```typescript
{
  productCount: Number,          // Number of products under this brand
  totalSales: Number,           // Total sales revenue
  averageRating: Number,        // Average rating across all products (0-5)
  totalRatings: Number,         // Total number of ratings received
  viewCount: Number,            // Brand page views
  searchCount: Number,          // Times brand appeared in search
  conversionRate: Number        // View to purchase conversion (0-100%)
}
```

### BrandBusinessInfoSchema
```typescript
{
  foundingYear: Number,         // Year established (1800-current year)
  originCountry: String,        // Country of origin
  headquarters: String,         // Headquarters location
  parentCompany: String,        // Parent company name
  legalName: String,           // Official legal business name
  registrationNumber: String,   // Business registration number
  taxId: String                // Tax identification number
}
```

### BrandSEOSchema
```typescript
{
  metaTitle: String,           // SEO page title (max 60 chars)
  metaDescription: String,     // SEO description (max 160 chars)
  metaKeywords: [String],      // SEO keywords array
  canonicalUrl: String,        // Canonical URL for SEO
  ogTitle: String,             // Open Graph title
  ogDescription: String,       // Open Graph description
  ogImage: IImage             // Open Graph image
}
```

### BrandSocialMediaSchema
```typescript
{
  website: String,             // Official brand website
  facebook: String,            // Facebook page/URL
  twitter: String,             // Twitter/X handle or URL
  instagram: String,           // Instagram handle or URL
  linkedin: String,            // LinkedIn company page
  youtube: String,             // YouTube channel
  tiktok: String              // TikTok account
}
```

## Usage Examples

### 🆕 **Creating Brands**

```typescript
import Brand from '../brand';

// Create a new brand
const brand = new Brand({
  name: "Apple Inc.",
  description: "American multinational technology company specializing in consumer electronics",
  shortDescription: "Technology company known for iPhone, iPad, and Mac",
  categories: [electronicsId, smartphonesId, computersId],
  businessInfo: {
    foundingYear: 1976,
    originCountry: "United States",
    headquarters: "Cupertino, California",
    legalName: "Apple Inc.",
    registrationNumber: "C0806592"
  },
  socialMedia: {
    website: "https://www.apple.com",
    twitter: "https://twitter.com/Apple",
    instagram: "https://instagram.com/apple",
    youtube: "https://youtube.com/user/Apple"
  },
  seo: {
    metaTitle: "Apple - Technology Products & Innovation",
    metaDescription: "Discover Apple's innovative technology products including iPhone, iPad, Mac, and more",
    metaKeywords: ["Apple", "iPhone", "iPad", "Mac", "technology"]
  },
  searchKeywords: ["Apple", "iPhone", "iPad", "Mac", "technology", "innovation"],
  isActive: true,
  isVerified: true,
  isFeatured: true,
  showInHomepage: true,
  createdBy: userId,
  updatedBy: userId
});

await brand.save();

// Create brand with parent relationship
const subBrand = new Brand({
  name: "Beats by Dre",
  description: "Premium audio brand owned by Apple",
  parent: appleId, // Parent brand reference
  categories: [audioId, headphonesId],
  businessInfo: {
    foundingYear: 2006,
    originCountry: "United States",
    parentCompany: "Apple Inc."
  },
  createdBy: userId,
  updatedBy: userId
});

await subBrand.save();
```

### 🔍 **Querying Brands**

```typescript
// Find active brands
const activeBrands = await Brand.findActiveBrands();

// Find brands by category
const electronicsBrands = await Brand.findByCategory(electronicsId);

// Find featured brands
const featuredBrands = await Brand.findFeaturedBrands();

// Find popular brands
const popularBrands = await Brand.findPopularBrands(10);

// Find specific brand
const brand = await Brand.findActiveOne({ slug: "apple-inc" });

// Find verified brands
const verifiedBrands = await Brand.findActiveBrands({ isVerified: true });

// Find premium brands
const premiumBrands = await Brand.findActiveBrands({ isPremium: true });

// Find brands with business info
const brandsWithInfo = await Brand.findActiveBrands({
  'businessInfo.originCountry': "United States"
});

// Search brands by text
const searchResults = await Brand.find({
  $text: { $search: "technology innovation" }
}, {
  score: { $meta: "textScore" }
}).sort({ score: { $meta: "textScore" } });
```

### 📊 **Brand Management Operations**

```typescript
// Update brand analytics
await brand.updateAnalytics();

// Add brand to category
await brand.addToCategory(newCategoryId);

// Remove brand from category
await brand.removeFromCategory(categoryId);

// Soft delete brand (checks for products)
await brand.softDelete();

// Restore deleted brand
await brand.restore();

// Update brand status
brand.isVerified = true;
brand.isFeatured = true;
brand.showInHomepage = true;
await brand.save();
```

### 📈 **Analytics & Performance**

```typescript
// Get brand performance metrics
const brandMetrics = await Brand.aggregate([
  { $match: { isActive: true, isDeleted: false } },
  {
    $project: {
      name: 1,
      productCount: "$analytics.productCount",
      averageRating: "$analytics.averageRating",
      totalSales: "$analytics.totalSales",
      conversionRate: "$analytics.conversionRate",
      viewCount: "$analytics.viewCount"
    }
  },
  { $sort: { "analytics.totalSales": -1 } }
]);

// Find top performing brands
const topBrands = await Brand.find({
  isActive: true,
  isDeleted: false,
  "analytics.averageRating": { $gte: 4.0 },
  "analytics.productCount": { $gte: 5 }
}).sort({ "analytics.totalSales": -1 }).limit(10);

// Brand conversion analysis
const conversionAnalysis = await Brand.aggregate([
  { $match: { isActive: true, "analytics.viewCount": { $gt: 0 } } },
  {
    $project: {
      name: 1,
      conversionRate: "$analytics.conversionRate",
      viewCount: "$analytics.viewCount",
      productCount: "$analytics.productCount"
    }
  },
  { $sort: { conversionRate: -1 } }
]);
```

## Advanced Features

### 🔍 **Advanced Search & Filtering**

```typescript
// Complex brand search with multiple criteria
const complexSearch = await Brand.find({
  $and: [
    { isActive: true, isDeleted: false },
    { "analytics.productCount": { $gte: 10 } },
    { "analytics.averageRating": { $gte: 4.0 } },
    { "businessInfo.originCountry": { $in: ["United States", "Germany", "Japan"] } },
    {
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { searchKeywords: { $in: [searchTerm] } }
      ]
    }
  ]
}).populate('categories', 'name slug');

// Geo-based brand filtering
const brandsByCountry = await Brand.aggregate([
  { $match: { isActive: true, isDeleted: false } },
  {
    $group: {
      _id: "$businessInfo.originCountry",
      brands: { $push: { name: "$name", slug: "$slug" } },
      count: { $sum: 1 },
      avgRating: { $avg: "$analytics.averageRating" }
    }
  },
  { $sort: { count: -1 } }
]);

// Brand hierarchy analysis
const brandHierarchy = await Brand.find({
  parent: { $exists: true, $ne: null },
  isActive: true
}).populate('parent', 'name slug businessInfo.legalName');
```

### 📊 **Brand Analytics & Reporting**

```typescript
// Brand performance dashboard
const brandDashboard = await Brand.aggregate([
  { $match: { isActive: true, isDeleted: false } },
  {
    $facet: {
      overview: [
        {
          $group: {
            _id: null,
            totalBrands: { $sum: 1 },
            verifiedBrands: { $sum: { $cond: ["$isVerified", 1, 0] } },
            featuredBrands: { $sum: { $cond: ["$isFeatured", 1, 0] } },
            averageProducts: { $avg: "$analytics.productCount" },
            totalProducts: { $sum: "$analytics.productCount" }
          }
        }
      ],
      topPerformers: [
        { $sort: { "analytics.totalSales": -1 } },
        { $limit: 10 },
        {
          $project: {
            name: 1,
            totalSales: "$analytics.totalSales",
            productCount: "$analytics.productCount",
            averageRating: "$analytics.averageRating"
          }
        }
      ],
      byCategory: [
        { $unwind: "$categories" },
        {
          $group: {
            _id: "$categories",
            brandCount: { $sum: 1 },
            avgRating: { $avg: "$analytics.averageRating" }
          }
        },
        { $sort: { brandCount: -1 } }
      ]
    }
  }
]);

// Brand growth tracking
const brandGrowth = await Brand.aggregate([
  { $match: { isDeleted: false } },
  {
    $group: {
      _id: {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" }
      },
      newBrands: { $sum: 1 },
      verifiedBrands: { $sum: { $cond: ["$isVerified", 1, 0] } }
    }
  },
  { $sort: { "_id.year": 1, "_id.month": 1 } }
]);
```

### 🏷️ **Category Management**

```typescript
// Sync brand-category relationships
const syncBrandCategories = async (brandId: string, categoryIds: string[]) => {
  const brand = await Brand.findById(brandId);
  if (!brand) throw new Error("Brand not found");

  // Remove from old categories
  const oldCategories = brand.categories.map(id => id.toString());
  const toRemove = oldCategories.filter(id => !categoryIds.includes(id));
  
  for (const categoryId of toRemove) {
    await brand.removeFromCategory(categoryId);
  }

  // Add to new categories
  const toAdd = categoryIds.filter(id => !oldCategories.includes(id));
  
  for (const categoryId of toAdd) {
    await brand.addToCategory(categoryId);
  }
};

// Find brands without categories (validation check)
const orphanBrands = await Brand.find({
  isActive: true,
  $or: [
    { categories: { $size: 0 } },
    { categories: { $exists: false } }
  ]
});
```

## Model Relationships

### 📋 **Related Entities**
- **Products**: Brands have multiple products
- **Categories**: Many-to-many relationship with categories
- **Parent Brands**: Hierarchical brand relationships
- **Users**: Track who created/updated brands

### 🔗 **Population Examples**

```typescript
// Populate with related data
const brandWithDetails = await Brand.findById(brandId)
  .populate('categories', 'name slug path')
  .populate('parent', 'name slug businessInfo.legalName')
  .populate('createdBy', 'name email')
  .populate('updatedBy', 'name email');

// Populate with products
const brandWithProducts = await Brand.findById(brandId)
  .populate({
    path: 'products',
    match: { isActive: true, isDeleted: false },
    select: 'name pricing images reviews',
    options: { sort: { createdAt: -1 }, limit: 10 }
  });

// Populate category hierarchy
const brandWithHierarchy = await Brand.findById(brandId)
  .populate({
    path: 'categories',
    populate: {
      path: 'parent',
      select: 'name slug'
    }
  });
```

## Performance Optimizations

### 📊 **Indexing Strategy**

```typescript
// Core indexes
{ name: 1 }                                    // Brand name queries
{ slug: 1 }                                    // Unique constraint
{ isDeleted: 1, isActive: 1 }                 // Active brands filter
{ categories: 1 }                              // Category queries

// Feature indexes
{ isFeatured: 1, isActive: 1 }                // Featured brands
{ isPopular: 1, isActive: 1 }                 // Popular brands
{ isPremium: 1, isActive: 1 }                 // Premium brands
{ isVerified: 1, isActive: 1 }                // Verified brands
{ showInHomepage: 1, isActive: 1 }            // Homepage brands

// Analytics indexes
{ "analytics.productCount": -1 }               // Product count sorting
{ "analytics.totalSales": -1 }                // Sales sorting
{ "analytics.averageRating": -1 }             // Rating sorting
{ "analytics.viewCount": -1 }                 // Popularity sorting

// Business indexes
{ "businessInfo.originCountry": 1 }           // Country filtering
{ displayOrder: 1, name: 1 }                 // Display order

// Text search index with weights
{
  name: "text",
  description: "text", 
  searchKeywords: "text",
  "seo.metaTitle": "text",
  "seo.metaDescription": "text",
  "businessInfo.legalName": "text"
}
```

### ⚡ **Query Optimization**

```typescript
// Efficient brand queries
const brands = await Brand.find({ isActive: true, isDeleted: false })
  .select('name slug logo analytics.productCount analytics.averageRating')
  .sort({ displayOrder: 1, name: 1 })
  .limit(20)
  .lean(); // Use lean() for read-only operations

// Optimized aggregation for analytics
const brandAnalytics = await Brand.aggregate([
  { $match: { isActive: true, isDeleted: false } },
  {
    $group: {
      _id: null,
      totalBrands: { $sum: 1 },
      totalProducts: { $sum: "$analytics.productCount" },
      averageRating: { $avg: "$analytics.averageRating" },
      topBrands: { 
        $push: {
          $cond: [
            { $gte: ["$analytics.productCount", 10] },
            { name: "$name", products: "$analytics.productCount" },
            "$$REMOVE"
          ]
        }
      }
    }
  }
]);

// Cached popular brands query
const popularBrands = await Brand.find({
  isPopular: true,
  isActive: true,
  isDeleted: false
}).select('name slug logo analytics').sort({ "analytics.totalSales": -1 });
```

## Business Rules & Validation

### ✅ **Validation Rules**
- **Name**: 2-100 characters, required, unique
- **Categories**: 1-20 category associations required
- **Founding Year**: 1800 to current year
- **Search Keywords**: Maximum 50 keywords
- **Parent Brand**: Cannot be self-referencing, must be active
- **Slug**: Auto-generated, unique, URL-friendly

### 🔒 **Business Logic**
- Brands cannot be deleted if they have active products
- Adding/removing categories updates both brand and category
- Analytics are auto-updated based on product performance
- Popular status auto-calculated based on product count (≥10)
- SEO fields auto-generated if not provided
- Parent brand validation prevents circular references

### 🛡️ **Security Features**
- Soft delete preserves brand data and relationships
- User tracking for audit trails
- Input sanitization for all text fields
- URL validation for social media links
- Business information validation
- Category relationship integrity checks

## Middleware Functionality

### 📝 **Pre-Save Middleware**
- Automatic slug generation from brand name
- SEO meta fields auto-generation
- Business rule validation
- Parent brand validation

### 🗑️ **Pre-Delete Middleware**
- Check for associated active products
- Remove brand from all categories
- Validate deletion eligibility
- Cleanup relationships

## Integration Points

### 🛒 **E-commerce Integration**
- **Product Catalog**: Organize products by brand
- **Brand Pages**: Dedicated brand showcase pages
- **Search & Filtering**: Brand-based product filtering
- **Analytics**: Brand performance tracking

### 📊 **Analytics Integration**
- **Google Analytics**: Brand page tracking
- **Business Intelligence**: Brand performance reports
- **A/B Testing**: Test brand positioning and presentation
- **User Behavior**: Track brand preference patterns

### 🔍 **Search Integration**
- **Elasticsearch**: Enhanced brand search capabilities
- **Autocomplete**: Brand name suggestions
- **Faceted Search**: Use brands as search filters
- **Related Brands**: Cross-brand recommendations

### 📱 **Social Media Integration**
- **Social Login**: Link with brand social accounts
- **Content Sharing**: Share brand and product content
- **Social Proof**: Display social media presence
- **Brand Verification**: Verify official brand accounts

This Brand model provides a comprehensive foundation for brand management in e-commerce platforms with enterprise-grade features for analytics, SEO, social media integration, and business intelligence.