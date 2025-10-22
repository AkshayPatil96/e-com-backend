# AWS S3 Setup Documentation

## 📁 **Complete AWS S3 Integration for E-commerce Platform**

This documentation covers the comprehensive AWS S3 setup for file uploads, image processing, and storage management in your e-commerce platform.

## 🎯 **Features**

### ✅ **Core Features**
- **File Upload**: Direct uploads to S3 with validation
- **Image Processing**: Automatic resizing, format conversion, and optimization
- **Multiple Upload Types**: Single files, multiple files, base64, URL imports
- **File Management**: Copy, move, delete operations
- **Presigned URLs**: Secure direct uploads and downloads
- **Bulk Operations**: Batch upload and delete operations
- **Cache Management**: Automatic cache headers and invalidation
- **Error Handling**: Comprehensive error handling and logging

### 🚀 **Advanced Features**
- **Image Optimization**: WebP conversion, compression, resizing
- **Folder Organization**: Structured storage by content type
- **Usage Analytics**: Storage usage and statistics
- **Cleanup Utilities**: Automatic temp file cleanup
- **Validation**: File type, size, and dimension validation
- **Middleware Integration**: Ready-to-use Express middleware

## 📂 **File Structure**

```
src/
├── config/aws/
│   └── s3.config.ts          # S3 client configuration
├── services/aws/
│   └── s3-upload.service.ts  # Core S3 service
├── middleware/
│   └── s3-upload.middleware.ts # Upload middleware
├── utils/
│   └── s3.utils.ts           # Utility functions
├── @types/
│   └── s3.type.ts            # TypeScript interfaces
└── config/
    └── index.ts              # Environment configuration
```

## ⚙️ **Setup Instructions**

### 1. **AWS Account Setup**

1. Create an AWS account at [aws.amazon.com](https://aws.amazon.com)
2. Access the AWS Management Console

### 2. **Create S3 Bucket**

```bash
# Using AWS CLI (optional)
aws s3 mb s3://your-ecommerce-bucket-name --region us-east-1
```

**Or via AWS Console:**
1. Go to S3 service
2. Click "Create bucket"
3. Choose a unique bucket name
4. Select your preferred region
5. Configure settings as needed
6. Create bucket

### 3. **Create IAM User**

1. Go to IAM service
2. Click "Users" → "Add user"
3. Choose username (e.g., `ecommerce-s3-user`)
4. Select "Access key - Programmatic access"
5. Attach policy (see permissions below)
6. Save the Access Key ID and Secret Access Key

### 4. **Required IAM Permissions**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:GetObjectAcl",
        "s3:PutObjectAcl",
        "s3:PutObjectTagging",
        "s3:GetObjectTagging"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name",
        "arn:aws:s3:::your-bucket-name/*"
      ]
    }
  ]
}
```

### 5. **S3 Bucket Configuration**

**Bucket Policy (for public read access):**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

**CORS Configuration:**
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "POST", "PUT", "DELETE", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

### 6. **Environment Variables**

Add to your `.env` file:

```env
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-bucket-name
AWS_CLOUDFRONT_URL=https://your-cloudfront-url.net  # Optional
```

## 🚀 **Usage Examples**

### **1. Using Pre-configured Middleware**

```typescript
import express from 'express';
import { brandLogoUpload, productImagesUpload } from '../middleware/s3-upload.middleware';

const router = express.Router();

// Single brand logo upload
router.post('/brands/:id/logo', brandLogoUpload, (req, res) => {
  const uploadedFile = req.file;
  res.json({
    success: true,
    url: uploadedFile.location,
    key: uploadedFile.key
  });
});

// Multiple product images
router.post('/products/:id/images', productImagesUpload, (req, res) => {
  const uploadedFiles = req.files;
  res.json({
    success: true,
    files: uploadedFiles.map(file => ({
      url: file.location,
      key: file.key
    }))
  });
});
```

### **2. Using S3 Service Directly**

```typescript
import { s3UploadService } from '../services/aws/s3-upload.service';

