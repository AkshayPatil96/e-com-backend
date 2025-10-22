# Seller Model

This directory contains the comprehensive organization of the Seller model for the e-commerce platform. The Seller model represents merchants, vendors, and businesses that sell products through the platform, providing complete store management, verification, and analytics capabilities.

## Structure

```
seller/
├── index.ts                        # Main model assembly and exports
├── schemas/
│   ├── address.schema.ts           # Business address schema (from common)
│   ├── verification.schema.ts      # Business verification documents
│   ├── policies.schema.ts          # Store policies and terms
│   ├── ratings.schema.ts           # Seller ratings and reviews
│   └── index.ts                    # Schema exports
├── methods/
│   ├── analytics.methods.ts        # Rating and analytics methods
│   ├── instance.methods.ts         # Instance methods for seller operations
│   ├── static.methods.ts           # Static methods for querying
│   └── index.ts                    # Methods exports
├── middleware/
│   ├── preSave.middleware.ts       # Pre-save slug and validation
│   ├── preDelete.middleware.ts     # Pre-delete validation and cleanup
│   ├── storeNameValidation.middleware.ts # Store name validation
│   ├── deleteCheck.middleware.ts   # Product association checks
│   └── index.ts                    # Middleware exports
└── README.md                       # This file
```

## Core Features

### 🏪 **Store Identity & Management**
- **Store Information**: Store name, description, slug generation
- **Visual Branding**: Store logo/image, banner, visual identity
- **Contact Details**: Email, phone numbers, multiple contact methods
- **Category Specialization**: Up to 10 category associations
- **Social Media**: Facebook, Twitter, Instagram, LinkedIn, website links

### 👤 **User Integration**
- **User Account Linking**: One-to-one relationship with User model
- **Account Status**: Active, suspended, pending, rejected, inactive
- **Role Management**: Integrated with user authentication system
- **Profile Synchronization**: Seamless user-seller data management

### 🏢 **Business Verification**
- **Business License**: License number and document verification
- **Tax Information**: Tax ID number with document uploads
- **Banking Details**: Account verification for payments
- **Identity Verification**: Personal ID documents (passport, license, national ID)
- **Verification Status**: Individual verification flags for each document type

### 📍 **Address Management**
- **Multiple Addresses**: Support for up to 10 business addresses
- **Address Types**: Business, pickup, billing, return addresses
- **GeoJSON Location**: Geographic coordinates for location-based services
- **Default Address**: One default address per type
- **Address Validation**: Comprehensive address format validation

### 📋 **Store Policies**
- **Return Policy**: Return acceptance, window, and conditions
- **Shipping Policy**: Processing time, methods, free shipping thresholds
- **Exchange Policy**: Exchange acceptance and timeframes
- **Customizable Terms**: Flexible policy management per seller

### ⭐ **Ratings & Reviews**
- **Average Rating**: Overall seller rating (0-5 stars)
- **Rating Breakdown**: Detailed 1-5 star distribution
- **Total Ratings**: Complete rating count tracking
- **Rating Updates**: Real-time rating calculation and updates

### 📊 **Analytics & Performance**
- **Sales Metrics**: Total sales revenue and order count
- **Product Count**: Number of products in store
- **Activity Tracking**: Join date and last active timestamps
- **Performance Flags**: Featured, top seller, verification status

### 💰 **Commission & Monetization**
- **Commission Rate**: Customizable commission percentage (0-50%)
- **Revenue Tracking**: Total sales and commission calculations
- **Payment Integration**: Bank account verification for payouts
- **Financial Analytics**: Revenue and performance metrics

## Schema Definitions

### BusinessVerificationSchema
```typescript
{
  businessLicense: {
    number: String,               // Business license number
    document: { url, publicId },  // Document file storage
    verified: Boolean            // Verification status
  },
  taxId: {
    number: String,              // Tax identification number
    document: { url, publicId }, // Tax document storage
    verified: Boolean           // Verification status
  },
  bankAccount: {
    accountNumber: String,       // Bank account number
    routingNumber: String,       // Bank routing number
    bankName: String,           // Bank institution name
    verified: Boolean          // Account verification status
  },
  identityVerification: {
    document: { url, publicId }, // ID document storage
    documentType: String,       // "passport" | "license" | "nationalId"
    verified: Boolean          // Identity verification status
  }
}
```

### SellerPoliciesSchema
```typescript
{
  returnPolicy: {
    acceptReturns: Boolean,      // Accept returns flag
    returnWindow: Number,        // Return window in days (default: 30)
    returnConditions: String     // Return conditions text
  },
  shippingPolicy: {
    processingTime: Number,      // Processing time in days (default: 1)
    shippingMethods: [String],   // Available shipping methods
    freeShippingThreshold: Number // Minimum order for free shipping
  },
  exchangePolicy: {
    acceptExchanges: Boolean,    // Accept exchanges flag
    exchangeWindow: Number       // Exchange window in days (default: 15)
  }
}
```

