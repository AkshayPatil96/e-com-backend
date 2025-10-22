# User Model

This directory contains the comprehensive organization of the User model for the e-commerce platform. The User model represents the core entity for all user accounts, including customers, sellers, admins, and delivery personnel.

## Structure

```
user/
├── index.ts                        # Main model assembly and exports
├── schemas/
│   ├── address.schema.ts           # User address schema (from common)
│   ├── recentItems.schema.ts       # Recent activity tracking
│   └── index.ts                    # Schema exports
├── methods/
│   ├── auth.methods.ts             # Authentication and JWT methods
│   ├── profile.methods.ts          # Profile management methods
│   ├── static.methods.ts           # Static query methods
│   └── index.ts                    # Methods exports
├── middleware/
│   ├── preSave.middleware.ts       # Pre-save password hashing and validation
│   ├── addressValidation.middleware.ts # Address validation middleware
│   └── index.ts                    # Middleware exports
└── README.md                       # This file
```

## Core Features

### 👤 **User Identity & Authentication**
- **Basic Information**: Username, email, first name, last name
- **Authentication**: Email/password, Google, Facebook login support
- **Email Verification**: Token-based email verification system
- **Password Management**: Secure bcrypt hashing, reset functionality
- **JWT Tokens**: Access and refresh token generation
- **Account Security**: Password strength validation, secure token handling

### 👥 **User Management & Roles**
- **Role System**: User, Admin, Super Admin, Seller, Delivery
- **Account Status**: Active, Inactive, Hold, Blocked, Suspended, Pending
- **Status Management**: Automatic seller status handling
- **Soft Delete**: Safe user deletion with recovery options
- **Activity Tracking**: Last login and session management

### 📝 **Profile Information**
- **Personal Details**: Gender, date of birth with age validation
- **Contact Information**: Phone numbers with format validation
- **Profile Images**: Secure image storage integration
- **Address Management**: Multiple addresses with validation (max 5)
- **Age Restrictions**: 13-120 years age validation

### 🏠 **Address Management**
- **Multiple Addresses**: Support for up to 5 addresses per user
- **Address Types**: Home, Work, Other predefined labels
- **Comprehensive Fields**: Street, city, state, country, postal code
- **Validation**: Robust address format validation
- **Default Address**: Primary address management

### 🔍 **Activity Tracking**
- **Recently Viewed**: Track up to 50 recently viewed products
- **Search History**: Store up to 50 recent search terms
- **Category Browsing**: Track up to 20 recent categories
- **Brand Interaction**: Track up to 20 recent brands
- **Search Products**: Track up to 30 recently searched products

### 🔐 **Security Features**
- **Password Encryption**: Bcrypt with salt rounds
- **Token Security**: JWT access/refresh token system
- **Email Verification**: Secure email confirmation process
- **Password Reset**: Secure token-based password reset
- **Account Protection**: Multiple security validations

## Schema Definitions

### UserSchema Core Fields
```typescript
{
  username: String,              // Unique, 3-30 chars, alphanumeric + special chars
  password: String,              // Encrypted, min 6 chars, not selected by default
  email: String,                 // Unique, validated email format
  emailVerified: Boolean,        // Email verification status
  firstName: String,             // Auto-capitalized, 1-50 chars
  lastName: String,              // Auto-capitalized, 1-50 chars
  gender: String,                // "male" | "female"
  dob: Date,                     // Age validation: 13-120 years
  profileImage: IImage,          // Profile picture with secure storage
  phone: String,                 // Optional, 10-15 digit validation
  alternatePhone: String         // Optional backup phone number
}
```

### Authentication & Security
```typescript
{
  loginType: String,             // "email" | "google" | "facebook"
  role: String,                  // "user" | "admin" | "superadmin" | "seller" | "delivery"
  status: String,                // "active" | "inactive" | "hold" | "blocked" | "suspended" | "pending"
  emailVerificationToken: String, // Secure email verification
  emailVerificationExpires: Date, // Token expiration
  resetPasswordToken: String,     // Password reset security
  resetPasswordExpires: Date,     // Reset token expiration
  lastLogin: Date,               // Activity tracking
  isDeleted: Boolean             // Soft delete flag
}
```