// Upload file from buffer
const uploadFile = async (fileBuffer: Buffer, filename: string) => {
  const result = await s3UploadService.uploadFile(
    {
      file: fileBuffer,
      filename,
      mimetype: 'image/jpeg',
      size: fileBuffer.length
    },
    {
      folder: 'products',
      subFolder: 'images',
      processImage: true,
      imageConfig: {
        width: 800,
        height: 800,
        quality: 90,
        format: 'webp'
      }
    }
  );

  if (result.success) {
    console.log('Upload successful:', result.data.url);
  } else {
    console.error('Upload failed:', result.error);
  }
};
```

### **3. Using Utility Functions**

```typescript
import { s3Utils } from '../utils/s3.utils';

// Upload from URL
const uploadFromUrl = async () => {
  const result = await s3Utils.uploadFileFromUrl(
    'https://example.com/image.jpg',
    'brands',
    'logo.jpg',
    {
      subFolder: 'logos',
      processImage: true,
      imageConfig: { width: 300, height: 300, format: 'webp' }
    }
  );
  
  return result;
};

// Upload base64 image
const uploadBase64 = async (base64Data: string) => {
  const result = await s3Utils.uploadBase64File(
    base64Data,
    'avatar.png',
    'users',
    { subFolder: 'avatars', processImage: true }
  );
  
  return result;
};

// Generate presigned URL for direct upload
const getUploadUrl = async (key: string) => {
  const result = await s3Utils.generateUploadUrl(key, 3600); // 1 hour expiry
  return result.data?.url;
};

// Check if file exists
const checkFileExists = async (url: string) => {
  const exists = await s3Utils.fileExists(url);
  return exists;
};

// Delete multiple files
const deleteFiles = async (urls: string[]) => {
  const result = await s3Utils.deleteFiles(urls);
  return result;
};
```

### **4. Custom Middleware Configuration**

```typescript
import { createS3UploadMiddleware } from '../middleware/s3-upload.middleware';

// Custom middleware for documents
const documentUploadMiddleware = createS3UploadMiddleware({
  folder: 'documents',
  subFolder: 'contracts',
  processImage: false,
  fieldConfig: { 
    multiple: { name: 'documents', maxCount: 5 } 
  },
  fileValidation: {
    maxSize: 20 * 1024 * 1024, // 20MB
    allowedTypes: ['application/pdf', 'application/msword'],
  },
});

router.post('/upload-documents', documentUploadMiddleware, (req, res) => {
  // Handle uploaded documents
});
```

## 📋 **S3 Folder Structure**

The system automatically organizes files into structured folders:

```
your-bucket/
├── brands/
│   ├── logos/
│   └── banners/
├── categories/
│   └── images/
├── products/
│   ├── images/
│   └── thumbnails/
├── users/
│   └── avatars/
├── documents/
│   ├── contracts/
│   └── policies/
└── temp/
    └── uploads/
```

## 🎨 **Image Processing**

Automatic image processing with the following optimizations:

### **Default Processing Settings**

```typescript
const imageConfigs = {
  BRAND_LOGO: { width: 300, height: 300, quality: 90, format: 'webp' },
  BRAND_BANNER: { width: 1200, height: 400, quality: 85, format: 'webp' },
  PRODUCT_MAIN: { width: 800, height: 800, quality: 90, format: 'webp' },
  PRODUCT_THUMBNAIL: { width: 300, height: 300, quality: 80, format: 'webp' },
  CATEGORY_IMAGE: { width: 600, height: 400, quality: 85, format: 'webp' },
  USER_AVATAR: { width: 200, height: 200, quality: 85, format: 'webp' },
};
```

### **Custom Processing**

```typescript
const customProcessing = {
  width: 1920,
  height: 1080,
  quality: 95,
  format: 'webp',
  fit: 'cover',
  background: { r: 255, g: 255, b: 255, alpha: 1 },
  sharpen: true,
  blur: 0,
  grayscale: false
};
```

## 🔒 **Security Features**

### **File Validation**
- File type validation
- File size limits
- Image dimension validation
- Extension whitelist/blacklist

### **Access Control**
- Presigned URLs for secure access
- IAM-based permissions
- Bucket policies
- ACL settings

### **Error Handling**
- Comprehensive error logging
- Automatic cleanup on failures
- Retry mechanisms
- Fallback strategies

## 📊 **Monitoring & Analytics**

### **Usage Statistics**

```typescript
import { s3Utils } from '../utils/s3.utils';

