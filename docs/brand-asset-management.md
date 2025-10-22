# Brand Asset Management with Presigned URLs

## Overview

This document describes the implementation of industry-standard brand asset management using AWS S3 presigned URLs for logo and banner uploads, along with external URL processing capabilities.

## Features Implemented

### 1. Presigned URL Upload System
- **Industry Standard**: Used by major platforms like Netflix, Instagram, Airbnb
- **Direct S3 Upload**: Files upload directly from client to S3, reducing server load
- **Secure**: Temporary URLs with expiration and size limits
- **Scalable**: No server bandwidth consumed for file transfers

### 2. External URL Processing
- **URL Validation**: Checks for valid image URLs
- **Automatic Download**: Downloads images from external sources
- **Size & Format Validation**: Enforces image constraints
- **Timeout Protection**: Prevents hanging requests

### 3. Image Processing & Optimization
- **WebP Conversion**: Automatic format optimization
- **Metadata Extraction**: Width, height, size, format detection
- **S3 Integration**: Seamless storage with proper naming conventions

## API Endpoints

### Generate Upload URLs
```
POST /admin/brands/upload-urls
Content-Type: application/json

{
  "uploads": [
    {
      "type": "logo",
      "contentType": "image/jpeg",
      "size": 1024000
    },
    {
      "type": "banner", 
      "contentType": "image/png",
      "size": 2048000
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Upload URLs generated successfully",
  "data": {
    "uploads": [
      {
        "type": "logo",
        "uploadUrl": "https://s3.amazonaws.com/...",
        "s3Key": "brands/logo_1234567890.jpg",
        "expiresIn": 300
      }
    ]
  }
}
```

### Process Uploaded Images
```
POST /admin/brands/process-images
Content-Type: application/json

{
  "images": [
    {
      "type": "logo",
      "s3Key": "brands/logo_1234567890.jpg",
      "originalName": "company-logo.jpg",
      "size": 1024000
    }
  ]
}
```

### Update Brand Logo
```
PUT /admin/brands/:id/logo
Content-Type: application/json

// Option 1: Using presigned upload result
{
  "logoData": {
    "url": "https://cdn.example.com/brands/logo_123.webp",
    "s3Key": "brands/logo_123.webp",
    "width": 200,
    "height": 80,
    "size": 15000,
    "format": "webp"
  }
}

// Option 2: Using external URL
{
  "externalUrl": "https://example.com/logo.png"
}
```

### Update Brand Banner
```
PUT /admin/brands/:id/banner
Content-Type: application/json

// Similar structure to logo update
{
  "bannerData": { /* ... */ }
}
// OR
{
  "externalUrl": "https://example.com/banner.jpg"
}
```

## Implementation Details

### Enhanced Image Schema
```typescript
interface IImage {
  url: string;
  alt?: string;
  s3Key?: string;           // S3 object key
  bucket?: string;          // S3 bucket name
  originalName?: string;    // Original filename
  width?: number;          // Image width in pixels
  height?: number;         // Image height in pixels
  size?: number;           // File size in bytes
  format?: string;         // Image format (jpg, png, webp)
  uploadMethod?: 'presigned' | 'external_url' | 'direct';
  originalUrl?: string;    // For external URLs
  isProcessed?: boolean;   // Processing completion status
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  processedFormats?: string[]; // Available formats after processing
  uploadedAt?: Date;       // Upload timestamp
  processedAt?: Date;      // Processing completion timestamp
}
```

### S3 Configuration
```typescript
const S3_CONFIG = {
  BUCKET_NAME: process.env.S3_BUCKET_NAME,
  REGION: process.env.S3_REGION,
  PRESIGNED_URL_EXPIRATION: 5 * 60, // 5 minutes
  MAX_FILE_SIZE: {
    LOGO: 5 * 1024 * 1024,      // 5MB
    BANNER: 10 * 1024 * 1024,   // 10MB
  }
};
```

### Upload Flow

#### 1. Presigned URL Method
```
Client Request → Generate Upload URLs → Direct S3 Upload → Process Images → Update Brand
```

1. **Request Upload URLs**: Client requests presigned URLs for logo/banner
2. **Generate URLs**: Server creates time-limited S3 upload URLs
3. **Direct Upload**: Client uploads directly to S3 using presigned URLs
4. **Process Images**: Client notifies server of successful uploads
5. **Update Brand**: Server processes images and updates brand record

#### 2. External URL Method
```
Client Request → Download External Image → Upload to S3 → Process & Update Brand
```

1. **Submit External URL**: Client provides external image URL
2. **Download & Validate**: Server downloads and validates image
3. **Upload to S3**: Server uploads processed image to S3
4. **Update Brand**: Server updates brand with new image data

