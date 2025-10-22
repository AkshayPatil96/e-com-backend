# Product Model

This directory contains the comprehensive organization of the Product model for the e-commerce platform. The Product model is the core entity that represents all sellable items in the system.

## Structure

```
product/
├── index.ts                    # Main model assembly and exports
├── schemas/
│   ├── analytics.schema.ts     # Product analytics and metrics
│   ├── inventory.schema.ts     # Stock management and inventory
│   ├── pricing.schema.ts       # Pricing, currency, and tax information
│   ├── relations.schema.ts     # Related products and cross-selling
│   ├── reviews.schema.ts       # Review summary and ratings
│   ├── seo.schema.ts          # SEO metadata and optimization
│   ├── shipping.schema.ts     # Shipping dimensions and logistics
│   └── index.ts               # Schema exports
├── methods/
│   ├── analytics.methods.ts    # Analytics tracking instance methods
│   ├── basic.statics.ts       # Basic query static methods
│   ├── business.methods.ts    # Business logic instance methods
│   ├── featured.statics.ts    # Featured products static methods
│   ├── operational.statics.ts # Inventory operations static methods
│   ├── product.methods.ts     # Core product instance methods
│   ├── search.statics.ts      # Search and filtering static methods
│   └── index.ts               # Methods exports
├── middleware/
│   ├── preSave.middleware.ts   # Pre-save validation and processing
│   ├── preUpdate.middleware.ts # Pre-update validation and processing
│   ├── versioning.middleware.ts # Product versioning and history
│   └── index.ts               # Middleware exports
├── validation.ts              # Product validation utilities
└── README.md                  # This file
```

## Core Features

### 📦 **Product Information**
- **Basic Details**: Name, description, short description, SKU
- **Brand & Category**: Multi-category support with primary category
- **Images**: Multiple product images with optimization
- **Attributes**: Flexible key-value attribute system
- **Tags**: Searchable tags for categorization
- **Conditions**: New, Used, Refurbished, etc.

### 💰 **Pricing System**
- **Multi-Currency Support**: USD, EUR, GBP, JPY, CAD, AUD, INR
- **Flexible Pricing**: Base price, compare price, cost price
- **Tax Management**: Tax-inclusive/exclusive pricing with rates
- **Discounts**: Percentage-based discount system
- **Sale Pricing**: Automatic sale price calculations

### 📊 **Inventory Management**
- **Stock Tracking**: Real-time inventory management
- **Reserved Stock**: Hold inventory for pending orders
- **Reorder Levels**: Automatic low-stock alerts
- **Backorder Support**: Allow orders when out of stock
- **Quantity Limits**: Maximum order quantity controls

### 🚚 **Shipping Integration**
- **Physical Properties**: Weight, dimensions for shipping
- **Shipping Classes**: Categorize products for shipping rules
- **Logistics Support**: Integration-ready for shipping providers

### ⭐ **Reviews & Ratings**
- **Review Summary**: Average ratings and review counts
- **Rating Distribution**: 1-5 star breakdown
- **Verified Reviews**: Track verified purchase reviews
- **Review Analytics**: Trend analysis and insights

### 🔍 **SEO Optimization**
- **Meta Information**: Title, description, keywords
- **URL Optimization**: SEO-friendly slugs
- **Focus Keywords**: Primary SEO targeting
- **Canonical URLs**: Duplicate content prevention

### 📈 **Analytics & Tracking**
- **View Tracking**: Product page views and interactions
- **Sales Analytics**: Purchase tracking and trends
- **Engagement Metrics**: Cart additions, wishlist saves
- **Performance Insights**: Conversion and popularity metrics

### 🔗 **Product Relations**
- **Related Products**: Similar and recommended items
- **Cross-Selling**: Frequently bought together
- **Up-Selling**: Premium alternatives
- **Product Variants**: Size, color, and other variations

## Schema Definitions

### ProductPricingSchema
```typescript
{
  basePrice: Number,        // Main selling price
  comparePrice: Number,     // Original/MSRP price for discounts
  costPrice: Number,        // Cost for profit calculations
  currency: String,         // Multi-currency support
  taxIncluded: Boolean,     // Tax calculation method
  taxRate: Number          // Tax percentage
}
```

### ProductInventorySchema
```typescript
{
  stockQuantity: Number,    // Available inventory
  soldQuantity: Number,     // Total sold count
  reservedQuantity: Number, // Held for pending orders
  reorderLevel: Number,     // Low stock threshold
  maxOrderQuantity: Number, // Order quantity limit
  trackQuantity: Boolean,   // Enable/disable tracking
  allowBackorder: Boolean   // Allow out-of-stock orders
}
```

