# MongoDB Shell Commands for Superadmin Permissions Setup

## Set All Permissions to True for Superadmin Role

```javascript
// Update all users with role 'superadmin' to have all permissions set to true
db.users.updateMany(
  { role: "superadmin" },
  {
    $set: {
      "permissions.brands.canCreate": true,
      "permissions.brands.canEdit": true,
      "permissions.brands.canDelete": true,
      "permissions.brands.canView": true,
      "permissions.brands.canArchive": true,
      "permissions.brands.canRestore": true,
      
      "permissions.categories.canCreate": true,
      "permissions.categories.canEdit": true,
      "permissions.categories.canDelete": true,
      "permissions.categories.canView": true,
      "permissions.categories.canArchive": true,
      "permissions.categories.canRestore": true,
      
      "permissions.products.canCreate": true,
      "permissions.products.canEdit": true,
      "permissions.products.canDelete": true,
      "permissions.products.canView": true,
      "permissions.products.canApprove": true,
      "permissions.products.canArchive": true,
      "permissions.products.canRestore": true,
      
      "permissions.users.canCreate": true,
      "permissions.users.canEdit": true,
      "permissions.users.canDelete": true,
      "permissions.users.canView": true,
      "permissions.users.canBan": true,
      "permissions.users.canArchive": true,
      "permissions.users.canRestore": true,
      
      "permissions.sellers.canCreate": true,
      "permissions.sellers.canEdit": true,
      "permissions.sellers.canDelete": true,
      "permissions.sellers.canView": true,
      "permissions.sellers.canApprove": true,
      "permissions.sellers.canSuspend": true,
      "permissions.sellers.canArchive": true,
      "permissions.sellers.canRestore": true,
      
      "permissions.orders.canView": true,
      "permissions.orders.canEdit": true,
      "permissions.orders.canCancel": true,
      "permissions.orders.canRefund": true,
      
      "permissions.admins.canCreate": true,
      "permissions.admins.canEdit": true,
      "permissions.admins.canDelete": true,
      "permissions.admins.canView": true,
      "permissions.admins.canManagePermissions": true,
      "permissions.admins.canArchive": true,
      "permissions.admins.canRestore": true,
      
      "permissions.reports.canView": true,
      "permissions.reports.canExport": true
    }
  }
);
```

## Alternative: Set Complete Permission Object for Superadmin

```javascript
// Alternative approach - replace entire permissions object
db.users.updateMany(
  { role: "superadmin" },
  {
    $set: {
      permissions: {
        brands: {
          canCreate: true,
          canEdit: true,
          canDelete: true,
          canView: true,
          canArchive: true,
          canRestore: true
        },
        categories: {
          canCreate: true,
          canEdit: true,
          canDelete: true,
          canView: true,
          canArchive: true,
          canRestore: true
        },
        products: {
          canCreate: true,
          canEdit: true,
          canDelete: true,
          canView: true,
          canApprove: true,
          canArchive: true,
          canRestore: true
        },
        users: {
          canCreate: true,
          canEdit: true,
          canDelete: true,
          canView: true,
          canBan: true,
          canArchive: true,
          canRestore: true
        },
        sellers: {
          canCreate: true,
          canEdit: true,
          canDelete: true,
          canView: true,
          canApprove: true,
          canSuspend: true,
          canArchive: true,
          canRestore: true
        },
        orders: {
          canView: true,
          canEdit: true,
          canCancel: true,
          canRefund: true
        },
        admins: {
          canCreate: true,
          canEdit: true,
          canDelete: true,
          canView: true,
          canManagePermissions: true,
          canArchive: true,
          canRestore: true
        },
        reports: {
          canView: true,
          canExport: true
        }
      }
    }
  }
);
```

## Verify Superadmin Permissions

```javascript
// Check if superadmin permissions are set correctly
db.users.find(
  { role: "superadmin" },
  { 
    email: 1,
    role: 1,
    permissions: 1
  }
).pretty();
```

## Create Default Admin with Category Permissions

```javascript
// Example: Create an admin with only category management permissions
db.users.insertOne({
  firstName: "Category",
  lastName: "Manager",
  email: "category.admin@example.com",
  password: "$2b$12$hashedPasswordHere", // Replace with actual hashed password
  role: "admin",
  isEmailVerified: true,
  isActive: true,
  permissions: {
    brands: {
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canView: false
    },
    categories: {
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canView: true
    },
    products: {
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canView: true,
      canApprove: false
    },
    users: {
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canView: false,
      canBan: false
    },
    orders: {
      canView: false,
      canEdit: false,
      canCancel: false,
      canRefund: false
    },
    admins: {
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canView: false,
      canManagePermissions: false
    },
    reports: {
      canView: false,
      canExport: false
    }
  },
  createdAt: new Date(),
  updatedAt: new Date()
});
```

## Grant Specific Category Permissions to Existing Admin

```javascript
// Grant category permissions to an existing admin by email
db.users.updateOne(
  { 
    email: "admin@example.com",
    role: "admin"
  },
  {
    $set: {
      "permissions.categories.canCreate": true,
      "permissions.categories.canEdit": true,
      "permissions.categories.canDelete": true,
      "permissions.categories.canView": true
    }
  }
);
```

## Remove Category Permissions from Admin

```javascript
// Remove category permissions from an admin
db.users.updateOne(
  { 
    email: "admin@example.com",
    role: "admin"
  },
  {
    $set: {
      "permissions.categories.canCreate": false,
      "permissions.categories.canEdit": false,
      "permissions.categories.canDelete": false,
      "permissions.categories.canView": false
    }
  }
);
```

## Find Admins with Category Permissions

```javascript
// Find all admins who can manage categories
db.users.find(
  {
    role: "admin",
    $or: [
      { "permissions.categories.canCreate": true },
      { "permissions.categories.canEdit": true },
      { "permissions.categories.canDelete": true },
      { "permissions.categories.canView": true }
    ]
  },
  {
    email: 1,
    firstName: 1,
    lastName: 1,
    "permissions.categories": 1
  }
).pretty();
```

## Usage Instructions

1. **Connect to MongoDB:**
   ```bash
   mongosh "mongodb://localhost:27017/your-database-name"
   ```

2. **Run the commands above** to set up permissions

3. **Verify the results** using the verification queries

## Notes

- Replace `"your-database-name"` with your actual database name
- Replace email addresses and passwords with actual values
- Always backup your database before running update operations
- The `superadmin` role automatically bypasses all permission checks in the middleware
- Regular `admin` users require specific permissions to access category management APIs