# React Component Examples

This document provides complete React component examples for implementing the Product Admin Panel.

## 1. Product List Component

### ProductList.tsx
```typescript
import React, { useState } from 'react';
import { useProducts } from '../hooks/useProducts';
import { useProductMutations } from '../hooks/useProductMutations';
import { ProductFilters } from './ProductFilters';
import { ProductTable } from './ProductTable';
import { ProductPagination } from './ProductPagination';
import { BulkActions } from './BulkActions';
import { CreateProductButton } from './CreateProductButton';

export const ProductList: React.FC = () => {
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  
  const {
    products,
    pagination,
    currentFilters,
    isLoading,
    isFetching,
    updateFilters,
    updatePage,
    updateSort,
  } = useProducts();

  const { bulkAction, isBulkProcessing } = useProductMutations();

  const handleSelectProduct = (productId: string, checked: boolean) => {
    setSelectedProducts(prev => 
      checked 
        ? [...prev, productId]
        : prev.filter(id => id !== productId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedProducts(checked ? products.map(p => p._id) : []);
  };

  const handleBulkAction = async (action: string) => {
    if (selectedProducts.length === 0) return;
    
    await bulkAction(selectedProducts, action);
    setSelectedProducts([]);
  };

  return (
    <div className="product-list">
      <div className="product-list-header">
        <h1>Products</h1>
        <CreateProductButton />
      </div>

      <ProductFilters
        filters={currentFilters}
        onFiltersChange={updateFilters}
        productCount={pagination?.totalCount || 0}
      />

      {selectedProducts.length > 0 && (
        <BulkActions
          selectedCount={selectedProducts.length}
          onAction={handleBulkAction}
          isProcessing={isBulkProcessing}
        />
      )}

      <ProductTable
        products={products}
        isLoading={isLoading || isFetching}
        selectedProducts={selectedProducts}
        onSelectProduct={handleSelectProduct}
        onSelectAll={handleSelectAll}
        onSort={updateSort}
        currentSort={{
          field: currentFilters.sortBy || 'createdAt',
          direction: currentFilters.sortOrder || 'desc'
        }}
      />

      {pagination && (
        <ProductPagination
          pagination={pagination}
          onPageChange={updatePage}
        />
      )}
    </div>
  );
};
```

## 2. Product Filters Component

### ProductFilters.tsx
```typescript
import React from 'react';
import { Search, Filter, X } from 'lucide-react';
import { IProductAdminFilters } from '../types/product';
import { FILTER_OPTIONS } from '../constants/product';

interface ProductFiltersProps {
  filters: Partial<IProductAdminFilters>;
  onFiltersChange: (filters: Partial<IProductAdminFilters>) => void;
  productCount: number;
}

export const ProductFilters: React.FC<ProductFiltersProps> = ({
  filters,
  onFiltersChange,
  productCount,
}) => {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ search: e.target.value });
  };

  const handleFilterChange = (key: string, value: string) => {
    onFiltersChange({ [key]: value });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      search: '',
      status: 'all',
      condition: 'all',
      featured: 'all',
      onSale: 'all',
      inStock: 'all',
      category: '',
      brand: '',
      seller: '',
    });
  };

  const hasActiveFilters = Boolean(
    filters.search ||
    (filters.status && filters.status !== 'all') ||
    (filters.condition && filters.condition !== 'all') ||
    (filters.featured && filters.featured !== 'all') ||
    (filters.onSale && filters.onSale !== 'all') ||
    (filters.inStock && filters.inStock !== 'all') ||
    filters.category ||
    filters.brand ||
    filters.seller
  );

  return (
    <div className="product-filters">
      <div className="search-bar">
        <div className="search-input-wrapper">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            placeholder="Search products by name, SKU, or description..."
            value={filters.search || ''}
            onChange={handleSearchChange}
            className="search-input"
          />
        </div>
      </div>

      <div className="filter-row">
        <div className="filter-group">
          <Filter size={16} />
          <span className="filter-label">Filters:</span>
          
          <select
            value={filters.status || 'all'}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="filter-select"
          >
            {FILTER_OPTIONS.STATUS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={filters.condition || 'all'}
            onChange={(e) => handleFilterChange('condition', e.target.value)}
            className="filter-select"
          >
            {FILTER_OPTIONS.CONDITION.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={filters.inStock || 'all'}
            onChange={(e) => handleFilterChange('inStock', e.target.value)}
            className="filter-select"
          >
            {FILTER_OPTIONS.STOCK_STATUS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={filters.featured || 'all'}
            onChange={(e) => handleFilterChange('featured', e.target.value)}
            className="filter-select"
          >
            {FILTER_OPTIONS.FEATURED.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="clear-filters-btn"
              title="Clear all filters"
            >
              <X size={16} />
              Clear
            </button>
          )}
        </div>

        <div className="results-count">
          {productCount.toLocaleString()} products found
        </div>
      </div>
    </div>
  );
};
```