### RecentItemsSchema
```typescript
{
  recentlyViewedProducts: [ObjectId],    // Max 50 products
  recentlySearchedProducts: [ObjectId],  // Max 30 products
  recentCategories: [ObjectId],          // Max 20 categories
  recentBrands: [ObjectId],              // Max 20 brands
  recentSearches: [String]               // Max 50 search terms
}
```

## Usage Examples

### 🆕 **Creating Users**

```typescript
import User from '../user';

// Create new customer
const customer = new User({
  username: "john_doe_2024",
  email: "john.doe@example.com",
  password: "securePassword123",
  firstName: "John",
  lastName: "Doe",
  gender: "male",
  dob: new Date("1990-05-15"),
  phone: "+1-555-123-4567",
  loginType: "email",
  role: "user",
  addresses: [
    {
      type: "home",
      label: "Home",
      street: "123 Main Street",
      city: "New York",
      state: "NY",
      country: "USA",
      postalCode: "10001",
      isDefault: true
    }
  ]
});

await customer.save();

// Create seller account
const seller = new User({
  username: "tech_store_seller",
  email: "seller@techstore.com",
  password: "sellerPassword123",
  firstName: "Tech",
  lastName: "Store",
  role: "seller", // Status automatically set to "pending"
  phone: "+1-555-987-6543",
  addresses: [
    {
      type: "business",
      label: "Work",
      street: "456 Business Ave",
      city: "Los Angeles",
      state: "CA",
      country: "USA",
      postalCode: "90210",
      isDefault: true
    }
  ]
});

await seller.save();
```

### 🔍 **Querying Users**

```typescript
// Find active users
const activeUsers = await User.findActiveUser();

// Find users by role
const sellers = await User.findByRole("seller");
const admins = await User.findByRole("admin");

// Find active user by email
const user = await User.findActiveOne({ email: "user@example.com" });

// Find users with additional criteria
const verifiedUsers = await User.findActiveUser({ emailVerified: true });

// Find users by status
const pendingSellers = await User.findByRole("seller", { status: "pending" });

// Find users with recent activity
const recentUsers = await User.find({
  lastLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
  isDeleted: false
});

// Find users by age range
const adultUsers = await User.find({
  dob: {
    $lte: new Date(Date.now() - 18 * 365 * 24 * 60 * 60 * 1000),
    $gte: new Date(Date.now() - 65 * 365 * 24 * 60 * 60 * 1000)
  },
  isDeleted: false
});
```

### 🔐 **Authentication Operations**

```typescript
// User login validation
const user = await User.findOne({ email: loginEmail }).select('+password');
if (user && await user.comparePassword(loginPassword)) {
  // Generate tokens
  const accessToken = user.signAccessToken();
  const refreshToken = user.signRefreshToken();
  
  // Update last login
  user.lastLogin = new Date();
  await user.save();
  
  console.log("Login successful");
}

// Password validation
const isValidPassword = await user.comparePassword("userEnteredPassword");

// Token generation
const accessToken = user.signAccessToken();
const refreshToken = user.signRefreshToken();
```

### 👤 **Profile Management**

```typescript
// Update user profile
const user = await User.findById(userId);
user.firstName = "UpdatedFirst";
user.lastName = "UpdatedLast";
user.phone = "+1-555-999-8888";
await user.save();

// Add new address
user.addresses.push({
  type: "work",
  label: "Work",
  street: "789 Office Blvd",
  city: "Chicago",
  state: "IL",
  country: "USA",
  postalCode: "60601",
  isDefault: false
});
await user.save();

// Soft delete user
await user.softDelete();

// Restore deleted user
await user.restore();

// Get user's full name and age
const fullName = user.name; // Virtual field
const userAge = user.age; // Virtual field calculated from dob
```

### 📊 **Activity Tracking**

