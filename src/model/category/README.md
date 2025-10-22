# Category Model

This directory contains the comprehensive organization of the Category model for the e-commerce platform. The Category model represents the hierarchical structure for organizing products with support for multi-level categorization, attributes, and business logic.

## Structure

```
category/
├── index.ts                      # Main model assembly and exports
├── schemas/
│   ├── attribute.schema.ts       # Category-specific attributes definition
│   ├── seo.schema.ts            # SEO metadata and optimization
│   ├── settings.schema.ts       # Business settings and configuration
│   └── index.ts                 # Schema exports
├── methods/
│   ├── instance.methods.ts      # Instance methods for category operations
│   ├── static.methods.ts        # Static methods for querying and utilities
│   └── index.ts                 # Methods exports
├── middleware/
│   ├── preSave.middleware.ts    # Pre-save hierarchy and slug generation
│   ├── preUpdate.middleware.ts  # Pre-update validation and processing
│   ├── preDelete.middleware.ts  # Pre-delete validation and cleanup
│   └── index.ts                 # Middleware exports
├── utils/
│   └── hierarchy.utils.ts       # Hierarchy path and slug generation utilities
└── README.md                    # This file
```

## Core Features

### 🌳 **Hierarchical Structure**
- **Multi-Level Categories**: Unlimited nesting depth with parent-child relationships
- **Materialized Path**: Efficient tree structure for fast queries
- **Ancestors Tracking**: Complete lineage from root to current category
- **Path Generation**: Human-readable breadcrumb paths
- **Level Tracking**: Depth level in the hierarchy

### 📋 **Category Information**
- **Basic Details**: Name, description, short description
- **Visual Elements**: Multiple images, banner, icon support
- **Unique Identifiers**: Auto-generated slugs and paths
- **Ordering**: Custom sort order within parent levels
- **Status Management**: Active/inactive and featured flags

### 🏷️ **Product Attributes**
- **Dynamic Attributes**: Configurable product attributes per category
- **Attribute Types**: Select, multiselect, range, text, boolean
- **Filtering Support**: Enable/disable attributes for product filtering
- **Required Fields**: Mark attributes as mandatory for products
- **Display Order**: Control attribute presentation order

### 🔍 **SEO Optimization**
- **Meta Information**: Title, description, keywords
- **Open Graph**: Social media sharing optimization
- **Canonical URLs**: Duplicate content prevention
- **Search Keywords**: Additional searchable terms

### ⚙️ **Business Settings**
- **Product Management**: Control product creation permissions
- **Approval Workflow**: Require approval for new products
- **Commission Settings**: Category-specific commission rates
- **Price Ranges**: Define minimum and maximum price constraints
- **Featured Limits**: Control featured product count

### 📊 **Analytics & Metrics**
- **Product Counting**: Direct and total product counts
- **View Tracking**: Category page view statistics
- **Average Ratings**: Aggregate rating from products
- **Performance Metrics**: Category popularity tracking

### 🎯 **Display Controls**
- **Menu Visibility**: Show/hide in navigation menus
- **Homepage Display**: Feature on homepage
- **Popular Categories**: Mark trending categories
- **Featured Status**: Highlight important categories

## Schema Definitions

### CategoryAttributeSchema
```typescript
{
  name: String,               // Attribute name (e.g., "Color", "Size")
  type: String,              // "select" | "multiselect" | "range" | "text" | "boolean"
  values: [String],          // Possible values for select types
  unit: String,              // Unit for range types (e.g., "inches", "kg")
  isRequired: Boolean,       // Whether attribute is mandatory
  isFilterable: Boolean,     // Enable in product filters
  displayOrder: Number       // Sort order in UI
}
```

### CategorySEOSchema
```typescript
{
  metaTitle: String,         // SEO page title (max 60 chars)
  metaDescription: String,   // SEO description (max 160 chars)
  metaKeywords: [String],    // SEO keywords array
  canonicalUrl: String,      // Canonical URL for SEO
  ogTitle: String,           // Open Graph title
  ogDescription: String,     // Open Graph description
  ogImage: IImage           // Open Graph image
}
```