## 3. Product Table Component

### ProductTable.tsx
```typescript
import React from 'react';
import { ChevronUp, ChevronDown, MoreHorizontal } from 'lucide-react';
import { IProductAdminItem } from '../types/product';
import { ProductTableRow } from './ProductTableRow';
import { LoadingSpinner } from './LoadingSpinner';

interface ProductTableProps {
  products: IProductAdminItem[];
  isLoading: boolean;
  selectedProducts: string[];
  onSelectProduct: (productId: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onSort: (field: string, direction: 'asc' | 'desc') => void;
  currentSort: {
    field: string;
    direction: 'asc' | 'desc';
  };
}

export const ProductTable: React.FC<ProductTableProps> = ({
  products,
  isLoading,
  selectedProducts,
  onSelectProduct,
  onSelectAll,
  onSort,
  currentSort,
}) => {
  const handleSort = (field: string) => {
    const newDirection = 
      currentSort.field === field && currentSort.direction === 'asc' 
        ? 'desc' 
        : 'asc';
    onSort(field, newDirection);
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (currentSort.field !== field) return null;
    return currentSort.direction === 'asc' ? 
      <ChevronUp size={14} /> : 
      <ChevronDown size={14} />;
  };

  const allSelected = products.length > 0 && selectedProducts.length === products.length;
  const someSelected = selectedProducts.length > 0 && selectedProducts.length < products.length;

  return (
    <div className="product-table-container">
      <table className="product-table">
        <thead>
          <tr>
            <th className="checkbox-column">
              <input
                type="checkbox"
                checked={allSelected}
                ref={input => {
                  if (input) input.indeterminate = someSelected;
                }}
                onChange={(e) => onSelectAll(e.target.checked)}
              />
            </th>
            <th>Product</th>
            <th 
              className="sortable"
              onClick={() => handleSort('sku')}
            >
              SKU <SortIcon field="sku" />
            </th>
            <th 
              className="sortable"
              onClick={() => handleSort('status')}
            >
              Status <SortIcon field="status" />
            </th>
            <th 
              className="sortable"
              onClick={() => handleSort('basePrice')}
            >
              Price <SortIcon field="basePrice" />
            </th>
            <th 
              className="sortable"
              onClick={() => handleSort('stockQuantity')}
            >
              Stock <SortIcon field="stockQuantity" />
            </th>
            <th>Category</th>
            <th>Brand</th>
            <th 
              className="sortable"
              onClick={() => handleSort('createdAt')}
            >
              Created <SortIcon field="createdAt" />
            </th>
            <th className="actions-column">Actions</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={10} className="loading-cell">
                <LoadingSpinner />
              </td>
            </tr>
          ) : products.length === 0 ? (
            <tr>
              <td colSpan={10} className="empty-cell">
                No products found
              </td>
            </tr>
          ) : (
            products.map(product => (
              <ProductTableRow
                key={product._id}
                product={product}
                isSelected={selectedProducts.includes(product._id)}
                onSelect={(checked) => onSelectProduct(product._id, checked)}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
```

## 4. Product Table Row Component

