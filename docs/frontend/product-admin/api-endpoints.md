# API Endpoints Documentation

## Base URL
```
https://your-api-domain.com/api/v1
```

## Authentication
All admin endpoints require:
```
Authorization: Bearer <jwt_token>
```

---

## 🔑 SKU Management Endpoints

### 1. Generate SKU Preview
**Endpoint**: `POST /admin/sku/generate-preview`

**Purpose**: Generate SKU preview for frontend forms (auto-generation or manual override)

**Request Body**:
```typescript
{
  brandId: string;        // Required: Brand ID
  categoryId: string;     // Required: Category ID  
  size?: string;          // Optional: Product size
  color?: string;         // Optional: Product color
  customSuffix?: string;  // Optional: Custom suffix
}
```

**Response**:
```typescript
{
  success: true,
  message: "SKU generated successfully",
  data: {
    sku: "NIKE-SHO-L-BLK-001",
    components: {
      brand: "NIKE",
      category: "SHO", 
      size: "L",
      color: "BLK",
      sequence: "001"
    },
    isCustom: false,
    brandName: "Nike",
    categoryName: "Shoes"
  }
}
```

### 2. Validate SKU
**Endpoint**: `POST /admin/sku/validate`

**Purpose**: Check SKU format and uniqueness

**Request Body**:
```typescript
{
  sku: string;                // Required: SKU to validate
  excludeProductId?: string;  // Optional: Exclude product from check (for updates)
}
```

**Response**:
```typescript
{
  success: true,
  message: "SKU is valid and unique",
  data: {
    isValid: true,
    isUnique: true,
    formatValid: true,
    components: {
      brand: "NIKE",
      category: "SHO",
      size: "L", 
      color: "BLK",
      sequence: "001"
    },
    existingProduct: null // or { id, name } if exists
  }
}
```

### 3. Get SKU Reference Data
**Endpoint**: `GET /admin/sku/reference`

**Purpose**: Get brand codes, category codes, and SKU patterns

**Response**:
```typescript
{
  success: true,
  message: "SKU reference data retrieved successfully",
  data: {
    pattern: "BRAND-CATEGORY-SIZE-COLOR-SEQUENCE",
    example: "NIKE-SHO-L-BLK-001",
    description: "Auto-generated based on brand, category, size, color, and sequence",
    brands: [
      { id: "brand123", name: "Nike", code: "NIKE" },
      { id: "brand456", name: "Adidas", code: "ADIDAS" }
    ],
    categories: [
      { id: "cat123", name: "Shoes", code: "SHO" },
      { id: "cat456", name: "T-Shirts", code: "TSH" }
    ],
    sizeCodes: {
      "XS": "XS", "S": "S", "M": "M", "L": "L", "XL": "XL", "One Size": "OS"
    },
    colorCodes: {
      "Black": "BLK", "White": "WHT", "Red": "RED", "Blue": "BLU"
    }
  }
}
```

---

## 📋 Product List & Management

### 1. Get All Products (Admin)
**Endpoint**: `GET /admin/products`

**Query Parameters**:
```typescript
interface ProductListQuery {
  // Pagination
  page?: number;           // Default: 1, Min: 1
  limit?: number;          // Default: 20, Min: 1, Max: 100
  
  // Search & Filters
  search?: string;         // Search in name, description, SKU, tags
  status?: 'all' | 'published' | 'draft' | 'archived';
  condition?: 'all' | 'new' | 'used' | 'refurbished';
  category?: string;       // Category ObjectId
  brand?: string;          // Brand ObjectId
  seller?: string;         // Seller ObjectId
  featured?: 'all' | 'featured' | 'not-featured';
  onSale?: 'all' | 'on-sale' | 'not-on-sale';
  inStock?: 'all' | 'in-stock' | 'out-of-stock' | 'low-stock';
  
  // Sorting
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'basePrice' | 'stockQuantity' | 'soldQuantity' | 'averageRating' | 'viewCount';
  sortOrder?: 'asc' | 'desc';
  
  // Advanced Filters
  minPrice?: number;
  maxPrice?: number;
  minStock?: number;
  maxStock?: number;
  minRating?: number;
  maxRating?: number;
  dateFrom?: string;       // ISO date string
  dateTo?: string;         // ISO date string
  isDeleted?: boolean;     // Default: false
}
```

**Example Request**:
```javascript
// Using fetch
const response = await fetch('/api/v1/admin/products?page=1&limit=20&status=published&sortBy=createdAt&sortOrder=desc', {
  headers: {
    'Authorization': 'Bearer your_jwt_token',
    'Content-Type': 'application/json'
  }
});

// Using RTK Query
const { data, isLoading, error } = useGetProductsQuery({
  page: 1,
  limit: 20,
  status: 'published',
  sortBy: 'createdAt',
  sortOrder: 'desc'
});
```