### CategorySettingsSchema
```typescript
{
  allowProducts: Boolean,        // Allow products in this category
  requireApproval: Boolean,      // Require approval for new products
  commissionRate: Number,        // Commission percentage (0-100)
  featuredProductsLimit: Number, // Max featured products
  minPriceRange: Number,         // Minimum allowed price
  maxPriceRange: Number         // Maximum allowed price
}
```

## Usage Examples

### 🆕 **Creating Categories**

```typescript
import Category from '../category';

// Create root category
const rootCategory = new Category({
  name: "Electronics",
  description: "Electronic devices and accessories",
  shortDescription: "Electronics and gadgets",
  parent: null, // Root category
  attributes: [
    {
      name: "Brand",
      type: "select",
      values: ["Apple", "Samsung", "Sony"],
      isRequired: true,
      isFilterable: true,
      displayOrder: 1
    },
    {
      name: "Warranty",
      type: "range",
      unit: "years",
      isRequired: false,
      isFilterable: true,
      displayOrder: 2
    }
  ],
  seo: {
    metaTitle: "Electronics - Buy Latest Electronic Devices",
    metaDescription: "Shop the latest electronic devices and accessories",
    metaKeywords: ["electronics", "devices", "gadgets"]
  },
  settings: {
    allowProducts: true,
    requireApproval: false,
    commissionRate: 5.0,
    featuredProductsLimit: 20
  },
  isActive: true,
  isFeatured: true,
  showInMenu: true,
  showInHomepage: true,
  createdBy: userId,
  updatedBy: userId
});

await rootCategory.save();

// Create subcategory
const subcategory = new Category({
  name: "Smartphones",
  description: "Mobile phones and smartphones",
  parent: rootCategory._id,
  attributes: [
    {
      name: "Screen Size",
      type: "range",
      unit: "inches",
      isRequired: true,
      isFilterable: true,
      displayOrder: 1
    },
    {
      name: "Storage",
      type: "select",
      values: ["64GB", "128GB", "256GB", "512GB", "1TB"],
      isRequired: true,
      isFilterable: true,
      displayOrder: 2
    }
  ],
  createdBy: userId,
  updatedBy: userId
});

await subcategory.save();
```

### 🔍 **Querying Categories**

```typescript
// Find active categories
const activeCategories = await Category.findActiveCategories();

// Find root categories
const rootCategories = await Category.findActiveCategories({ parent: null });

// Find categories by parent
const childCategories = await Category.findActiveCategories({ 
  parent: parentId 
});

// Get hierarchy tree
const hierarchyTree = await Category.getHierarchyTree();

// Get specific parent's children
const parentChildren = await Category.getHierarchyTree(parentId);

// Find leaf categories (no children)
const leafCategories = await Category.getLeafCategories();

// Get breadcrumb path
const breadcrumb = await Category.getBreadcrumbPath(categoryId);

// Find featured categories
const featuredCategories = await Category.findActiveCategories({ 
  isFeatured: true 
});

// Find menu categories
const menuCategories = await Category.findActiveCategories({ 
  showInMenu: true 
}).sort({ order: 1 });

// Find categories with products
const categoriesWithProducts = await Category.findActiveCategories({
  productCount: { $gt: 0 }
});
```

### 🌳 **Hierarchy Operations**

```typescript
// Get category children
const children = await category.getChildren();

// Get full hierarchy path
const fullHierarchy = await category.getFullHierarchy();

// Check if leaf category
const isLeaf = await category.isLeafCategory();

// Move category to new parent
const movedCategory = await Category.moveCategory(categoryId, newParentId);

// Move to root level
const rootCategory = await Category.moveCategory(categoryId);

// Update hierarchy for descendants
await Category.updateDescendantHierarchy(parentId);
```