### SellerRatingsSchema
```typescript
{
  averageRating: Number,         // Average rating (0-5)
  totalRatings: Number,          // Total number of ratings
  ratingBreakdown: {
    5: Number,                   // 5-star rating count
    4: Number,                   // 4-star rating count
    3: Number,                   // 3-star rating count
    2: Number,                   // 2-star rating count
    1: Number                    // 1-star rating count
  }
}
```

## Usage Examples

### 🆕 **Creating Sellers**

```typescript
import Seller from '../seller';

// Create new seller account
const seller = new Seller({
  userId: userId, // Link to User model
  storeName: "Tech Haven Electronics",
  storeDescription: "Premium electronics and gadgets store with latest technology",
  categories: [electronicsId, smartphonesId, accessoriesId],
  contactEmail: "support@techhaven.com",
  phoneNumber: "+1-555-123-4567",
  alternatePhone: "+1-555-987-6543",
  addresses: [
    {
      type: "business",
      label: "Main Store",
      firstLine: "123 Tech Street",
      secondLine: "Suite 100",
      city: "San Francisco",
      state: "CA",
      country: "USA",
      postalCode: "94105",
      location: {
        type: "Point",
        coordinates: [-122.4194, 37.7749] // [longitude, latitude]
      },
      isDefault: true
    },
    {
      type: "pickup",
      label: "Pickup Center",
      firstLine: "456 Pickup Avenue",
      city: "San Francisco",
      state: "CA",
      country: "USA",
      postalCode: "94107",
      isDefault: true
    }
  ],
  socialLinks: {
    website: "https://www.techhaven.com",
    facebook: "https://facebook.com/techhaven",
    twitter: "https://twitter.com/techhaven",
    instagram: "https://instagram.com/techhaven"
  },
  businessVerification: {
    businessLicense: {
      number: "BL123456789",
      verified: false
    },
    taxId: {
      number: "TAX987654321",
      verified: false
    }
  },
  policies: {
    returnPolicy: {
      acceptReturns: true,
      returnWindow: 30,
      returnConditions: "Items must be unopened and in original packaging"
    },
    shippingPolicy: {
      processingTime: 2,
      shippingMethods: ["Standard", "Express", "Next Day"],
      freeShippingThreshold: 50
    },
    exchangePolicy: {
      acceptExchanges: true,
      exchangeWindow: 15
    }
  },
  commissionRate: 8.5,
  status: "pending"
});

await seller.save();
```

### 🔍 **Querying Sellers**

```typescript
// Find active sellers
const activeSellers = await Seller.findActiveSellers();

// Find seller by user ID
const seller = await Seller.findByUserId(userId);

// Find top-rated sellers
const topSellers = await Seller.findTopSellers(20);

// Find sellers by category
const categorySellers = await Seller.findActiveSellers({
  categories: categoryId
});

// Find verified sellers
const verifiedSellers = await Seller.findActiveSellers({
  isVerified: true
});

// Find featured sellers
const featuredSellers = await Seller.findActiveSellers({
  isFeatured: true
});

// Find sellers by location (within 10km)
const nearbySellers = await Seller.find({
  "addresses.location": {
    $near: {
      $geometry: { type: "Point", coordinates: [-122.4194, 37.7749] },
      $maxDistance: 10000 // 10km in meters
    }
  },
  status: "active",
  isDeleted: false
});

// Find sellers by rating
const highRatedSellers = await Seller.findActiveSellers({
  "ratings.averageRating": { $gte: 4.5 }
});
```

### 🏪 **Seller Management Operations**

```typescript
// Update seller rating
await seller.updateRating(5); // Add a 5-star rating

// Get default business address
const businessAddress = seller.getDefaultAddress("business");

// Get any default address
const defaultAddress = seller.getDefaultAddress();

// Check if seller is active
const isActive = seller.isActive();

// Soft delete seller (checks for active products)
await seller.softDelete();

// Restore deleted seller
await seller.restore();

// Update seller status
seller.status = "active";
seller.isVerified = true;
await seller.save();

// Update commission rate
seller.commissionRate = 10.0;
await seller.save();
```

### 📊 **Business Verification**

```typescript
// Update business verification
seller.businessVerification.businessLicense.document = {
  url: "https://storage.com/license.pdf",
  publicId: "license_doc_123"
};
seller.businessVerification.businessLicense.verified = true;

seller.businessVerification.taxId.number = "TAX123456789";
seller.businessVerification.taxId.verified = true;

seller.businessVerification.identityVerification.documentType = "passport";
seller.businessVerification.identityVerification.document = {
  url: "https://storage.com/passport.jpg",
  publicId: "passport_123"
};

await seller.save();

// Check verification status
const isFullyVerified = seller.businessVerification.businessLicense.verified &&
                       seller.businessVerification.taxId.verified &&
                       seller.businessVerification.identityVerification.verified;

if (isFullyVerified) {
  seller.isVerified = true;
  await seller.save();
}
```