**Response**:
```typescript
{
  success: true,
  message: "Products retrieved successfully",
  data: {
    data: ProductAdminItem[],
    pagination: {
      currentPage: number,
      totalPages: number,
      totalCount: number,
      limit: number,
      hasNext: boolean,
      hasPrev: boolean
    },
    filters: ProductAdminFilters
  }
}
```

---

### 2. Get Product by ID (Admin)
**Endpoint**: `GET /admin/products/:id`

**Parameters**:
- `id` (string): Product ObjectId

**Example Request**:
```javascript
const response = await fetch('/api/v1/admin/products/64a7b8c9d1234567890abcdef', {
  headers: {
    'Authorization': 'Bearer your_jwt_token'
  }
});
```

**Response**:
```typescript
{
  success: true,
  message: "Product retrieved successfully",
  data: IProduct // Full product object with populated fields
}
```

---

### 3. Search Products
**Endpoint**: `GET /admin/products/search`

**Query Parameters**:
```typescript
interface SearchQuery {
  q: string;              // Required, min 2 characters
  limit?: number;         // Default: 20, Max: 50
  page?: number;          // Default: 1
  includeDeleted?: boolean; // Default: false
}
```

**Example Request**:
```javascript
const response = await fetch('/api/v1/admin/products/search?q=smartphone&limit=10&page=1', {
  headers: {
    'Authorization': 'Bearer your_jwt_token'
  }
});
```

**Response**:
```typescript
{
  success: true,
  message: "Search completed successfully",
  data: {
    results: ProductSearchItem[],
    pagination: {
      currentPage: number,
      totalCount: number,
      count: number,
      hasMore: boolean
    },
    query: string
  }
}
```

---

## 📊 Statistics & Analytics

### 4. Get Product Statistics
**Endpoint**: `GET /admin/products/statistics`

**Example Request**:
```javascript
const response = await fetch('/api/v1/admin/products/statistics', {
  headers: {
    'Authorization': 'Bearer your_jwt_token'
  }
});
```

**Response**:
```typescript
{
  success: true,
  message: "Product statistics retrieved successfully",
  data: {
    totalProducts: number,
    publishedProducts: number,
    draftProducts: number,
    archivedProducts: number,
    outOfStockProducts: number,
    lowStockProducts: number,
    featuredProducts: number,
    onSaleProducts: number,
    totalValue: number,
    averagePrice: number,
    topCategories: Array<{
      _id: string,
      name: string,
      count: number,
      percentage: number
    }>,
    topBrands: Array<{
      _id: string,
      name: string,
      count: number,
      percentage: number
    }>,
    topSellers: Array<{
      _id: string,
      storeName: string,
      count: number,
      percentage: number
    }>
  }
}
```

---

## ✏️ Product CRUD Operations

### 5. Create Product
**Endpoint**: `POST /admin/products`

**Request Body**:
```typescript
interface CreateProductBody {
  // Required fields
  name: string;
  sku?: string;            // Optional - will auto-generate if not provided
  category: string;        // ObjectId
  brand: string;           // ObjectId
  seller: string;          // ObjectId
  pricing: {
    basePrice: number;
    comparePrice?: number;
    currency?: string;     // Default: "USD"
  };
  
  // Optional fields
  description?: string;
  shortDescription?: string;
  images?: Array<{
    url: string;
    alt?: string;
    isPrimary?: boolean;
  }>;
  categories?: string[];   // Additional category ObjectIds
  inventory?: {
    stockQuantity?: number;
    reorderLevel?: number;
    reservedQuantity?: number;
  };
  shipping?: {
    weight?: number;
    dimensions?: {
      length: number;
      width: number;
      height: number;
    };
    freeShipping?: boolean;
    shippingClass?: string;
  };
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
  };
  status?: 'published' | 'draft' | 'archived';
  condition?: 'new' | 'used' | 'refurbished';
  isFeatured?: boolean;
  isOnSale?: boolean;
  tags?: string[];
  variations?: string[];   // Variation ObjectIds
  attributes?: Record<string, string>;
}
```

**Example Request**:
```javascript
const productData = {
  name: "iPhone 15 Pro",
  // sku: "IPH15PRO-001", // Optional - will auto-generate from Apple + Electronics
  category: "64a7b8c9d1234567890abcdef",
  brand: "64a7b8c9d1234567890abcdff",
  seller: "64a7b8c9d1234567890abcdee",
  pricing: {
    basePrice: 999.99,
    comparePrice: 1099.99,
    currency: "USD"
  },
  description: "Latest iPhone with advanced features",
  status: "draft",
  condition: "new",
  attributes: {
    size: "128GB",
    color: "Space Black"
  }
};

const response = await fetch('/api/v1/admin/products', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your_jwt_token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(productData)
});
```