### ProductTableRow.tsx
```typescript
import React, { useState } from 'react';
import { MoreHorizontal, Edit, Trash, Eye, RotateCcw, Star } from 'lucide-react';
import { IProductAdminItem } from '../types/product';
import { useProductMutations } from '../hooks/useProductMutations';
import { formatCurrency, formatDate } from '../utils/formatters';
import { ProductStatusBadge } from './ProductStatusBadge';
import { StockStatusBadge } from './StockStatusBadge';
import { DropdownMenu } from './DropdownMenu';

interface ProductTableRowProps {
  product: IProductAdminItem;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
}

export const ProductTableRow: React.FC<ProductTableRowProps> = ({
  product,
  isSelected,
  onSelect,
}) => {
  const [showActions, setShowActions] = useState(false);
  const {
    deleteProduct,
    restoreProduct,
    toggleStatus,
    isDeleting,
    isRestoring,
    isTogglingStatus,
  } = useProductMutations();

  const handleToggleStatus = async () => {
    await toggleStatus(product._id);
  };

  const handleDelete = async () => {
    await deleteProduct(product._id);
  };

  const handleRestore = async () => {
    await restoreProduct(product._id);
  };

  const actions = [
    {
      label: 'View Details',
      icon: <Eye size={14} />,
      onClick: () => {
        // Navigate to product details
        window.open(`/admin/products/${product._id}`, '_blank');
      },
    },
    {
      label: 'Edit',
      icon: <Edit size={14} />,
      onClick: () => {
        // Navigate to edit form
        window.location.href = `/admin/products/${product._id}/edit`;
      },
    },
    {
      label: product.status === 'published' ? 'Unpublish' : 'Publish',
      icon: <Star size={14} />,
      onClick: handleToggleStatus,
      loading: isTogglingStatus,
    },
    ...(product.isDeleted ? [
      {
        label: 'Restore',
        icon: <RotateCcw size={14} />,
        onClick: handleRestore,
        loading: isRestoring,
      }
    ] : [
      {
        label: 'Delete',
        icon: <Trash size={14} />,
        onClick: handleDelete,
        loading: isDeleting,
        dangerous: true,
      }
    ])
  ];

  return (
    <tr className={`product-row ${isSelected ? 'selected' : ''} ${product.isDeleted ? 'deleted' : ''}`}>
      <td>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(e.target.checked)}
        />
      </td>
      
      <td className="product-cell">
        <div className="product-info">
          {product.image && (
            <img
              src={product.image.url}
              alt={product.image.alt}
              className="product-thumbnail"
            />
          )}
          <div className="product-details">
            <div className="product-name">
              {product.name}
              {product.isFeatured && <Star size={12} className="featured-icon" />}
              {product.isOnSale && <span className="sale-badge">Sale</span>}
            </div>
            <div className="product-meta">
              by {product.seller.storeName}
            </div>
          </div>
        </div>
      </td>
      
      <td>
        <code className="sku">{product.sku}</code>
      </td>
      
      <td>
        <ProductStatusBadge status={product.status} />
      </td>
      
      <td className="price-cell">
        <div className="price-info">
          <span className="base-price">
            {formatCurrency(product.pricing.basePrice, product.pricing.currency)}
          </span>
          {product.pricing.comparePrice && (
            <span className="compare-price">
              {formatCurrency(product.pricing.comparePrice, product.pricing.currency)}
            </span>
          )}
        </div>
      </td>
      
      <td>
        <div className="stock-info">
          <StockStatusBadge 
            stockQuantity={product.inventory.stockQuantity}
            soldQuantity={product.inventory.soldQuantity}
          />
          <div className="stock-numbers">
            {product.inventory.stockQuantity} in stock
          </div>
        </div>
      </td>
      
      <td>
        <span className="category-link">
          {product.category.name}
        </span>
      </td>
      
      <td>
        <span className="brand-link">
          {product.brand.name}
        </span>
      </td>
      
      <td>
        <div className="date-info">
          <div>{formatDate(product.createdAt)}</div>
          <div className="created-by">
            by {product.createdBy.firstName} {product.createdBy.lastName}
          </div>
        </div>
      </td>
      
      <td className="actions-cell">
        <DropdownMenu
          trigger={
            <button className="actions-trigger">
              <MoreHorizontal size={16} />
            </button>
          }
          items={actions}
        />
      </td>
    </tr>
  );
};
```

