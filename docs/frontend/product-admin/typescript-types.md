# TypeScript Types & Interfaces

## Core Product Types

### Product Admin List Item
```typescript
interface IProductAdminItem {
  _id: string;
  name: string;
  slug: string;
  sku: string;
  status: ProductStatus;
  condition: ProductCondition;
  isFeatured: boolean;
  isOnSale: boolean;
  isDeleted: boolean;
  image?: {
    url: string;
    alt: string;
  };
  brand: {
    _id: string;
    name: string;
    slug: string;
  };
  category: {
    _id: string;
    name: string;
    slug: string;
  };
  seller: {
    _id: string;
    storeName: string;
    slug: string;
  };
  pricing: {
    basePrice: number;
    comparePrice?: number;
    currency: string;
  };
  inventory: {
    stockQuantity: number;
    soldQuantity: number;
    reservedQuantity: number;
  };
  reviews: {
    averageRating: number;
    totalReviews: number;
  };
  analytics: {
    viewCount: number;
    wishlistCount: number;
    cartAddCount: number;
    purchaseCount: number;
  };
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  updatedBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}
```

### Product Enums
```typescript
enum ProductStatus {
  PUBLISHED = "published",
  DRAFT = "draft",
  ARCHIVED = "archived"
}

enum ProductCondition {
  NEW = "new",
  USED = "used",
  REFURBISHED = "refurbished"
}
```

### Full Product Interface
```typescript
interface IProduct {
  _id: string;
  name: string;
  slug: string;
  sku: string;
  description?: string;
  shortDescription?: string;
  
  // Images
  images: Array<{
    url: string;
    alt?: string;
    isPrimary?: boolean;
  }>;
  
  // Categorization
  category: string; // ObjectId
  categories?: string[]; // Additional category ObjectIds
  brand: string; // ObjectId
  seller: string; // ObjectId
  
  // Pricing
  pricing: {
    basePrice: number;
    comparePrice?: number;
    currency: string;
    costPrice?: number;
    taxable?: boolean;
    taxClass?: string;
  };
  
  // Inventory
  inventory: {
    stockQuantity: number;
    reorderLevel?: number;
    soldQuantity: number;
    reservedQuantity: number;
    allowBackorders?: boolean;
    trackQuantity?: boolean;
    isInStock: boolean;
  };
  
  // Shipping
  shipping: {
    weight?: number;
    dimensions?: {
      length: number;
      width: number;
      height: number;
      unit: string;
    };
    shippingClass?: string;
    requiresShipping?: boolean;
    freeShipping?: boolean;
    shippingCost?: number;
  };
  
  // Product Details
  status: ProductStatus;
  condition: ProductCondition;
  visibility: "public" | "private" | "hidden";
  isFeatured: boolean;
  isOnSale: boolean;
  isVirtual: boolean;
  isDownloadable: boolean;
  
  // Variations & Attributes
  variations?: string[]; // Variation ObjectIds
  attributes: Map<string, string>;
  
  // Reviews & Ratings
  reviews: {
    averageRating: number;
    totalReviews: number;
    ratingsBreakdown: {
      1: number;
      2: number;
      3: number;
      4: number;
      5: number;
    };
  };
  
  // SEO
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    canonicalUrl?: string;
  };
  
  // Analytics
  analytics: {
    viewCount: number;
    wishlistCount: number;
    cartAddCount: number;
    purchaseCount: number;
    conversionRate?: number;
    lastViewedAt?: string;
  };
  
  // Tags & Search
  tags: string[];
  searchKeywords?: string[];
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  
  // Audit
  createdBy: string; // User ObjectId
  updatedBy: string; // User ObjectId
  isDeleted: boolean;
  deletedAt?: string;
  deletedBy?: string; // User ObjectId
}
```

---

## Filter & Query Types

### Product Admin Filters
```typescript
interface IProductAdminFilters {
  // Pagination
  page: number;
  limit: number;
  
  // Search & Basic Filters
  search: string;
  status: "all" | ProductStatus;
  condition: "all" | ProductCondition;
  category: string;
  brand: string;
  seller: string;
  featured: "all" | "featured" | "not-featured";
  onSale: "all" | "on-sale" | "not-on-sale";
  inStock: "all" | "in-stock" | "out-of-stock" | "low-stock";
  
  // Sorting
  sortBy: "name" | "createdAt" | "updatedAt" | "basePrice" | "stockQuantity" | "soldQuantity" | "averageRating" | "viewCount";
  sortOrder: "asc" | "desc";
  
  // Advanced Filters
  isDeleted: boolean;
  minPrice?: number;
  maxPrice?: number;
  minStock?: number;
  maxStock?: number;
  minRating?: number;
  maxRating?: number;
  dateFrom?: string;
  dateTo?: string;
}
```