const getUsageStats = async () => {
  const stats = await s3Utils.getUsageStatistics();
  
  if (stats.success) {
    console.log('Total files:', stats.data.totalObjects);
    console.log('Total size:', s3Utils.formatFileSize(stats.data.totalSize));
    console.log('Folder breakdown:', stats.data.folderBreakdown);
  }
};
```

### **Cleanup Operations**

```typescript
// Clean up old temp files
const cleanupOldFiles = async () => {
  const result = await s3Utils.cleanupTempFiles(7); // Delete files older than 7 days
  console.log(`Cleaned up ${result.data?.deletedCount} files`);
};
```

## 🚧 **Error Handling**

The system provides comprehensive error handling:

```typescript
try {
  const result = await s3UploadService.uploadFile(fileData, options);
  
  if (result.success) {
    // Handle success
    console.log('Upload successful:', result.data);
  } else {
    // Handle error
    console.error('Upload failed:', result.error);
    
    // Check specific error codes
    if (result.code === S3ErrorCodes.FILE_TOO_LARGE) {
      // Handle file size error
    } else if (result.code === S3ErrorCodes.INVALID_FILE_TYPE) {
      // Handle file type error
    }
  }
} catch (error) {
  // Handle unexpected errors
  console.error('Unexpected error:', error);
}
```

## 🔧 **Configuration Options**

### **Global Configuration**

```typescript
// In s3.config.ts
export const S3_CONFIG = {
  BUCKET_NAME: 'your-bucket',
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  CACHE_CONTROL: {
    IMAGES: 'public, max-age=31536000', // 1 year
    DOCUMENTS: 'public, max-age=2592000', // 30 days
  },
};
```

### **Per-Upload Configuration**

```typescript
const uploadOptions = {
  folder: 'products',
  subFolder: 'featured',
  processImage: true,
  imageConfig: {
    width: 1200,
    height: 800,
    quality: 90,
    format: 'webp'
  },
  cacheControl: 'public, max-age=86400', // 1 day
  makePublic: true
};
```

## 🎯 **Best Practices**

### **Performance**
- Use WebP format for images
- Enable compression
- Set appropriate cache headers
- Use CloudFront for CDN

### **Security**
- Validate all uploads
- Use presigned URLs for sensitive operations
- Implement rate limiting
- Monitor usage patterns

### **Cost Optimization**
- Regular cleanup of temp files
- Use appropriate storage classes
- Monitor storage usage
- Implement lifecycle policies

### **Error Recovery**
- Implement retry logic
- Clean up failed uploads
- Log all operations
- Provide user feedback

## 📝 **API Examples**

### **Brand Logo Upload**

```bash
curl -X POST \
  http://localhost:3000/api/brands/123/logo \
  -H 'Content-Type: multipart/form-data' \
  -F 'logo=@/path/to/logo.png'
```

### **Product Images Upload**

```bash
curl -X POST \
  http://localhost:3000/api/products/456/images \
  -H 'Content-Type: multipart/form-data' \
  -F 'images=@/path/to/image1.jpg' \
  -F 'images=@/path/to/image2.jpg'
```

## 🔍 **Troubleshooting**

### **Common Issues**

1. **Access Denied**: Check IAM permissions and bucket policy
2. **File Too Large**: Verify file size limits and middleware configuration
3. **CORS Error**: Configure bucket CORS settings
4. **Invalid File Type**: Check allowed file types configuration
5. **Image Processing Failed**: Verify Sharp library installation

### **Debug Mode**

Enable detailed logging by setting environment variable:
```env
DEBUG_S3=true
```

## 📚 **Additional Resources**

- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [Sharp Image Processing](https://sharp.pixelplumbing.com/)
- [Multer File Upload](https://github.com/expressjs/multer)
- [AWS SDK for JavaScript](https://docs.aws.amazon.com/sdk-for-javascript/)

---

## 🎉 **Conclusion**

This comprehensive AWS S3 setup provides a robust, scalable, and secure file management system for your e-commerce platform. With automatic image processing, validation, error handling, and utilities, it covers all aspects of modern file upload and storage requirements.

For additional support or custom implementations, refer to the service files and extend as needed for your specific use cases.