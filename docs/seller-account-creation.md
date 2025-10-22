# Seller Account Creation System

## Overview
The seller creation system automatically handles both User account creation and Seller profile setup to ensure proper authentication and role-based access.

## How It Works

### 1. Automatic User Account Creation
When an admin creates a seller without providing a `userId`, the system automatically:

- ✅ **Creates User Account**: With `role: "seller"`
- ✅ **Generates Username**: Based on store name + random number
- ✅ **Sets Temporary Password**: `"TempPassword123!"` (seller must change on first login)
- ✅ **Links Accounts**: User and Seller records are properly connected

### 2. Existing User Integration
If a `userId` is provided:

- ✅ **Validates User Exists**: Checks if user ID is valid
- ✅ **Updates Role**: Changes user role to "seller" if needed
- ✅ **Links Accounts**: Associates existing user with new seller profile

### 3. Email Conflict Handling
If email already exists:

- ✅ **Existing Non-Seller**: Updates role to "seller" and links accounts
- ❌ **Existing Seller**: Returns error (one seller account per email)

## API Usage

### Request Body
```json
{
  "storeName": "Amazing Electronics Store",
  "contactEmail": "store@amazing.com",
  "phoneNumber": "+1234567890",
  "storeDescription": "Best electronics in town",
  "firstName": "John",          // Optional: for user account
  "lastName": "Doe",            // Optional: for user account
  "userId": "507f1f77bcf..."    // Optional: use existing user
}
```

### Response Examples

#### New User Created
```json
{
  "success": true,
  "message": "Seller and user account created successfully",
  "data": {
    "seller": { /* seller object */ },
    "userId": "507f1f77bcf86cd799439011"
  },
  "userAccount": {
    "created": true,
    "userId": "507f1f77bcf86cd799439011",
    "tempPassword": true,
    "loginEmail": "store@amazing.com"
  }
}
```

#### Existing User Used
```json
{
  "success": true,
  "message": "Seller created successfully",
  "data": {
    "seller": { /* seller object */ },
    "userId": "507f1f77bcf86cd799439011"
  },
  "userAccount": {
    "created": false,
    "userId": "507f1f77bcf86cd799439011",
    "tempPassword": false,
    "loginEmail": "store@amazing.com"
  }
}
```

## Seller Login Process

### For Auto-Created Accounts
1. **Login**: Use contactEmail + temporary password
2. **Force Password Change**: System requires new password on first login
3. **Complete Profile**: Fill any missing user details

### For Existing Users
1. **Login**: Use existing credentials
2. **Access Seller Features**: Role automatically updated to "seller"

## Security Features

### Password Security
- ✅ **Temporary Passwords**: Auto-generated accounts use temporary passwords
- ✅ **Force Change**: `isTempPassword: true` requires password update
- ✅ **Strong Defaults**: Temporary passwords meet security requirements

### Role Management
- ✅ **Automatic Role Update**: Existing users get "seller" role
- ✅ **Permission Integration**: Seller role works with existing RBAC system
- ✅ **Single Account Constraint**: One seller account per user

### Data Integrity
- ✅ **Atomic Creation**: User and Seller created in transaction-like process
- ✅ **Rollback Handling**: Failed seller creation doesn't leave orphaned users
- ✅ **Unique Constraints**: Email and username uniqueness enforced

## Database Impact

### User Collection
```javascript
// New auto-created user document
{
  "_id": "507f1f77bcf86cd799439011",
  "username": "amazingelectronicsstore123",
  "email": "store@amazing.com",
  "firstName": "Amazing Electronics",
  "lastName": "Store",
  "role": "seller",
  "status": "active",
  "isTempPassword": true,
  "emailVerified": false,
  "password": "$2b$12$..." // Hashed TempPassword123!
}
```

### Seller Collection
```javascript
// Seller document linked to user
{
  "_id": "507f1f77bcf86cd799439012",
  "userId": "507f1f77bcf86cd799439011", // References user above
  "storeName": "Amazing Electronics Store",
  "contactEmail": "store@amazing.com",
  "status": "pending",
  // ... other seller fields
}
```

## Error Handling

### Common Errors
- **Email Already Used**: User with email already has seller account
- **Invalid User ID**: Provided userId doesn't exist
- **Store Name Taken**: Store name already exists
- **Validation Errors**: Missing required fields

### Error Responses
```json
{
  "success": false,
  "message": "User with this email already has a seller account",
  "field": "contactEmail",
  "code": "EMAIL_ALREADY_SELLER"
}
```

## Admin Workflow

### Creating New Seller
1. **Fill Seller Form**: Store details, contact info
2. **Submit Request**: API creates both accounts
3. **Notify Seller**: Send login credentials (email + temp password)
4. **Seller First Login**: Force password change
5. **Approve Seller**: Review and activate seller account

### Using Existing User
1. **Select User**: Choose from existing user list
2. **Create Seller Profile**: Add store-specific details
3. **Role Update**: User automatically becomes seller
4. **Notify User**: Inform about new seller capabilities

## Integration Points

### Authentication System
- ✅ **Login API**: Works with seller accounts
- ✅ **JWT Tokens**: Include seller role and permissions
- ✅ **Password Reset**: Standard flow applies to sellers

### Authorization System
- ✅ **Role Checks**: `role: "seller"` works in middleware
- ✅ **Permission System**: Sellers get appropriate permissions
- ✅ **Route Protection**: Seller-only routes work automatically

### Frontend Integration
- ✅ **Admin Panel**: Create seller form handles both scenarios
- ✅ **Seller Dashboard**: Login redirects to seller interface
- ✅ **User Management**: Existing users can become sellers

## Migration Considerations

### Existing Data
If you have existing sellers without user accounts:
1. **Identify Orphaned Sellers**: Sellers with invalid/missing userId
2. **Create Missing Users**: Run migration script to create user accounts
3. **Link Accounts**: Update seller records with new user IDs

### Migration Script Example
```typescript
const migrateOrphanedSellers = async () => {
  const orphanedSellers = await Seller.find({
    $or: [
      { userId: { $exists: false } },
      { userId: null }
    ]
  });

  for (const seller of orphanedSellers) {
    // Create user account for existing seller
    const userData = {
      email: seller.contactEmail,
      username: generateUsername(seller.storeName),
      firstName: seller.storeName.split(' ')[0],
      lastName: 'Store',
      role: 'seller',
      isTempPassword: true,
      password: 'TempPassword123!'
    };

    const newUser = await User.create(userData);
    seller.userId = newUser._id;
    await seller.save();
  }
};
```

---

**Status**: ✅ Implemented  
**Last Updated**: October 17, 2025  
**Next Steps**: Test seller creation and login flow