```typescript
// Track recently viewed product
user.recentItems.recentlyViewedProducts.unshift(productId);
// Keep only last 50 items
if (user.recentItems.recentlyViewedProducts.length > 50) {
  user.recentItems.recentlyViewedProducts = 
    user.recentItems.recentlyViewedProducts.slice(0, 50);
}
await user.save();

// Track search term
user.recentItems.recentSearches.unshift(searchTerm);
if (user.recentItems.recentSearches.length > 50) {
  user.recentItems.recentSearches = 
    user.recentItems.recentSearches.slice(0, 50);
}
await user.save();

// Track category interaction
user.recentItems.recentCategories.unshift(categoryId);
if (user.recentItems.recentCategories.length > 20) {
  user.recentItems.recentCategories = 
    user.recentItems.recentCategories.slice(0, 20);
}
await user.save();
```

## Advanced Features

### 👥 **User Management Operations**

```typescript
// Find users with advanced criteria
const complexQuery = await User.find({
  role: { $in: ["user", "seller"] },
  emailVerified: true,
  status: "active",
  createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
  'addresses.country': "USA"
});

// Aggregate user statistics
const userStats = await User.aggregate([
  { $match: { isDeleted: false } },
  {
    $group: {
      _id: "$role",
      count: { $sum: 1 },
      verified: { $sum: { $cond: ["$emailVerified", 1, 0] } },
      avgAge: { 
        $avg: { 
          $divide: [
            { $subtract: [new Date(), "$dob"] },
            365 * 24 * 60 * 60 * 1000
          ]
        }
      }
    }
  }
]);

// Find users by location
const locationUsers = await User.find({
  'addresses.city': "New York",
  'addresses.isDefault': true,
  isDeleted: false
});
```

### 🔍 **Search & Filtering**

```typescript
// Text search across user fields
const searchUsers = await User.find({
  $or: [
    { firstName: { $regex: searchTerm, $options: 'i' } },
    { lastName: { $regex: searchTerm, $options: 'i' } },
    { username: { $regex: searchTerm, $options: 'i' } },
    { email: { $regex: searchTerm, $options: 'i' } }
  ],
  isDeleted: false
});

// Filter by age range
const ageFilterUsers = await User.find({
  dob: {
    $gte: new Date(Date.now() - maxAge * 365 * 24 * 60 * 60 * 1000),
    $lte: new Date(Date.now() - minAge * 365 * 24 * 60 * 60 * 1000)
  }
});

// Filter by recent activity
const activeUsers = await User.find({
  lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
  status: "active"
}).sort({ lastLogin: -1 });
```

### 📈 **Analytics & Reporting**

```typescript
// User registration trends
const registrationTrends = await User.aggregate([
  { $match: { isDeleted: false } },
  {
    $group: {
      _id: {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" }
      },
      newUsers: { $sum: 1 },
      newSellers: { $sum: { $cond: [{ $eq: ["$role", "seller"] }, 1, 0] } }
    }
  },
  { $sort: { "_id.year": 1, "_id.month": 1 } }
]);

// User engagement metrics
const engagementMetrics = await User.aggregate([
  { $match: { isDeleted: false, role: "user" } },
  {
    $project: {
      hasRecentActivity: {
        $gt: [
          { $size: { $ifNull: ["$recentItems.recentlyViewedProducts", []] } },
          0
        ]
      },
      recentSearchCount: { $size: { $ifNull: ["$recentItems.recentSearches", []] } },
      addressCount: { $size: { $ifNull: ["$addresses", []] } }
    }
  },
  {
    $group: {
      _id: null,
      activeUsers: { $sum: { $cond: ["$hasRecentActivity", 1, 0] } },
      avgSearches: { $avg: "$recentSearchCount" },
      avgAddresses: { $avg: "$addressCount" }
    }
  }
]);
```

## Model Relationships

### 📋 **Related Entities**
- **Products**: Users view, search, and purchase products
- **Categories**: Users browse and interact with categories
- **Brands**: Users follow and interact with brands
- **Orders**: Users place and manage orders
- **Reviews**: Users write product reviews
- **Sellers**: Special user type for selling products

### 🔗 **Population Examples**