**Response**:
```typescript
{
  success: true,
  message: "Product created successfully",
  data: IProduct // Created product object
}
```

---

### 6. Update Product
**Endpoint**: `PUT /admin/products/:id`

**Parameters**:
- `id` (string): Product ObjectId

**Request Body**: Same as Create Product but all fields are optional

**Example Request**:
```javascript
const updateData = {
  name: "iPhone 15 Pro Max",
  pricing: {
    basePrice: 1199.99
  },
  status: "published"
};

const response = await fetch('/api/v1/admin/products/64a7b8c9d1234567890abcdef', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer your_jwt_token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(updateData)
});
```

---

### 7. Delete Product (Soft Delete)
**Endpoint**: `DELETE /admin/products/:id`

**Parameters**:
- `id` (string): Product ObjectId

**Example Request**:
```javascript
const response = await fetch('/api/v1/admin/products/64a7b8c9d1234567890abcdef', {
  method: 'DELETE',
  headers: {
    'Authorization': 'Bearer your_jwt_token'
  }
});
```

**Response**:
```typescript
{
  success: true,
  message: "Product deleted successfully"
}
```

---

### 8. Restore Product
**Endpoint**: `POST /admin/products/:id/restore`

**Parameters**:
- `id` (string): Product ObjectId

**Example Request**:
```javascript
const response = await fetch('/api/v1/admin/products/64a7b8c9d1234567890abcdef/restore', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your_jwt_token'
  }
});
```

---

### 9. Toggle Product Status
**Endpoint**: `POST /admin/products/:id/toggle-status`

**Parameters**:
- `id` (string): Product ObjectId

**Example Request**:
```javascript
const response = await fetch('/api/v1/admin/products/64a7b8c9d1234567890abcdef/toggle-status', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your_jwt_token'
  }
});
```

**Response**:
```typescript
{
  success: true,
  message: "Product published successfully", // or "unpublished"
  data: IProduct // Updated product
}
```

---

## 🔄 Bulk Operations

### 10. Bulk Actions
**Endpoint**: `POST /admin/products/bulk-action`

**Request Body**:
```typescript
interface BulkActionBody {
  productIds: string[];    // Array of product ObjectIds (max 100)
  action: 'publish' | 'unpublish' | 'archive' | 'restore' | 'delete' | 'feature' | 'unfeature' | 'enable-sale' | 'disable-sale';
}
```

**Example Request**:
```javascript
const bulkData = {
  productIds: [
    "64a7b8c9d1234567890abcdef",
    "64a7b8c9d1234567890abcdee",
    "64a7b8c9d1234567890abcded"
  ],
  action: "publish"
};

const response = await fetch('/api/v1/admin/products/bulk-action', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your_jwt_token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(bulkData)
});
```

**Response**:
```typescript
{
  success: true,
  message: "Bulk publish completed. 2 successful, 1 failed.",
  data: {
    success: number,
    failed: number,
    errors: Array<{
      productId: string,
      error: string
    }>
  }
}
```

---

## 🌐 Public API

### 11. Get Product by Slug (Public)
**Endpoint**: `GET /products/:slug`

**Parameters**:
- `slug` (string): Product slug

**Example Request**:
```javascript
const response = await fetch('/api/v1/products/iphone-15-pro');
```

**Response**: Same as Get Product by ID but only returns published products

---

## ⚠️ Error Responses

All endpoints return consistent error format:

```typescript
{
  success: false,
  message: string,
  error?: {
    code: string,
    details?: any
  }
}
```

**Common HTTP Status Codes**:
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate SKU/name)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

---

## 🔐 Rate Limits

| Operation Type | Rate Limit | Window |
|---------------|------------|---------|
| Admin Operations | 100 requests | 15 minutes |
| Search | 30 requests | 1 minute |
| Bulk Actions | 10 requests | 5 minutes |
| Public Access | 500 requests | 15 minutes |

---

## 📝 Notes for Frontend Implementation

1. **Always handle loading states** for better UX
2. **Implement debounced search** to avoid excessive API calls
3. **Cache filter options** (categories, brands, sellers) for dropdowns
4. **Use optimistic updates** for better perceived performance
5. **Implement retry logic** for failed requests
6. **Show progress indicators** for bulk operations
7. **Validate forms client-side** before API calls
8. **Handle file uploads separately** if implementing image management