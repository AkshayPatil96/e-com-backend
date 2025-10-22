# Admin Routes Structure Documentation

## Overview

The admin routes have been restructured for better organization and maintainability. All admin-related APIs are now properly organized under the `/api/v1/admin` prefix with logical groupings.

## New Route Structure

```
/api/v1/admin/
├── admin-user/          # Admin user management
├── categories/          # Category management
├── brands/             # Brand management
└── products/           # Product management
```

## File Organization

### Admin Route Files

```
src/v1/routes/admin/
├── index.ts                    # Main admin router - mounts all sub-routes
├── admin-user.routes.ts        # Admin user management APIs
├── category.routes.ts          # Category management APIs
├── brand.routes.ts            # Brand management APIs  
└── product.routes.ts          # Product management APIs
```

### Main Router Integration

- **`src/v1/routes/admin.routes.ts`**: Simplified main admin router that imports and mounts all admin routes from `admin/index.ts`
- **`src/v1/index.ts`**: Updated to remove old category route import and properly mount admin routes

## API Endpoints

### Admin User Management: `/api/v1/admin/admin-user`

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/all` | List all admins with filters | Superadmin, Admin with canViewAdmin |
| GET | `/:adminId/permissions` | Get admin permissions | Superadmin, Self |
| PUT | `/:adminId/permissions` | Update admin permissions | Superadmin only |
| POST | `/create` | Create new admin | Superadmin only |
| POST | `/:adminId/grant-permission` | Grant permission | Superadmin only |
| POST | `/:adminId/revoke-permission` | Revoke permission | Superadmin only |
| PUT | `/:adminId/details` | Update admin details | Superadmin, Admin with canEditAdmin |
| DELETE | `/:adminId/archive` | Soft delete admin | Admin with canDeleteAdmin |
| PUT | `/:adminId/restore` | Restore archived admin | Admin with canDeleteAdmin |
| DELETE | `/:adminId/permanent` | Permanently delete admin | Superadmin only |

### Category Management: `/api/v1/admin/categories`

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/` | List categories with filters | Admin with canViewCategory |
| GET | `/statistics` | Category statistics | Admin with canViewCategory |
| GET | `/hierarchy` | Category hierarchy tree | Admin with canViewCategory |
| GET | `/:id` | Get specific category | Admin with canViewCategory |
| POST | `/` | Create new category | Admin with canCreateCategory |
| PUT | `/:id` | Update category | Admin with canEditCategory |
| DELETE | `/:id` | Soft delete category | Admin with canDeleteCategory |
| PUT | `/:id/restore` | Restore category | Admin with canDeleteCategory |
| PUT | `/:id/toggle-status` | Toggle active status | Admin with canEditCategory |
| PUT | `/:id/move` | Move category/reorder | Admin with canEditCategory |
| POST | `/bulk-action` | Bulk operations | Admin with canEditCategory |

### Brand Management: `/api/v1/admin/brands`

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/` | List brands | Admin with canViewBrand |
| GET | `/:slug` | Get brand by slug | Admin with canViewBrand |
| POST | `/` | Create new brand | Admin with canCreateBrand |
| PUT | `/:id` | Update brand | Admin with canEditBrand |
| DELETE | `/soft-delete/:id` | Soft delete brand | Admin with canDeleteBrand |
| PUT | `/restore/:id` | Restore brand | Admin with canDeleteBrand |
| DELETE | `/:id` | Permanently delete brand | Admin with canDeleteBrand |

### Product Management: `/api/v1/admin/products`

| Method | Endpoint | Description | Access | Status |
|--------|----------|-------------|---------|---------|
| POST | `/` | Create product | Admin with canCreateProduct | ✅ Active |
| PUT | `/:id` | Update product | Admin with canEditProduct | ✅ Active |
| GET | `/` | List products | Admin with canViewProduct | 🚧 TODO |
| GET | `/:id` | Get product | Admin with canViewProduct | 🚧 TODO |
| PUT | `/:id/approve` | Approve product | Admin with canApproveProduct | 🚧 TODO |
| DELETE | `/:id` | Delete product | Admin with canDeleteProduct | 🚧 TODO |
| PUT | `/:id/restore` | Restore product | Admin with canDeleteProduct | 🚧 TODO |

## Authentication & Authorization

### Required Middleware

All admin routes require:
1. **Authentication**: `isAuthenticated` middleware
2. **Role Authorization**: `authorizeRoles("admin", "superadmin")`  
3. **Permission Check**: Specific permission middleware (e.g., `canViewCategory`)

### Permission System

The permission system provides granular access control:

```typescript
// Example permissions for categories
canViewCategory     // View category list and details
canCreateCategory   // Create new categories
canEditCategory     // Update existing categories  
canDeleteCategory   // Delete/restore categories
```

### Superadmin Privileges

- **Superadmin** role bypasses ALL permission checks
- Has access to all admin endpoints
- Can manage admin permissions and perform destructive operations

## Rate Limiting

Rate limiting is configured but currently commented out for development:

```typescript
// RateLimiter.apiLimiter(200, 60 * 60 * 1000)  // 200 requests per hour
// RateLimiter.authLimiter(50, 60 * 60 * 1000)  // 50 auth operations per hour
```

To enable, uncomment the middleware in respective route files.

## Example Usage

### Admin User Management
```bash
GET /api/v1/admin/admin-user/all?page=1&limit=10&search=john
POST /api/v1/admin/admin-user/create
PUT /api/v1/admin/admin-user/123/permissions
```

### Category Management
```bash
GET /api/v1/admin/categories?status=active&featured=true
POST /api/v1/admin/categories
PUT /api/v1/admin/categories/abc123/toggle-status
```

### Brand Management
```bash
GET /api/v1/admin/brands
POST /api/v1/admin/brands
DELETE /api/v1/admin/brands/soft-delete/xyz789
```

## Migration Notes

### Route Changes
- **Old**: `/api/v1/admin/all` → **New**: `/api/v1/admin/admin-user/all`
- **Old**: Direct category routes → **New**: All under `/api/v1/admin/categories`
- **Old**: Mixed brand routes → **New**: All under `/api/v1/admin/brands`

### Benefits of New Structure
1. **Logical Grouping**: Related APIs are grouped together
2. **Clear Separation**: Admin vs public APIs are clearly separated
3. **Scalability**: Easy to add new admin resource management
4. **Maintainability**: Each resource has its own route file
5. **Permission Consistency**: Uniform permission handling across all admin APIs

## Future Enhancements

Planned admin route additions:
- `/api/v1/admin/users` - User management
- `/api/v1/admin/sellers` - Seller management  
- `/api/v1/admin/orders` - Order management
- `/api/v1/admin/reports` - Analytics and reports
- `/api/v1/admin/settings` - System settings