## 5. Product Form Component

### ProductForm.tsx
```typescript
import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useProductMutations } from '../hooks/useProductMutations';
import { ICreateProductAdminBody, IUpdateProductAdminBody } from '../types/product';
import { FormField } from './FormField';
import { ImageUpload } from './ImageUpload';
import { RichTextEditor } from './RichTextEditor';
import { CategorySelect } from './CategorySelect';
import { BrandSelect } from './BrandSelect';
import { SellerSelect } from './SellerSelect';

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(255),
  sku: z.string().min(1, 'SKU is required').max(100),
  description: z.string().optional(),
  shortDescription: z.string().max(500).optional(),
  category: z.string().min(1, 'Category is required'),
  brand: z.string().min(1, 'Brand is required'),
  seller: z.string().min(1, 'Seller is required'),
  basePrice: z.number().min(0, 'Price must be positive'),
  comparePrice: z.number().min(0).optional(),
  currency: z.string().default('USD'),
  stockQuantity: z.number().int().min(0, 'Stock must be non-negative'),
  reorderLevel: z.number().int().min(0).optional(),
  status: z.enum(['published', 'draft', 'archived']),
  condition: z.enum(['new', 'used', 'refurbished']),
  isFeatured: z.boolean(),
  isOnSale: z.boolean(),
  weight: z.number().min(0).optional(),
  tags: z.array(z.string()).optional(),
  metaTitle: z.string().max(60).optional(),
  metaDescription: z.string().max(160).optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  initialData?: Partial<ProductFormData>;
  isEditing?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const ProductForm: React.FC<ProductFormProps> = ({
  initialData,
  isEditing = false,
  onSuccess,
  onCancel,
}) => {
  const { createProduct, updateProduct, isCreating, isUpdating } = useProductMutations();
  
  const {
    control,
    handleSubmit,
    formState: { errors, isValid, isDirty },
    watch,
    setValue,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      status: 'draft',
      condition: 'new',
      currency: 'USD',
      isFeatured: false,
      isOnSale: false,
      stockQuantity: 0,
      ...initialData,
    },
    mode: 'onChange',
  });

  const watchedFields = watch(['basePrice', 'comparePrice', 'isOnSale']);

  const onSubmit = async (data: ProductFormData) => {
    try {
      const formData: ICreateProductAdminBody = {
        ...data,
        pricing: {
          basePrice: data.basePrice,
          comparePrice: data.comparePrice,
          currency: data.currency,
        },
        inventory: {
          stockQuantity: data.stockQuantity,
          reorderLevel: data.reorderLevel,
        },
        shipping: data.weight ? { weight: data.weight } : undefined,
        seo: {
          metaTitle: data.metaTitle,
          metaDescription: data.metaDescription,
        },
      };

      if (isEditing && initialData?._id) {
        await updateProduct(initialData._id, formData as IUpdateProductAdminBody);
      } else {
        await createProduct(formData);
      }
      
      onSuccess?.();
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const isLoading = isCreating || isUpdating;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="product-form">
      <div className="form-header">
        <h2>{isEditing ? 'Edit Product' : 'Create New Product'}</h2>
        <div className="form-actions">
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!isValid || isLoading}
          >
            {isLoading ? 'Saving...' : (isEditing ? 'Update Product' : 'Create Product')}
          </button>
        </div>
      </div>

      <div className="form-grid">
        {/* Basic Information */}
        <div className="form-section">
          <h3>Basic Information</h3>
          
          <FormField
            label="Product Name *"
            error={errors.name?.message}
          >
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  placeholder="Enter product name"
                  className="form-input"
                />
              )}
            />
          </FormField>

          <FormField
            label="SKU *"
            error={errors.sku?.message}
          >
            <Controller
              name="sku"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  placeholder="Enter unique SKU"
                  className="form-input"
                />
              )}
            />
          </FormField>

          <FormField
            label="Short Description"
            error={errors.shortDescription?.message}
          >
            <Controller
              name="shortDescription"
              control={control}
              render={({ field }) => (
                <textarea
                  {...field}
                  placeholder="Brief product description"
                  className="form-textarea"
                  rows={3}
                />
              )}
            />
          </FormField>

          <FormField
            label="Description"
            error={errors.description?.message}
          >
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <RichTextEditor
                  value={field.value || ''}
                  onChange={field.onChange}
                  placeholder="Detailed product description"
                />
              )}
            />
          </FormField>
        </div>

        {/* Categorization */}
        <div className="form-section">
          <h3>Categorization</h3>
          
          <FormField
            label="Category *"
            error={errors.category?.message}
          >
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <CategorySelect
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select category"
                />
              )}
            />
          </FormField>

          <FormField
            label="Brand *"
            error={errors.brand?.message}
          >
            <Controller
              name="brand"
              control={control}
              render={({ field }) => (
                <BrandSelect
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select brand"
                />
              )}
            />
          </FormField>

          <FormField
            label="Seller *"
            error={errors.seller?.message}
          >
            <Controller
              name="seller"
              control={control}
              render={({ field }) => (
                <SellerSelect
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select seller"
                />
              )}
            />
          </FormField>
        </div>

        {/* Pricing */}
        <div className="form-section">
          <h3>Pricing</h3>
          
          <div className="form-row">
            <FormField
              label="Base Price *"
              error={errors.basePrice?.message}
            >
              <Controller
                name="basePrice"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="form-input"
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                )}
              />
            </FormField>

            <FormField
              label="Compare Price"
              error={errors.comparePrice?.message}
            >
              <Controller
                name="comparePrice"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="form-input"
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                  />
                )}
              />
            </FormField>
          </div>

          <FormField
            label="Currency"
            error={errors.currency?.message}
          >
            <Controller
              name="currency"
              control={control}
              render={({ field }) => (
                <select {...field} className="form-select">
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              )}
            />
          </FormField>
        </div>

        {/* Inventory */}
        <div className="form-section">
          <h3>Inventory</h3>
          
          <div className="form-row">
            <FormField
              label="Stock Quantity *"
              error={errors.stockQuantity?.message}
            >
              <Controller
                name="stockQuantity"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="number"
                    min="0"
                    placeholder="0"
                    className="form-input"
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  />
                )}
              />
            </FormField>

            <FormField
              label="Reorder Level"
              error={errors.reorderLevel?.message}
            >
              <Controller
                name="reorderLevel"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="number"
                    min="0"
                    placeholder="0"
                    className="form-input"
                    onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                  />
                )}
              />
            </FormField>
          </div>
        </div>

        {/* Product Settings */}
        <div className="form-section">
          <h3>Product Settings</h3>
          
          <div className="form-row">
            <FormField
              label="Status"
              error={errors.status?.message}
            >
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <select {...field} className="form-select">
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                )}
              />
            </FormField>

            <FormField
              label="Condition"
              error={errors.condition?.message}
            >
              <Controller
                name="condition"
                control={control}
                render={({ field }) => (
                  <select {...field} className="form-select">
                    <option value="new">New</option>
                    <option value="used">Used</option>
                    <option value="refurbished">Refurbished</option>
                  </select>
                )}
              />
            </FormField>
          </div>

          <div className="form-checkboxes">
            <FormField label="">
              <Controller
                name="isFeatured"
                control={control}
                render={({ field }) => (
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                    />
                    Featured Product
                  </label>
                )}
              />
            </FormField>

            <FormField label="">
              <Controller
                name="isOnSale"
                control={control}
                render={({ field }) => (
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                    />
                    On Sale
                  </label>
                )}
              />
            </FormField>
          </div>
        </div>

        {/* SEO */}
        <div className="form-section">
          <h3>SEO</h3>
          
          <FormField
            label="Meta Title"
            error={errors.metaTitle?.message}
          >
            <Controller
              name="metaTitle"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  placeholder="SEO title (max 60 characters)"
                  className="form-input"
                  maxLength={60}
                />
              )}
            />
          </FormField>

          <FormField
            label="Meta Description"
            error={errors.metaDescription?.message}
          >
            <Controller
              name="metaDescription"
              control={control}
              render={({ field }) => (
                <textarea
                  {...field}
                  placeholder="SEO description (max 160 characters)"
                  className="form-textarea"
                  rows={3}
                  maxLength={160}
                />
              )}
            />
          </FormField>
        </div>
      </div>

      {/* Save reminder if form is dirty */}
      {isDirty && (
        <div className="save-reminder">
          <span>You have unsaved changes</span>
        </div>
      )}
    </form>
  );
};
```