### ProductAnalyticsSchema
```typescript
{
  viewCount: Number,        // Product page views
  cartAddCount: Number,     // Times added to cart
  wishlistCount: Number,    // Wishlist additions
  shareCount: Number,       // Social shares
  searchCount: Number,      // Search result appearances
  conversionRate: Number    // View-to-purchase rate
}
```

## Usage Examples

### 🆕 **Creating Products**

```typescript
import Product from '../product';

// Create a new product
const product = new Product({
  name: "Premium Wireless Headphones",
  description: "High-quality wireless headphones with noise cancellation",
  shortDescription: "Premium noise-cancelling wireless headphones",
  brand: brandId,
  category: categoryId,
  seller: sellerId,
  sku: "PWH-001",
  pricing: {
    basePrice: 299.99,
    comparePrice: 399.99,
    currency: "USD",
    taxIncluded: false,
    taxRate: 8.25
  },
  inventory: {
    stockQuantity: 100,
    reorderLevel: 10,
    trackQuantity: true,
    allowBackorder: false
  },
  shipping: {
    weight: 0.5,
    dimensions: { length: 20, width: 15, height: 8 },
    shippingClass: "standard"
  },
  status: "published",
  createdBy: userId,
  updatedBy: userId
});

await product.save();
```

### 🔍 **Querying Products**

```typescript
// Find active products
const activeProducts = await Product.findActiveProducts();

// Find by category
const categoryProducts = await Product.findByCategory(categoryId);

// Find featured products
const featuredProducts = await Product.findFeatured(10);

// Search products
const searchResults = await Product.searchProducts("wireless headphones", {
  "pricing.basePrice": { $lte: 500 },
  brand: brandId
});

// Find products on sale
const saleProducts = await Product.findOnSale(20);

// Find trending products
const trendingProducts = await Product.findTrending(15, 30); // 15 products, 30 days

// Find by price range
const priceFilteredProducts = await Product.findByPriceRange(100, 500);
```

### 📊 **Business Operations**

```typescript
// Check product availability
const isAvailable = product.isAvailable();

// Get available stock
const availableStock = product.getAvailableStock();

// Check if stock is low
const isLowStock = product.isStockLow();

// Update stock
await product.updateStock(50);

// Reserve stock for order
await product.reserveStock(5);

// Release reserved stock
await product.releaseReservedStock(2);

// Get discounted price
const discountedPrice = product.getDiscountPrice();

// Check if product is on sale
const onSale = product.isOnSaleCheck();
```

### 📈 **Analytics Tracking**

```typescript
// Track product view
await product.incrementView();

// Track cart addition
await product.incrementCartAdd();

// Track wishlist addition
await product.incrementWishlist();

// Record purchase
await product.recordPurchase(quantity, revenue);

// Update review summary
await product.updateReviewSummary();
```

### 🗑️ **Product Management**

```typescript
// Soft delete product
await product.softDelete(userId);

// Restore deleted product
await product.restore(userId);

// Find deleted products
const deletedProducts = await Product.find({ isDeleted: true });
```

## Advanced Features

### 🎯 **Featured Product Management**

```typescript
// Get best selling products
const bestSellers = await Product.findBestSelling(10, 30);

// Get recently added products
const newProducts = await Product.findRecentlyAdded(20);

// Get high-rated products
const topRated = await Product.findHighRated(4.5, 15);
```

### 📦 **Inventory Operations**

```typescript
// Find low stock products
const lowStockProducts = await Product.findLowStock();

// Find products needing reorder
const reorderProducts = await Product.findNeedingReorder();

// Bulk stock update
const products = await Product.find({ seller: sellerId });
for (const product of products) {
  if (product.isStockLow()) {
    // Trigger reorder notification
    console.log(`Low stock alert: ${product.name}`);
  }
}
```

### 🔍 **Advanced Search**

```typescript
// Complex search with multiple filters
const searchResults = await Product.searchProducts("bluetooth speaker", {
  category: { $in: [categoryId1, categoryId2] },
  "pricing.basePrice": { $gte: 50, $lte: 200 },
  "reviews.averageRating": { $gte: 4.0 },
  "inventory.stockQuantity": { $gt: 0 },
  isFeatured: true
});

// Text search with scoring
const textSearchResults = await Product.find(
  { $text: { $search: "wireless premium quality" } },
  { score: { $meta: "textScore" } }
).sort({ score: { $meta: "textScore" } });
```

## Model Relationships

