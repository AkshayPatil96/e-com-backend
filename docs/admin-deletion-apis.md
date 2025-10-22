# Admin Deletion APIs Documentation

This document describes the three admin deletion APIs: soft delete (archive), restore, and permanent delete.

## Overview

The admin deletion system provides three levels of admin account management:

1. **Soft Delete (Archive)** - Reversible deletion that marks admin as deleted but keeps data
2. **Restore** - Recovers archived admin accounts
3. **Permanent Delete** - Irreversible complete removal from database

## API Endpoints

### 1. Soft Delete (Archive) Admin

**Endpoint:** `DELETE /api/v1/admin/:adminId/archive`

**Description:** Soft deletes an admin account by marking it as archived. The account data is preserved and can be restored later.

**Access:** Admin with `admins.canDelete` permission or Superadmin

**Parameters:**
- `adminId` (path parameter): MongoDB ObjectId of the admin to archive

**Request Example:**
```bash
DELETE /api/v1/admin/507f1f77bcf86cd799439011/archive
Authorization: Bearer <token>
```

**Response Example:**
```json
{
  "success": true,
  "message": "Admin account archived successfully",
  "data": {
    "adminId": "507f1f77bcf86cd799439011",
    "email": "admin@example.com",
    "fullName": "John Doe",
    "archivedAt": "2025-09-27T10:30:00.000Z",
    "isDeleted": true
  }
}
```

**Restrictions:**
- Admins cannot archive themselves
- Only admins with proper permissions can archive others

### 2. Restore Admin

**Endpoint:** `PUT /api/v1/admin/:adminId/restore`

**Description:** Restores a previously archived admin account, making it active again.

**Access:** Admin with `admins.canDelete` permission or Superadmin

**Parameters:**
- `adminId` (path parameter): MongoDB ObjectId of the admin to restore

**Request Example:**
```bash
PUT /api/v1/admin/507f1f77bcf86cd799439011/restore
Authorization: Bearer <token>
```

**Response Example:**
```json
{
  "success": true,
  "message": "Admin account restored successfully",
  "data": {
    "adminId": "507f1f77bcf86cd799439011",
    "email": "admin@example.com",
    "fullName": "John Doe",
    "restoredAt": "2025-09-27T10:35:00.000Z",
    "isDeleted": false,
    "status": "active"
  }
}
```

### 3. Permanent Delete Admin

**Endpoint:** `DELETE /api/v1/admin/:adminId/permanent`

**Description:** Permanently deletes an admin account from the database. This action is irreversible and requires explicit confirmation.

**Access:** Superadmin only

**Parameters:**
- `adminId` (path parameter): MongoDB ObjectId of the admin to permanently delete

**Request Body:**
```json
{
  "confirmDelete": "PERMANENTLY_DELETE"
}
```

**Request Example:**
```bash
DELETE /api/v1/admin/507f1f77bcf86cd799439011/permanent
Authorization: Bearer <token>
Content-Type: application/json

{
  "confirmDelete": "PERMANENTLY_DELETE"
}
```

**Response Example:**
```json
{
  "success": true,
  "message": "Admin account permanently deleted successfully",
  "data": {
    "deletedAdminId": "507f1f77bcf86cd799439011",
    "deletedAt": "2025-09-27T10:40:00.000Z",
    "warning": "This action is irreversible"
  }
}
```

**Restrictions:**
- Only superadmins can permanently delete accounts
- Superadmins cannot delete themselves
- Requires explicit confirmation with `confirmDelete: "PERMANENTLY_DELETE"`
- This action is logged as a critical security event

## Permission Requirements

### For Archive and Restore:
```json
{
  "admins": {
    "canDelete": true
  }
}
```

### For Permanent Delete:
- Must be superadmin (role: "superadmin")
- No additional permissions required beyond superadmin role

## Security Features

### Logging
- All deletion attempts are logged with appropriate severity levels
- Archive/restore operations: Business logs
- Permanent deletions: Critical security logs
- Failed attempts are logged as security events

### Rate Limiting
- Archive: 20 operations per hour
- Restore: 20 operations per hour  
- Permanent Delete: 5 operations per hour

### Protection Mechanisms
- Self-deletion prevention
- Explicit confirmation required for permanent deletion
- Role-based access control
- Comprehensive audit trail

## Error Responses

### Common Error Codes:

**404 Not Found:**
```json
{
  "success": false,
  "message": "Admin not found"
}
```

**403 Forbidden - Insufficient Permissions:**
```json
{
  "success": false,
  "message": "You don't have permission to delete admin accounts"
}
```

**403 Forbidden - Self-deletion:**
```json
{
  "success": false,
  "message": "You cannot archive your own account"
}
```

**400 Bad Request - Missing Confirmation:**
```json
{
  "success": false,
  "message": "Permanent deletion requires explicit confirmation",
  "details": {
    "field": "confirmDelete",
    "expectedValue": "PERMANENTLY_DELETE",
    "code": "CONFIRMATION_REQUIRED"
  }
}
```

## Best Practices

1. **Use Soft Delete First:** Always try archiving before permanent deletion
2. **Audit Trail:** Keep logs of all deletion operations for compliance
3. **Confirmation Process:** Implement additional UI confirmations for permanent deletions
4. **Backup Strategy:** Ensure database backups before permanent deletions
5. **Access Control:** Regularly review and audit admin deletion permissions

## Integration Examples

### JavaScript/Node.js
```javascript
// Archive admin
const archiveAdmin = async (adminId) => {
  try {
    const response = await fetch(`/api/v1/admin/${adminId}/archive`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });
    return await response.json();
  } catch (error) {
    console.error('Archive failed:', error);
  }
};

// Restore admin
const restoreAdmin = async (adminId) => {
  try {
    const response = await fetch(`/api/v1/admin/${adminId}/restore`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });
    return await response.json();
  } catch (error) {
    console.error('Restore failed:', error);
  }
};

// Permanent delete (superadmin only)
const permanentlyDeleteAdmin = async (adminId) => {
  try {
    const response = await fetch(`/api/v1/admin/${adminId}/permanent`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        confirmDelete: 'PERMANENTLY_DELETE'
      })
    });
    return await response.json();
  } catch (error) {
    console.error('Permanent delete failed:', error);
  }
};
```

## Database Impact

### Archive Operation:
- Sets `isDeleted: true` on the admin document
- Data remains in database
- Cached data is invalidated

### Restore Operation:
- Sets `isDeleted: false` on the admin document  
- Reactivates the admin account
- Cached data is invalidated

### Permanent Delete:
- Completely removes document from database
- Cannot be undone
- All references to the admin will become invalid
- Cached data is invalidated