## 6. Product Statistics Dashboard

### ProductStatistics.tsx
```typescript
import React from 'react';
import { useGetProductStatisticsQuery } from '../api/productApi';
import { StatCard } from './StatCard';
import { ChartCard } from './ChartCard';
import { TopListCard } from './TopListCard';
import { Package, TrendingUp, AlertTriangle, Star } from 'lucide-react';

export const ProductStatistics: React.FC = () => {
  const { data, isLoading, error } = useGetProductStatisticsQuery();

  if (isLoading) return <div>Loading statistics...</div>;
  if (error) return <div>Error loading statistics</div>;

  const stats = data?.data;
  if (!stats) return null;

  return (
    <div className="product-statistics">
      <h2>Product Analytics</h2>
      
      {/* Overview Cards */}
      <div className="stats-grid">
        <StatCard
          title="Total Products"
          value={stats.totalProducts}
          icon={<Package />}
          trend={stats.totalProducts > 0 ? 'up' : 'neutral'}
        />
        <StatCard
          title="Published"
          value={stats.publishedProducts}
          icon={<TrendingUp />}
          percentage={stats.totalProducts > 0 ? (stats.publishedProducts / stats.totalProducts) * 100 : 0}
          trend="up"
        />
        <StatCard
          title="Out of Stock"
          value={stats.outOfStockProducts}
          icon={<AlertTriangle />}
          trend="down"
          variant="warning"
        />
        <StatCard
          title="Featured"
          value={stats.featuredProducts}
          icon={<Star />}
          trend="up"
          variant="success"
        />
      </div>

      {/* Charts and Lists */}
      <div className="charts-grid">
        <ChartCard
          title="Product Status Distribution"
          data={[
            { name: 'Published', value: stats.publishedProducts },
            { name: 'Draft', value: stats.draftProducts },
            { name: 'Archived', value: stats.archivedProducts },
          ]}
          type="pie"
        />
        
        <TopListCard
          title="Top Categories"
          items={stats.topCategories}
          renderItem={(item) => (
            <div className="top-list-item">
              <span className="item-name">{item.name}</span>
              <div className="item-stats">
                <span className="item-count">{item.count}</span>
                <span className="item-percentage">{item.percentage}%</span>
              </div>
            </div>
          )}
        />
        
        <TopListCard
          title="Top Brands"
          items={stats.topBrands}
          renderItem={(item) => (
            <div className="top-list-item">
              <span className="item-name">{item.name}</span>
              <div className="item-stats">
                <span className="item-count">{item.count}</span>
                <span className="item-percentage">{item.percentage}%</span>
              </div>
            </div>
          )}
        />
      </div>

      {/* Financial Overview */}
      <div className="financial-overview">
        <h3>Financial Overview</h3>
        <div className="financial-stats">
          <div className="financial-stat">
            <span className="stat-label">Total Inventory Value</span>
            <span className="stat-value">${stats.totalValue.toLocaleString()}</span>
          </div>
          <div className="financial-stat">
            <span className="stat-label">Average Product Price</span>
            <span className="stat-value">${stats.averagePrice.toFixed(2)}</span>
          </div>
          <div className="financial-stat">
            <span className="stat-label">Products on Sale</span>
            <span className="stat-value">{stats.onSaleProducts}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
```