## Advanced Features

### 📍 **Geolocation & Location-Based Services**

```typescript
// Find sellers within radius
const findSellersNearby = async (lat: number, lng: number, radiusKm: number) => {
  return await Seller.find({
    "addresses.location": {
      $near: {
        $geometry: { type: "Point", coordinates: [lng, lat] },
        $maxDistance: radiusKm * 1000 // Convert km to meters
      }
    },
    status: "active",
    isDeleted: false
  }).populate('userId', 'firstName lastName').limit(50);
};

// Aggregate sellers by location
const sellersByCity = await Seller.aggregate([
  { $match: { status: "active", isDeleted: false } },
  { $unwind: "$addresses" },
  {
    $group: {
      _id: "$addresses.city",
      sellerCount: { $sum: 1 },
      avgRating: { $avg: "$ratings.averageRating" }
    }
  },
  { $sort: { sellerCount: -1 } }
]);
```

### 📊 **Analytics & Reporting**

```typescript
// Seller performance dashboard
const sellerDashboard = await Seller.aggregate([
  { $match: { status: "active", isDeleted: false } },
  {
    $facet: {
      overview: [
        {
          $group: {
            _id: null,
            totalSellers: { $sum: 1 },
            verifiedSellers: { $sum: { $cond: ["$isVerified", 1, 0] } },
            topSellers: { $sum: { $cond: ["$isTopSeller", 1, 0] } },
            avgRating: { $avg: "$ratings.averageRating" },
            totalSales: { $sum: "$totalSales" }
          }
        }
      ],
      byCategory: [
        { $unwind: "$categories" },
        {
          $group: {
            _id: "$categories",
            sellerCount: { $sum: 1 },
            avgCommission: { $avg: "$commissionRate" }
          }
        },
        { $sort: { sellerCount: -1 } }
      ],
      topPerformers: [
        { $sort: { totalSales: -1 } },
        { $limit: 10 },
        {
          $project: {
            storeName: 1,
            totalSales: 1,
            totalOrders: 1,
            averageRating: "$ratings.averageRating"
          }
        }
      ]
    }
  }
]);

// Commission analysis
const commissionAnalysis = await Seller.aggregate([
  { $match: { status: "active", totalSales: { $gt: 0 } } },
  {
    $project: {
      storeName: 1,
      commissionRate: 1,
      totalSales: 1,
      estimatedCommission: { $multiply: ["$totalSales", { $divide: ["$commissionRate", 100] }] }
    }
  },
  { $sort: { estimatedCommission: -1 } }
]);
```

### 🏆 **Seller Rankings & Rewards**

```typescript
// Calculate top seller status
const updateTopSellerStatus = async () => {
  // Reset all top seller flags
  await Seller.updateMany({}, { isTopSeller: false });

  // Find top performers and mark them
  const topSellers = await Seller.find({
    status: "active",
    isDeleted: false,
    "ratings.averageRating": { $gte: 4.5 },
    totalSales: { $gte: 10000 }
  }).sort({ 
    "ratings.averageRating": -1, 
    totalSales: -1 
  }).limit(50);

  const topSellerIds = topSellers.map(seller => seller._id);
  
  await Seller.updateMany(
    { _id: { $in: topSellerIds } },
    { isTopSeller: true }
  );
};

// Seller loyalty program
const loyaltyTiers = await Seller.aggregate([
  { $match: { status: "active" } },
  {
    $project: {
      storeName: 1,
      totalSales: 1,
      tier: {
        $switch: {
          branches: [
            { case: { $gte: ["$totalSales", 100000] }, then: "Platinum" },
            { case: { $gte: ["$totalSales", 50000] }, then: "Gold" },
            { case: { $gte: ["$totalSales", 10000] }, then: "Silver" },
            { case: { $gte: ["$totalSales", 1000] }, then: "Bronze" }
          ],
          default: "Starter"
        }
      }
    }
  },
  {
    $group: {
      _id: "$tier",
      count: { $sum: 1 },
      sellers: { $push: { name: "$storeName", sales: "$totalSales" } }
    }
  }
]);
```

## Model Relationships

### 📋 **Related Entities**
- **User**: One-to-one relationship with User model
- **Products**: Sellers have multiple products
- **Categories**: Many-to-many relationship with categories
- **Orders**: Sellers receive orders for their products
- **Reviews**: Sellers receive ratings and reviews

### 🔗 **Population Examples**