### Search Types
```typescript
interface IProductSearchItem {
  _id: string;
  name: string;
  slug: string;
  sku: string;
  status: ProductStatus;
  condition: ProductCondition;
  image?: {
    url: string;
    alt: string;
  };
  brand: {
    _id: string;
    name: string;
  };
  category: {
    _id: string;
    name: string;
  };
  seller: {
    _id: string;
    storeName: string;
  };
  pricing: {
    basePrice: number;
    currency: string;
  };
  inventory: {
    stockQuantity: number;
  };
}

interface IProductSearchResponse {
  results: IProductSearchItem[];
  pagination: {
    currentPage: number;
    totalCount: number;
    count: number;
    hasMore: boolean;
  };
  query: string;
}
```

---

## CRUD Operation Types

### Create Product Body
```typescript
interface ICreateProductAdminBody {
  // Required fields
  name: string;
  sku: string;
  category: string; // ObjectId
  brand: string; // ObjectId
  seller: string; // ObjectId
  pricing: {
    basePrice: number;
    comparePrice?: number;
    currency?: string;
    costPrice?: number;
    taxable?: boolean;
    taxClass?: string;
  };
  
  // Optional fields
  description?: string;
  shortDescription?: string;
  images?: Array<{
    url: string;
    alt?: string;
    isPrimary?: boolean;
  }>;
  categories?: string[]; // Additional category ObjectIds
  inventory?: {
    stockQuantity?: number;
    reorderLevel?: number;
    allowBackorders?: boolean;
    trackQuantity?: boolean;
  };
  shipping?: {
    weight?: number;
    dimensions?: {
      length: number;
      width: number;
      height: number;
      unit?: string;
    };
    shippingClass?: string;
    requiresShipping?: boolean;
    freeShipping?: boolean;
    shippingCost?: number;
  };
  status?: ProductStatus;
  condition?: ProductCondition;
  visibility?: "public" | "private" | "hidden";
  isFeatured?: boolean;
  isOnSale?: boolean;
  isVirtual?: boolean;
  isDownloadable?: boolean;
  variations?: string[]; // Variation ObjectIds
  attributes?: Record<string, string>;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    canonicalUrl?: string;
  };
  tags?: string[];
  searchKeywords?: string[];
}
```

### Update Product Body
```typescript
interface IUpdateProductAdminBody {
  // All fields are optional for updates
  name?: string;
  sku?: string;
  category?: string;
  brand?: string;
  seller?: string;
  description?: string;
  shortDescription?: string;
  images?: Array<{
    url: string;
    alt?: string;
    isPrimary?: boolean;
  }>;
  categories?: string[];
  pricing?: {
    basePrice?: number;
    comparePrice?: number;
    currency?: string;
    costPrice?: number;
    taxable?: boolean;
    taxClass?: string;
  };
  inventory?: {
    stockQuantity?: number;
    reorderLevel?: number;
    allowBackorders?: boolean;
    trackQuantity?: boolean;
  };
  shipping?: {
    weight?: number;
    dimensions?: {
      length?: number;
      width?: number;
      height?: number;
      unit?: string;
    };
    shippingClass?: string;
    requiresShipping?: boolean;
    freeShipping?: boolean;
    shippingCost?: number;
  };
  status?: ProductStatus;
  condition?: ProductCondition;
  visibility?: "public" | "private" | "hidden";
  isFeatured?: boolean;
  isOnSale?: boolean;
  isVirtual?: boolean;
  isDownloadable?: boolean;
  variations?: string[];
  attributes?: Record<string, string>;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    canonicalUrl?: string;
  };
  tags?: string[];
  searchKeywords?: string[];
}
```

---

## Response Types

### List Response
```typescript
interface IProductAdminListResponse {
  data: IProductAdminItem[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: IProductAdminFilters;
}
```

### Statistics Response
```typescript
interface IProductStatistics {
  // Overview
  totalProducts: number;
  publishedProducts: number;
  draftProducts: number;
  archivedProducts: number;
  
  // Inventory
  outOfStockProducts: number;
  lowStockProducts: number;
  
  // Features
  featuredProducts: number;
  onSaleProducts: number;
  
  // Financial
  totalValue: number;
  averagePrice: number;
  
  // Top performers
  topCategories: Array<{
    _id: string;
    name: string;
    count: number;
    percentage: number;
  }>;
  topBrands: Array<{
    _id: string;
    name: string;
    count: number;
    percentage: number;
  }>;
  topSellers: Array<{
    _id: string;
    storeName: string;
    count: number;
    percentage: number;
  }>;
  
  // Activity (if implemented)
  recentActivity?: Array<{
    type: string;
    productId: string;
    productName: string;
    timestamp: string;
    userId: string;
    userName: string;
  }>;
}
```

### Bulk Action Response
```typescript
interface IProductBulkActionResult {
  success: number;
  failed: number;
  errors: Array<{
    productId: string;
    error: string;
  }>;
}
```

