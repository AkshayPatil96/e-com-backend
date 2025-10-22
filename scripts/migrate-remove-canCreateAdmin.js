/**
 * Migration script to remove the deprecated canCreateAdmin field
 * and ensure all admins have proper permissions structure
 * 
 * Run this script after deploying the new code changes
 * 
 * Usage: node scripts/migrate-remove-canCreateAdmin.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

// Migration function
const migrateCanCreateAdmin = async () => {
  try {
    console.log('🚀 Starting migration: Remove canCreateAdmin field');

    // Find all admin users that have canCreateAdmin field
    const adminUsers = await mongoose.connection.db.collection('users').find({
      role: 'admin',
      canCreateAdmin: { $exists: true }
    }).toArray();

    console.log(`📊 Found ${adminUsers.length} admin users with canCreateAdmin field`);

    let migratedCount = 0;
    let updatedPermissionsCount = 0;

    for (const admin of adminUsers) {
      const updateData = {};
      let needsUpdate = false;

      // Remove the canCreateAdmin field
      updateData.$unset = { canCreateAdmin: "" };
      needsUpdate = true;

      // If admin had canCreateAdmin: true, update their permissions
      if (admin.canCreateAdmin === true) {
        // Ensure permissions structure exists
        const permissions = admin.permissions || {};
        
        // Ensure admins permission exists and set canCreate to true
        if (!permissions.admins) {
          permissions.admins = {
            canCreate: false,
            canEdit: false,
            canDelete: false,
            canView: false,
            canManagePermissions: false
          };
        }
        
        // Set canCreate to true since they had canCreateAdmin: true
        permissions.admins.canCreate = true;
        
        updateData.$set = { permissions };
        updatedPermissionsCount++;
        
        console.log(`  ↗️  Admin ${admin.email}: Migrated canCreateAdmin:true to permissions.admins.canCreate:true`);
      } else {
        console.log(`  ↗️  Admin ${admin.email}: Removed canCreateAdmin:false field`);
      }

      // Update the document
      if (needsUpdate) {
        await mongoose.connection.db.collection('users').updateOne(
          { _id: admin._id },
          updateData
        );
        migratedCount++;
      }
    }

    console.log(`✅ Migration completed successfully!`);
    console.log(`   📈 Total admins processed: ${adminUsers.length}`);
    console.log(`   🔄 Documents updated: ${migratedCount}`);
    console.log(`   🔐 Permissions updated: ${updatedPermissionsCount}`);

    // Verify the migration
    const remainingDocs = await mongoose.connection.db.collection('users').countDocuments({
      canCreateAdmin: { $exists: true }
    });

    if (remainingDocs === 0) {
      console.log('✅ Verification passed: No documents with canCreateAdmin field remain');
    } else {
      console.log(`⚠️  Warning: ${remainingDocs} documents still have canCreateAdmin field`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

// Main execution
const main = async () => {
  try {
    await connectDB();
    await migrateCanCreateAdmin();
    console.log('🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📴 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { migrateCanCreateAdmin };