### 📊 **Business Operations**

```typescript
// Update product count
await category.updateProductCount();

// Soft delete category
await category.softDelete();

// Restore deleted category
await category.restore();

// Find categories by business rules
const approvalCategories = await Category.findActiveCategories({
  'settings.requireApproval': true
});

// Find high commission categories
const highCommissionCategories = await Category.findActiveCategories({
  'settings.commissionRate': { $gte: 10 }
});
```

## Advanced Features

### 🏗️ **Hierarchy Management**

```typescript
// Build complete category tree
const buildCategoryTree = async (parentId = null) => {
  const categories = await Category.getHierarchyTree(parentId);
  
  const tree = await Promise.all(categories.map(async (category) => {
    const children = await buildCategoryTree(category._id);
    return {
      ...category.toObject(),
      children: children.length > 0 ? children : []
    };
  }));
  
  return tree;
};

// Get category with all data
const categoryWithDetails = await Category.findById(categoryId)
  .populate('brands', 'name logo')
  .populate('parent', 'name slug path')
  .populate('ancestors', 'name slug');
```

### 🔍 **Advanced Search & Filtering**

```typescript
// Search categories with text
const searchResults = await Category.find({
  $or: [
    { name: { $regex: searchTerm, $options: 'i' } },
    { description: { $regex: searchTerm, $options: 'i' } },
    { searchKeywords: { $in: [searchTerm] } }
  ],
  isActive: true,
  isDeleted: false
});

// Filter by attributes
const categoriesWithColorAttribute = await Category.find({
  'attributes.name': 'Color',
  'attributes.isFilterable': true,
  isActive: true
});

// Find categories by level
const secondLevelCategories = await Category.findActiveCategories({
  level: 2
});
```

### 📈 **Analytics Operations**

```typescript
// Get popular categories
const popularCategories = await Category.findActiveCategories({
  isPopular: true
}).sort({ viewCount: -1 }).limit(10);

// Categories by product count
const categoriesByProducts = await Category.findActiveCategories()
  .sort({ totalProductCount: -1 })
  .limit(20);

// High-rated categories
const highRatedCategories = await Category.findActiveCategories({
  averageRating: { $gte: 4.0 }
}).sort({ averageRating: -1 });

// Category performance metrics
const categoryMetrics = await Category.aggregate([
  { $match: { isActive: true, isDeleted: false } },
  {
    $group: {
      _id: null,
      totalCategories: { $sum: 1 },
      totalProducts: { $sum: '$totalProductCount' },
      averageRating: { $avg: '$averageRating' },
      totalViews: { $sum: '$viewCount' }
    }
  }
]);
```

## Model Relationships

### 📋 **Related Entities**
- **Products**: Categories contain multiple products
- **Brands**: Categories can be associated with specific brands
- **Parent/Children**: Hierarchical self-referencing relationships
- **Ancestors**: Track complete lineage path
- **Users**: Track who created/updated categories

### 🔗 **Population Examples**

```typescript
// Populate with related data
const categoryWithRelations = await Category.findById(categoryId)
  .populate('parent', 'name slug path level')
  .populate('ancestors', 'name slug level')
  .populate('brands', 'name logo description')
  .populate('createdBy', 'name email')
  .populate('updatedBy', 'name email');

// Get category with products
const categoryWithProducts = await Category.findById(categoryId)
  .populate({
    path: 'products',
    match: { isActive: true, isDeleted: false },
    select: 'name pricing images reviews',
    limit: 10,
    sort: { createdAt: -1 }
  });
```

## Performance Optimizations

### 📊 **Indexing Strategy**