---

## API Response Wrappers

### Success Response
```typescript
interface ApiSuccessResponse<T = any> {
  success: true;
  message: string;
  data: T;
}
```

### Error Response
```typescript
interface ApiErrorResponse {
  success: false;
  message: string;
  error?: {
    code: string;
    category: string;
    severity: string;
    timestamp: string;
  };
}
```

### Combined Response Type
```typescript
type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;
```

---

## Form Types for Frontend

### Product Form State
```typescript
interface ProductFormState {
  // Basic Information
  name: string;
  sku: string;
  description: string;
  shortDescription: string;
  
  // Categorization
  category: string;
  categories: string[];
  brand: string;
  seller: string;
  
  // Pricing
  basePrice: number;
  comparePrice: number;
  currency: string;
  costPrice: number;
  
  // Inventory
  stockQuantity: number;
  reorderLevel: number;
  trackQuantity: boolean;
  allowBackorders: boolean;
  
  // Product Settings
  status: ProductStatus;
  condition: ProductCondition;
  visibility: "public" | "private" | "hidden";
  isFeatured: boolean;
  isOnSale: boolean;
  isVirtual: boolean;
  isDownloadable: boolean;
  
  // Media
  images: Array<{
    url: string;
    alt: string;
    isPrimary: boolean;
    file?: File; // For new uploads
  }>;
  
  // Shipping
  weight: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  freeShipping: boolean;
  shippingCost: number;
  
  // SEO
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  
  // Others
  tags: string[];
  attributes: Record<string, string>;
}
```

### Form Validation Schema (Zod Example)
```typescript
import { z } from 'zod';

const ProductFormSchema = z.object({
  name: z.string().min(1, "Product name is required").max(255),
  sku: z.string().min(1, "SKU is required").max(100),
  description: z.string().optional(),
  shortDescription: z.string().max(500).optional(),
  category: z.string().min(1, "Category is required"),
  brand: z.string().min(1, "Brand is required"),
  seller: z.string().min(1, "Seller is required"),
  basePrice: z.number().min(0, "Price must be positive"),
  comparePrice: z.number().min(0).optional(),
  stockQuantity: z.number().int().min(0, "Stock must be non-negative"),
  status: z.enum(['published', 'draft', 'archived']),
  condition: z.enum(['new', 'used', 'refurbished']),
  isFeatured: z.boolean(),
  isOnSale: z.boolean(),
  tags: z.array(z.string()).optional(),
  images: z.array(z.object({
    url: z.string().url(),
    alt: z.string().optional(),
    isPrimary: z.boolean().optional()
  })).optional()
});

type ProductFormData = z.infer<typeof ProductFormSchema>;
```

---

## Utility Types

### Table Column Configuration
```typescript
interface ProductTableColumn {
  key: keyof IProductAdminItem | string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, item: IProductAdminItem) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}
```

### Filter Option Type
```typescript
interface FilterOption {
  value: string;
  label: string;
  count?: number;
}
```

### Pagination Info
```typescript
interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
  startIndex: number;
  endIndex: number;
}
```

---

## Constants

### Default Values
```typescript
export const PRODUCT_DEFAULTS = {
  PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  CURRENCY: 'USD',
  STATUS: ProductStatus.DRAFT,
  CONDITION: ProductCondition.NEW,
  SORT_BY: 'createdAt',
  SORT_ORDER: 'desc',
  TRACK_QUANTITY: true,
  ALLOW_BACKORDERS: false,
  REQUIRES_SHIPPING: true,
  FREE_SHIPPING: false,
  TAXABLE: true,
  VISIBILITY: 'public'
} as const;
```

### Filter Options
```typescript
export const FILTER_OPTIONS = {
  STATUS: [
    { value: 'all', label: 'All Statuses' },
    { value: 'published', label: 'Published' },
    { value: 'draft', label: 'Draft' },
    { value: 'archived', label: 'Archived' }
  ],
  CONDITION: [
    { value: 'all', label: 'All Conditions' },
    { value: 'new', label: 'New' },
    { value: 'used', label: 'Used' },
    { value: 'refurbished', label: 'Refurbished' }
  ],
  STOCK_STATUS: [
    { value: 'all', label: 'All Stock' },
    { value: 'in-stock', label: 'In Stock' },
    { value: 'out-of-stock', label: 'Out of Stock' },
    { value: 'low-stock', label: 'Low Stock' }
  ],
  FEATURED: [
    { value: 'all', label: 'All Products' },
    { value: 'featured', label: 'Featured' },
    { value: 'not-featured', label: 'Not Featured' }
  ],
  ON_SALE: [
    { value: 'all', label: 'All Products' },
    { value: 'on-sale', label: 'On Sale' },
    { value: 'not-on-sale', label: 'Not On Sale' }
  ]
} as const;
```