## Error Handling

### Upload Errors
- **Invalid File Type**: Rejected with appropriate error message
- **File Too Large**: Size validation before upload URL generation
- **Upload Timeout**: Presigned URLs expire after 5 minutes
- **Processing Failure**: Cleanup of partially uploaded files

### External URL Errors
- **Invalid URL**: URL format and domain validation
- **Download Timeout**: 30-second timeout for external requests
- **Invalid Image**: Format and size validation after download
- **Network Errors**: Graceful handling of connection issues

## Security Features

### Access Control
- **Authentication Required**: All endpoints require admin authentication
- **Permission-Based**: Specific permissions for create/edit operations
- **Rate Limiting**: Prevents abuse with configurable limits

### Upload Security
- **Content-Type Validation**: Enforces image MIME types
- **Size Limits**: Prevents oversized uploads
- **Temporary URLs**: Presigned URLs expire automatically
- **Virus Scanning**: Can be integrated with AWS security services

### External URL Security
- **Domain Whitelist**: Optional restriction to trusted domains
- **Size Limits**: Maximum download size enforcement
- **Timeout Protection**: Prevents hanging requests
- **Content Validation**: Verifies downloaded content is valid image

## Monitoring & Logging

### Business Metrics
- Upload success/failure rates
- Processing times
- Storage usage statistics
- External URL processing metrics

### System Logs
- Upload URL generation events
- Image processing status
- Error conditions and recovery
- Performance metrics

### Audit Trail
- Brand asset change history
- Upload method tracking
- User activity logging
- Compliance reporting

## Best Practices

### Performance
- **Direct S3 Upload**: Reduces server bandwidth usage
- **Image Optimization**: WebP conversion for better compression
- **CDN Integration**: CloudFront for fast global delivery
- **Lazy Loading**: Efficient image loading in frontend

### Scalability
- **Presigned URLs**: No server resources for file transfers
- **Async Processing**: Background image optimization
- **Queue Integration**: SQS for high-volume processing
- **Auto-scaling**: Lambda functions for image processing

### Reliability
- **Retry Logic**: Automatic retry for failed operations
- **Cleanup Jobs**: Remove orphaned files
- **Health Checks**: Monitor S3 connectivity
- **Backup Strategy**: Cross-region replication

## Usage Examples

### Frontend Integration (React/Vue)
```javascript
// 1. Request upload URLs
const response = await fetch('/admin/brands/upload-urls', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    uploads: [
      { type: 'logo', contentType: file.type, size: file.size }
    ]
  })
});

const { uploads } = await response.json();

// 2. Upload directly to S3
const uploadResponse = await fetch(uploads[0].uploadUrl, {
  method: 'PUT',
  body: file,
  headers: { 'Content-Type': file.type }
});

// 3. Process uploaded image
await fetch('/admin/brands/process-images', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    images: [
      {
        type: 'logo',
        s3Key: uploads[0].s3Key,
        originalName: file.name,
        size: file.size
      }
    ]
  })
});
```

### Mobile App Integration
```dart
// Flutter/Dart example
final uploadUrl = await generateUploadUrl(file);
final result = await uploadToS3(uploadUrl, file);
await processUploadedImage(result.s3Key);
```

## Migration Guide

### From Direct Upload to Presigned URLs
1. **Backup existing implementation**
2. **Update frontend to use new endpoints**
3. **Test with small files first**
4. **Gradual rollout with feature flags**
5. **Monitor performance metrics**

### Data Migration
- Existing images remain functional
- New uploads use enhanced schema
- Background job to migrate old records
- Validation of migrated data

## Troubleshooting

### Common Issues
1. **Presigned URL Expired**: Generate new URL, check system time
2. **CORS Errors**: Verify S3 bucket CORS configuration
3. **Upload Fails**: Check file size, content type, network
4. **Processing Timeout**: Monitor image processing queue

### Debug Commands
```bash
# Check S3 connectivity
aws s3 ls s3://your-bucket-name/brands/

# Verify image processing
curl -X POST /admin/brands/process-images -d '{"images":[...]}'

# Monitor logs
tail -f logs/business-$(date +%Y-%m-%d).log | grep brand_
```

## Future Enhancements

### Planned Features
- **Multi-format Support**: AVIF, HEIC support
- **Smart Cropping**: AI-powered image cropping
- **Bulk Upload**: Multiple file upload with queue
- **Image Variants**: Auto-generate multiple sizes
- **Analytics**: Detailed usage analytics

### Integration Opportunities
- **CDN Integration**: CloudFront distribution
- **Image Recognition**: AI-powered tagging
- **Compliance Tools**: Automated content moderation
- **Backup Solutions**: Multi-region redundancy