```typescript
// Core indexes
{ slug: 1 }                                    // Unique constraint
{ parent: 1, order: 1 }                        // Hierarchy queries
{ ancestors: 1 }                               // Ancestor queries
{ level: 1 }                                   // Level-based queries
{ materializedPath: 1 }                        // Path queries
{ isActive: 1, isDeleted: 1 }                 // Active categories filter

// Performance indexes
{ isFeatured: 1 }                             // Featured categories
{ isPopular: 1 }                              // Popular categories
{ showInMenu: 1 }                             // Menu categories
{ searchKeywords: 1 }                         // Keyword search
{ viewCount: -1 }                             // Popularity sorting
{ createdAt: -1 }                             // Newest first
```

### ⚡ **Query Optimization**

```typescript
// Efficient hierarchy queries using materialized path
const descendants = await Category.find({
  materializedPath: { $regex: `^${category.materializedPath}${category._id}/` },
  isActive: true
});

// Optimized breadcrumb with single query
const breadcrumbPath = await Category.find({
  _id: { $in: [...category.ancestors, category._id] }
}).sort({ level: 1 }).select('name slug level');

// Aggregation for category statistics
const categoryStats = await Category.aggregate([
  { $match: { isActive: true, isDeleted: false } },
  {
    $group: {
      _id: '$level',
      count: { $sum: 1 },
      avgProducts: { $avg: '$productCount' },
      totalViews: { $sum: '$viewCount' }
    }
  },
  { $sort: { _id: 1 } }
]);
```

## Business Rules & Validation

### ✅ **Validation Rules**
- **Name**: 1-100 characters, required
- **Description**: Maximum 1000 characters
- **Short Description**: Maximum 200 characters
- **Slug**: Auto-generated, unique, URL-friendly
- **Level**: Non-negative, auto-calculated
- **Order**: Non-negative, auto-assigned if not provided

### 🔒 **Business Logic**
- Categories cannot be their own parent or ancestor
- Moving categories updates all descendant paths
- Deleting categories soft-deletes to preserve data integrity
- Product counts are automatically maintained
- Slug uniqueness is enforced within parent scope

### 🛡️ **Security Features**
- Soft delete prevents accidental data loss
- User tracking for audit trails
- Input sanitization for all text fields
- Circular reference prevention
- Hierarchy validation on updates

## Middleware Functionality

### 📝 **Pre-Save Middleware**
- Automatic slug generation from name
- Hierarchy path calculation and updates
- Ancestor chain building
- Level calculation based on depth
- Order assignment for new categories

### 🔄 **Pre-Update Middleware**
- Hierarchy recalculation on parent changes
- Path regeneration when needed
- Descendant update triggering
- Validation of business rules

### 🗑️ **Pre-Delete Middleware**
- Dependency checking before deletion
- Cascade operations for children
- Product reassignment handling
- Cleanup of relationships

## Hierarchy Utilities

### 🛠️ **Path Generation**
```typescript
// Generate complete hierarchy data
const generateSlugAndPath = async (name: string, parentId: string | null) => {
  // Returns: slug, path, materializedPath, ancestors, level
};

// Convert name to URL-friendly slug
const slug = convertToSlug(categoryName);

// Build human-readable path
const path = "Electronics > Smartphones > Apple";

// Create materialized path for queries
const materializedPath = "/electronics-id/smartphones-id/";
```

## Integration Points

### 🛒 **E-commerce Integration**
- **Product Catalog**: Organize products hierarchically
- **Navigation**: Build dynamic menu structures
- **Filtering**: Enable attribute-based product filtering
- **SEO**: Optimize category pages for search engines

### 📊 **Analytics Integration**
- **Google Analytics**: Track category performance
- **Business Intelligence**: Category-based reporting
- **A/B Testing**: Test category organization effectiveness
- **User Behavior**: Track category navigation patterns

### 🔍 **Search Integration**
- **Elasticsearch**: Enhanced category search
- **Faceted Search**: Use attributes for filtering
- **Autocomplete**: Category suggestion features
- **Related Categories**: Cross-category recommendations

This Category model provides a robust foundation for hierarchical product organization with enterprise-grade features for e-commerce platforms, supporting unlimited nesting, flexible attributes, and comprehensive business logic.