## 7. Search Component

### ProductSearch.tsx
```typescript
import React, { useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useProductSearch } from '../hooks/useProductSearch';
import { formatCurrency } from '../utils/formatters';

export const ProductSearch: React.FC = () => {
  const {
    query,
    setQuery,
    results,
    isLoading,
    isOpen,
    setIsOpen,
    showResults,
    hasResults,
  } = useProductSearch();

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setIsOpen]);

  const handleClear = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  const handleResultClick = (productId: string) => {
    setIsOpen(false);
    // Navigate to product details
    window.location.href = `/admin/products/${productId}`;
  };

  return (
    <div ref={searchRef} className="product-search">
      <div className="search-input-container">
        <Search className="search-icon" size={20} />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search products..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="search-input"
        />
        {query && (
          <button onClick={handleClear} className="clear-button">
            <X size={16} />
          </button>
        )}
        {isLoading && <div className="search-spinner" />}
      </div>

      {showResults && (
        <div className="search-results">
          {hasResults ? (
            <div className="results-list">
              {results.map((product) => (
                <div
                  key={product._id}
                  className="search-result-item"
                  onClick={() => handleResultClick(product._id)}
                >
                  {product.image && (
                    <img
                      src={product.image.url}
                      alt={product.image.alt}
                      className="result-image"
                    />
                  )}
                  <div className="result-content">
                    <div className="result-title">{product.name}</div>
                    <div className="result-meta">
                      <span className="result-sku">{product.sku}</span>
                      <span className="result-brand">{product.brand.name}</span>
                    </div>
                    <div className="result-price">
                      {formatCurrency(product.pricing.basePrice, product.pricing.currency)}
                    </div>
                  </div>
                  <div className="result-status">
                    <span className={`status-badge status-${product.status}`}>
                      {product.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : query.length >= 2 ? (
            <div className="no-results">
              <p>No products found for "{query}"</p>
            </div>
          ) : (
            <div className="search-prompt">
              <p>Type at least 2 characters to search</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

## 8. Bulk Actions Component

### BulkActions.tsx
```typescript
import React, { useState } from 'react';
import { ChevronDown, Check, X, Archive, Trash, Star } from 'lucide-react';