```typescript
// Populate with user details
const sellerWithUser = await Seller.findById(sellerId)
  .populate('userId', 'firstName lastName email phone profileImage')
  .populate('categories', 'name slug path');

// Populate with products
const sellerWithProducts = await Seller.findById(sellerId)
  .populate({
    path: 'products',
    model: 'Product',
    match: { isActive: true, isDeleted: false },
    select: 'name pricing images reviews',
    options: { sort: { createdAt: -1 }, limit: 20 }
  });

// Populate with orders
const sellerWithOrders = await Seller.findById(sellerId)
  .populate({
    path: 'orders',
    model: 'Order',
    match: { status: { $ne: 'cancelled' } },
    select: 'orderNumber total status createdAt',
    options: { sort: { createdAt: -1 }, limit: 10 }
  });
```

## Performance Optimizations

### 📊 **Indexing Strategy**

```typescript
// Core indexes
{ userId: 1 }                              // Unique constraint
{ slug: 1 }                                // Unique constraint
{ status: 1, isDeleted: 1 }               // Active sellers filter
{ categories: 1 }                          // Category queries

// Performance indexes
{ isVerified: 1 }                         // Verified sellers
{ isFeatured: 1 }                         // Featured sellers
{ isTopSeller: 1 }                        // Top seller queries
{ "ratings.averageRating": 1 }            // Rating-based queries
{ totalSales: 1 }                         // Sales-based sorting
{ lastActiveDate: 1 }                     // Activity tracking

// Geospatial index
{ "addresses.location": "2dsphere" }      // Location-based queries
```

### ⚡ **Query Optimization**

```typescript
// Efficient seller queries
const sellers = await Seller.find({ status: "active", isDeleted: false })
  .select('storeName slug image ratings totalSales isVerified')
  .sort({ "ratings.averageRating": -1, totalSales: -1 })
  .limit(20)
  .lean(); // Use lean() for read-only operations

// Optimized aggregation for analytics
const sellerMetrics = await Seller.aggregate([
  { $match: { status: "active", isDeleted: false } },
  {
    $group: {
      _id: null,
      totalSellers: { $sum: 1 },
      avgRating: { $avg: "$ratings.averageRating" },
      totalRevenue: { $sum: "$totalSales" },
      verifiedCount: { $sum: { $cond: ["$isVerified", 1, 0] } }
    }
  }
]);

// Cached top sellers query
const cachedTopSellers = await Seller.find({
  isTopSeller: true,
  status: "active"
}).select('storeName slug image ratings').sort({ totalSales: -1 });
```

## Business Rules & Validation

### ✅ **Validation Rules**
- **Store Name**: 3-100 characters, required
- **User ID**: Required, unique (one seller per user)
- **Contact Email**: Valid email format, required
- **Categories**: Maximum 10 category associations
- **Addresses**: Maximum 10 addresses per seller
- **Commission Rate**: 0-50% range validation
- **Phone Numbers**: Valid mobile phone format

### 🔒 **Business Logic**
- Sellers cannot be deleted if they have active products
- One default address per address type enforced
- Rating calculations are automatic and real-time
- Top seller status based on performance metrics
- Verification status affects seller privileges
- Commission rates are customizable per seller

### 🛡️ **Security Features**
- Soft delete preserves seller data and relationships
- Business verification document security
- User account integration for authentication
- Address validation and geolocation security
- Social media URL validation
- Financial information protection

## Middleware Functionality

### 📝 **Pre-Save Middleware**
- Automatic slug generation from store name
- Address validation and default management
- Store name validation and uniqueness
- Social media URL validation

### 🗑️ **Pre-Delete Middleware**
- Check for associated active products
- Validate deletion eligibility
- Cleanup seller-product relationships
- Maintain data integrity

### 🏪 **Store Name Validation**
- Uniqueness validation across all sellers
- Format and length validation
- Slug generation and conflict resolution

## Integration Points

### 🛒 **E-commerce Integration**
- **Product Management**: Seller product catalog management
- **Order Processing**: Seller order fulfillment workflow
- **Payment Systems**: Commission calculation and seller payouts
- **Inventory Management**: Multi-location inventory tracking

### 📊 **Analytics Integration**
- **Google Analytics**: Seller store performance tracking
- **Business Intelligence**: Seller performance dashboards
- **Financial Reporting**: Commission and revenue analytics
- **Customer Insights**: Seller-customer interaction metrics

### 🔍 **Search Integration**
- **Elasticsearch**: Enhanced seller and store search
- **Location Search**: Geographic seller discovery
- **Autocomplete**: Store name and seller suggestions
- **Faceted Search**: Filter by seller attributes

### 📱 **Communication Integration**
- **Email Systems**: Seller notifications and communications
- **SMS Integration**: Order and payment notifications
- **Chat Systems**: Customer-seller communication
- **Social Media**: Store social media management

This Seller model provides a comprehensive foundation for multi-vendor e-commerce platforms with enterprise-grade features for seller management, verification, analytics, and business operations.