```typescript
// Populate recent activity
const userWithActivity = await User.findById(userId)
  .populate('recentItems.recentlyViewedProducts', 'name images pricing')
  .populate('recentItems.recentCategories', 'name slug')
  .populate('recentItems.recentBrands', 'name logo');

// Populate with orders (if Order model exists)
const userWithOrders = await User.findById(userId)
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
{ email: 1 }                              // Unique constraint
{ username: 1 }                           // Unique constraint
{ isDeleted: 1, status: 1 }              // Active users filter
{ phone: 1 }                             // Sparse index for phone lookup

// Query optimization indexes
{ role: 1 }                              // Role-based queries
{ loginType: 1 }                         // Login type filtering
{ lastLogin: 1 }                         // Activity queries
{ createdAt: 1 }                         // Registration date queries

// Compound indexes for common queries
{ role: 1, status: 1, isDeleted: 1 }     // Role + status queries
{ emailVerified: 1, status: 1 }          // Verified user queries
```

### ⚡ **Query Optimization**

```typescript
// Efficient user lookup
const user = await User.findOne({ email })
  .select('firstName lastName role status emailVerified')
  .lean(); // Use lean() for read-only operations

// Optimized pagination
const users = await User.find({ role: "user", isDeleted: false })
  .select('firstName lastName email createdAt lastLogin')
  .sort({ createdAt: -1 })
  .limit(20)
  .skip(page * 20);

// Aggregation for complex analytics
const userMetrics = await User.aggregate([
  { $match: { isDeleted: false } },
  {
    $facet: {
      byRole: [
        { $group: { _id: "$role", count: { $sum: 1 } } }
      ],
      byStatus: [
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ],
      recent: [
        { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
        { $count: "newUsers" }
      ]
    }
  }
]);
```

## Business Rules & Validation

### ✅ **Validation Rules**
- **Username**: 3-30 characters, alphanumeric + dots, hyphens, underscores
- **Email**: Valid email format, unique across platform
- **Password**: Minimum 6 characters, bcrypt encrypted
- **Names**: 1-50 characters, auto-capitalized
- **Phone**: 10-15 digits, international format supported
- **Age**: Must be between 13-120 years old
- **Addresses**: Maximum 5 addresses per user

### 🔒 **Business Logic**
- New seller accounts automatically set to "pending" status
- Passwords are hashed before saving
- Email verification required for full account access
- Soft delete preserves user data and relationships
- Recent activity arrays have size limits to prevent bloat
- Role-based access control ready for implementation

### 🛡️ **Security Features**
- Password fields excluded from queries by default
- Secure token generation for email verification and password reset
- Input sanitization and validation
- Bcrypt password hashing with salt rounds
- JWT token-based authentication
- Protection against common attack vectors

## Middleware Functionality

### 📝 **Pre-Save Middleware**
- Automatic password hashing when password is modified
- Seller status auto-assignment for new seller accounts
- Timestamp management for audit trails

### 🏠 **Address Validation Middleware**
- Address format validation
- Maximum address limit enforcement
- Default address management
- Address type validation

### 🔐 **Authentication Middleware**
- JWT token verification
- Role-based access control
- Session management
- Security validation

## Integration Points

### 🛒 **E-commerce Integration**
- **Order Management**: Link users to their orders and purchase history
- **Product Interaction**: Track product views, purchases, and reviews
- **Cart Management**: Associate shopping carts with user accounts
- **Wishlist**: Save favorite products for later purchase

### 📊 **Analytics Integration**
- **User Behavior**: Track browsing patterns and preferences
- **Conversion Tracking**: Monitor user journey from registration to purchase
- **Engagement Metrics**: Measure user activity and retention
- **Personalization**: Use activity data for recommendations

### 🔍 **Search Integration**
- **User Search**: Enable admin user search and management
- **Activity Search**: Find users by their activity patterns
- **Location Search**: Geographic user distribution analysis
- **Demographic Search**: Age, gender, and role-based filtering

This User model provides a comprehensive foundation for user management in an e-commerce platform with enterprise-grade authentication, profile management, activity tracking, and security features.