### 📋 **Related Entities**
- **Brand**: Product belongs to a brand
- **Category**: Product belongs to primary + multiple categories  
- **Seller**: Product is sold by a seller
- **Variations**: Product can have multiple variations (size, color, etc.)
- **Reviews**: Product has associated reviews and ratings
- **Orders**: Product appears in order line items

### 🔗 **Population Examples**

```typescript
// Populate related data
const productWithDetails = await Product.findById(productId)
  .populate('brand', 'name logo')
  .populate('category', 'name slug')
  .populate('seller', 'storeName rating')
  .populate('variations', 'name price stock');

// Populate reviews summary
const productWithReviews = await Product.findById(productId)
  .populate({
    path: 'reviews',
    populate: {
      path: 'recentReviews',
      model: 'Review',
      select: 'rating comment user createdAt',
      limit: 5
    }
  });
```

## Performance Optimizations

### 📊 **Indexing Strategy**

```typescript
// Core indexes
{ isDeleted: 1, status: 1 }                    // Active products filter
{ category: 1, status: 1, isDeleted: 1 }       // Category queries
{ brand: 1, status: 1, isDeleted: 1 }          // Brand queries
{ seller: 1, status: 1, isDeleted: 1 }         // Seller queries
{ sku: 1 }                                     // Unique constraint
{ slug: 1 }                                    // Unique constraint

// Performance indexes
{ "pricing.basePrice": 1 }                     // Price sorting
{ "inventory.stockQuantity": 1 }               // Stock queries
{ "reviews.averageRating": 1 }                 // Rating sorting
{ "analytics.viewCount": -1 }                  // Popularity sorting
{ createdAt: -1 }                             // Newest first

// Compound indexes
{ category: 1, "pricing.basePrice": 1, status: 1, isDeleted: 1 }
{ brand: 1, "reviews.averageRating": -1, status: 1, isDeleted: 1 }

// Text search index
{ name: "text", description: "text", shortDescription: "text", tags: "text" }
```

### ⚡ **Query Optimization**

```typescript
// Efficient pagination
const products = await Product.find(query)
  .select('name pricing inventory images reviews')  // Select only needed fields
  .limit(20)
  .skip(page * 20)
  .sort({ createdAt: -1 });

// Aggregation for analytics
const analyticsData = await Product.aggregate([
  { $match: { seller: sellerId, isDeleted: false } },
  { $group: {
    _id: null,
    totalProducts: { $sum: 1 },
    totalViews: { $sum: "$analytics.viewCount" },
    averagePrice: { $avg: "$pricing.basePrice" },
    totalStock: { $sum: "$inventory.stockQuantity" }
  }}
]);
```

## Business Rules & Validation

### ✅ **Validation Rules**
- **Name**: 1-200 characters, required
- **Description**: 1-2000 characters, required  
- **SKU**: Required, unique, uppercase
- **Price**: Must be positive, required
- **Stock**: Non-negative numbers only
- **Status**: Must be valid enum value
- **Slug**: Auto-generated, unique, SEO-friendly

### 🔒 **Business Logic**
- Products cannot be deleted if they have pending orders
- Stock reservations prevent overselling
- Price changes trigger version history
- Status changes affect product visibility
- Analytics are updated in real-time

### 🛡️ **Security Features**
- Soft delete prevents data loss
- User tracking for audit trails  
- Input sanitization for all text fields
- Role-based access control ready
- Sensitive price data protection

## Middleware Functionality

### 📝 **Pre-Save Middleware**
- Slug generation from product name
- SKU validation and formatting
- Price calculation and validation
- Stock level validation
- SEO metadata auto-generation

### 🔄 **Pre-Update Middleware**  
- Version history creation
- Change tracking and logging
- Business rule validation
- Cache invalidation triggers

### 📦 **Post-Save Middleware**
- Search index updates
- Cache warming
- Related entity updates
- Analytics event tracking

## Integration Points

### 🛒 **E-commerce Integration**
- **Cart Systems**: Stock validation and pricing
- **Order Processing**: Inventory reservation and management
- **Payment Systems**: Price and tax calculations
- **Shipping**: Weight and dimension integration

### 📊 **Analytics Integration**
- **Google Analytics**: Event tracking integration
- **Business Intelligence**: Data export capabilities
- **Reporting**: Sales and inventory reports
- **Dashboards**: Real-time metrics and KPIs

### 🔍 **Search Integration**
- **Elasticsearch**: Full-text search capabilities
- **Filters**: Advanced filtering and faceting
- **Autocomplete**: Product suggestion features
- **Recommendations**: Related product suggestions

This Product model provides a robust foundation for any e-commerce platform with enterprise-grade features for inventory management, pricing, analytics, and business operations.