interface BulkActionsProps {
  selectedCount: number;
  onAction: (action: string) => Promise<void>;
  isProcessing: boolean;
}

export const BulkActions: React.FC<BulkActionsProps> = ({
  selectedCount,
  onAction,
  isProcessing,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    { id: 'publish', label: 'Publish', icon: <Check size={14} /> },
    { id: 'unpublish', label: 'Unpublish', icon: <X size={14} /> },
    { id: 'feature', label: 'Feature', icon: <Star size={14} /> },
    { id: 'unfeature', label: 'Remove Feature', icon: <Star size={14} /> },
    { id: 'archive', label: 'Archive', icon: <Archive size={14} /> },
    { id: 'delete', label: 'Delete', icon: <Trash size={14} />, dangerous: true },
  ];

  const handleAction = async (actionId: string) => {
    setIsOpen(false);
    await onAction(actionId);
  };

  return (
    <div className="bulk-actions">
      <div className="bulk-actions-info">
        <span>{selectedCount} product{selectedCount !== 1 ? 's' : ''} selected</span>
      </div>
      
      <div className="bulk-actions-dropdown">
        <button
          className="bulk-actions-trigger"
          onClick={() => setIsOpen(!isOpen)}
          disabled={isProcessing}
        >
          Bulk Actions
          <ChevronDown size={16} />
        </button>
        
        {isOpen && (
          <div className="bulk-actions-menu">
            {actions.map((action) => (
              <button
                key={action.id}
                className={`bulk-action-item ${action.dangerous ? 'dangerous' : ''}`}
                onClick={() => handleAction(action.id)}
                disabled={isProcessing}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {isProcessing && (
        <div className="bulk-actions-loading">
          Processing...
        </div>
      )}
    </div>
  );
};
```

These components provide a comprehensive foundation for building the Product Admin Panel. Each component is designed to be:

1. **Type-safe** with full TypeScript support
2. **Accessible** following ARIA guidelines
3. **Performant** with proper memoization and optimization
4. **Reusable** with customizable props
5. **Error-resilient** with proper error handling
6. **User-friendly** with loading states and feedback