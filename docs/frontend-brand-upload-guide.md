# Brand Asset Upload & Management API Guide for Frontend Developers

## 📋 Overview

This guide covers the brand logo and banner upload functionality using **presigned URLs** for direct S3 uploads. This is the industry-standard approach used by major platforms like Netflix, Instagram, and Airbnb for better performance and security.

---

## 🎯 Key Features

- **Direct S3 Upload**: Files upload directly from frontend to S3, reducing server load
- **External URL Support**: Download and process images from external URLs
- **Automatic Processing**: Images are automatically resized and optimized (WebP conversion)
- **Flexible Integration**: Supports both presigned uploads and external URLs simultaneously
- **Enhanced Error Handling**: Comprehensive error messages and validation

---

## 📡 API Endpoints

### Asset Upload Management

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/admin/brands/upload-urls` | `POST` | Generate presigned URLs for direct S3 upload | ✅ Admin + `brands.canCreate` |
| `/admin/brands/process-images` | `POST` | Process uploaded images after S3 upload | ✅ Admin + `brands.canCreate` |
| `/admin/brands/:id/logo` | `PUT` | Update brand logo (presigned or external URL) | ✅ Admin + `brands.canEdit` |
| `/admin/brands/:id/banner` | `PUT` | Update brand banner (presigned or external URL) | ✅ Admin + `brands.canEdit` |

### Modified CRUD Operations

| Endpoint | Method | Changes | Auth Required |
|----------|--------|---------|---------------|
| `/admin/brands` | `POST` | Now accepts processed image objects or URLs | ✅ Admin + `brands.canCreate` |
| `/admin/brands/:id` | `PUT` | Now accepts processed image objects or URLs | ✅ Admin + `brands.canEdit` |

---

## 🔄 Upload Flow Options

### Option 1: Presigned URL Upload (Recommended)
```
1. Request Upload URLs → 2. Upload to S3 Direct → 3. Process Images → 4. Create/Update Brand
```

### Option 2: External URL Processing
```
1. Provide External URL → 2. Backend Downloads & Processes → 3. Create/Update Brand
```

### Option 3: Combined Approach
```
1. Request URLs + External URLs → 2. Upload Files + Process URLs → 3. Create/Update Brand
```

---

## 📝 Request/Response Examples

### 1. Generate Upload URLs

**Endpoint:** `POST /admin/brands/upload-urls`

**Request:**
```json
{
  "fileTypes": ["logo", "banner"],
  "externalUrls": {
    "logo": "https://example.com/nike-logo.png",
    "banner": "https://example.com/nike-banner.jpg"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Upload URLs and external processing completed",
  "data": {
    "uploadUrls": {
      "banner": {
        "uploadUrl": "https://bucket.s3.region.amazonaws.com/brands/temp/userId/timestamp/banner_abc123?X-Amz-Algorithm=...",
        "key": "brands/temp/userId/timestamp/banner_abc123",
        "publicUrl": "https://bucket.s3.region.amazonaws.com/brands/temp/userId/timestamp/banner_abc123",
        "fileType": "banner",
        "expiresAt": "2025-10-03T15:30:00Z"
      }
    },
    "externalResults": {
      "logo": {
        "success": true,
        "url": "https://bucket.s3.region.amazonaws.com/brands/logos/processed_logo.webp",
        "s3Key": "brands/logos/processed_logo.webp",
        "metadata": {
          "originalUrl": "https://example.com/nike-logo.png",
          "uploadMethod": "external_url",
          "width": 300,
          "height": 300,
          "size": 15420,
          "format": "webp",
          "compressionRatio": 2.3
        }
      }
    },
    "expiresIn": 3600,
    "instructions": {
      "presignedUpload": {
        "method": "PUT",
        "note": "Upload files directly to the uploadUrl using PUT method",
        "example": "fetch(uploadUrl, { method: 'PUT', body: file })"
      },
      "externalUrls": {
        "note": "External URLs are processed immediately and don't require additional upload"
      }
    }
  }
}
```

### 2. Upload File to S3 (Frontend Implementation)

```javascript
// Upload file using presigned URL
const uploadToS3 = async (file, uploadUrl) => {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  });
  
  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }
  
  return response;
};
```

### 3. Process Uploaded Images

**Endpoint:** `POST /admin/brands/process-images`

**Request:**
```json
{
  "uploads": {
    "logo": {
      "tempKey": "brands/temp/userId/timestamp/logo_abc123",
      "filename": "company-logo.png",
      "originalName": "company-logo.png"
    },
    "banner": {
      "tempKey": "brands/temp/userId/timestamp/banner_def456",
      "filename": "company-banner.jpg",
      "originalName": "company-banner.jpg"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "All images processed successfully",
  "data": {
    "processedImages": {
      "logo": {
        "success": true,
        "url": "https://bucket.s3.region.amazonaws.com/brands/logos/processed_logo.webp",
        "s3Key": "brands/logos/processed_logo.webp",
        "bucket": "your-bucket-name",
        "width": 300,
        "height": 300,
        "format": "webp",
        "uploadMethod": "presigned",
        "isProcessed": true,
        "processingStatus": "completed",
        "uploadedAt": "2025-10-03T14:30:00Z",
        "processedAt": "2025-10-03T14:30:05Z"
      },
      "banner": {
        "success": true,
        "url": "https://bucket.s3.region.amazonaws.com/brands/banners/processed_banner.webp",
        "s3Key": "brands/banners/processed_banner.webp",
        "bucket": "your-bucket-name",
        "width": 1200,
        "height": 400,
        "format": "webp",
        "uploadMethod": "presigned",
        "isProcessed": true,
        "processingStatus": "completed",
        "uploadedAt": "2025-10-03T14:30:00Z",
        "processedAt": "2025-10-03T14:30:08Z"
      }
    }
  }
}
```

### 4. Create Brand with Processed Images

**Endpoint:** `POST /admin/brands`

**Request:**
```json
{
  "name": "Nike",
  "description": "Just Do It - Leading athletic wear brand",
  "shortDescription": "Athletic wear and sports equipment",
  
  // Option 1: Use processed image objects from previous step
  "logo": {
    "url": "https://bucket.s3.region.amazonaws.com/brands/logos/processed_logo.webp",
    "alt": "Nike logo",
    "s3Key": "brands/logos/processed_logo.webp",
    "bucket": "your-bucket-name",
    "width": 300,
    "height": 300,
    "size": 15420,
    "format": "webp",
    "uploadMethod": "presigned",
    "isProcessed": true,
    "processingStatus": "completed",
    "uploadedAt": "2025-10-03T14:30:00Z",
    "processedAt": "2025-10-03T14:30:05Z"
  },
  
  // Option 2: Use simple URL string (for external URLs that were processed)
  "banner": "https://bucket.s3.region.amazonaws.com/brands/banners/processed_banner.webp",
  
  "businessInfo": {
    "foundingYear": 1964,
    "originCountry": "United States",
    "headquarters": "Beaverton, Oregon"
  },
  "socialMedia": {
    "website": "https://nike.com",
    "instagram": "https://instagram.com/nike"
  },
  "seo": {
    "metaTitle": "Nike - Athletic Wear & Sports Equipment",
    "metaDescription": "Shop the latest Nike athletic wear, shoes, and sports equipment. Just Do It.",
    "metaKeywords": ["nike", "athletic wear", "sports", "shoes"]
  },
  "isActive": true,
  "isFeatured": true,
  "showInMenu": true,
  "showInHomepage": true
}
```

### 5. Update Brand Logo/Banner

**Endpoint:** `PUT /admin/brands/:id/logo`

**Request (Option 1 - Processed Image Data):**
```json
{
  "logoData": {
    "url": "https://bucket.s3.region.amazonaws.com/brands/logos/new_logo.webp",
    "alt": "New Nike logo",
    "s3Key": "brands/logos/new_logo.webp",
    "width": 300,
    "height": 300,
    "size": 18750,
    "format": "webp",
    "uploadMethod": "presigned"
  }
}
```

**Request (Option 2 - External URL):**
```json
{
  "externalUrl": "https://example.com/new-logo.png"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Brand logo updated successfully",
  "data": {
    "brandId": "64f8a1234567890123456789",
    "logo": {
      "url": "https://bucket.s3.region.amazonaws.com/brands/logos/new_logo.webp",
      "alt": "Brand logo",
      "s3Key": "brands/logos/new_logo.webp",
      "bucket": "your-bucket-name",
      "uploadMethod": "external_url",
      "originalUrl": "https://example.com/new-logo.png",
      "width": 300,
      "height": 300,
      "size": 18750,
      "format": "webp",
      "isProcessed": true,
      "processingStatus": "completed",
      "uploadedAt": "2025-10-03T14:35:00Z",
      "processedAt": "2025-10-03T14:35:03Z"
    }
  }
}
```

---

## 💻 Frontend Implementation Examples

### RTK Query API Slice

```typescript
// src/store/api/brandApi.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

interface GenerateUploadUrlsRequest {
  fileTypes: ('logo' | 'banner')[];
  externalUrls?: {
    logo?: string;
    banner?: string;
  };
}

interface ProcessImagesRequest {
  uploads: Record<string, {
    tempKey: string;
    filename: string;
    originalName?: string;
  }>;
}

interface BrandImage {
  url: string;
  alt?: string;
  s3Key?: string;
  bucket?: string;
  width?: number;
  height?: number;
  size?: number;
  format?: string;
  uploadMethod?: "presigned" | "external_url";
  originalUrl?: string;
  isProcessed?: boolean;
  processingStatus?: "pending" | "processing" | "completed" | "failed";
  uploadedAt?: Date;
  processedAt?: Date;
}

interface CreateBrandRequest {
  name: string;
  description: string;
  shortDescription?: string;
  logo?: string | BrandImage;
  banner?: string | BrandImage;
  businessInfo?: {
    foundingYear?: number;
    originCountry?: string;
    headquarters?: string;
    parentCompany?: string;
    legalName?: string;
    registrationNumber?: string;
    taxId?: string;
  };
  socialMedia?: {
    website?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
    tiktok?: string;
  };
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string[];
  };
  order?: number;
  isActive?: boolean;
  isFeatured?: boolean;
  showInMenu?: boolean;
  showInHomepage?: boolean;
}

export const brandApi = createApi({
  reducerPath: 'brandApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/v1/admin/brands',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Brand'],
  endpoints: (builder) => ({
    // Generate presigned URLs for uploads
    generateUploadUrls: builder.mutation<any, GenerateUploadUrlsRequest>({
      query: (data) => ({
        url: '/upload-urls',
        method: 'POST',
        body: data,
      }),
    }),

    // Process uploaded images
    processUploadedImages: builder.mutation<any, ProcessImagesRequest>({
      query: (data) => ({
        url: '/process-images',
        method: 'POST',
        body: data,
      }),
    }),

    // Create brand
    createBrand: builder.mutation<any, CreateBrandRequest>({
      query: (data) => ({
        url: '/',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Brand'],
    }),

    // Update brand
    updateBrand: builder.mutation<any, { id: string; data: Partial<CreateBrandRequest> }>({
      query: ({ id, data }) => ({
        url: `/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Brand'],
    }),

    // Update brand logo
    updateBrandLogo: builder.mutation<any, { 
      id: string; 
      logoData?: BrandImage; 
      externalUrl?: string; 
    }>({
      query: ({ id, ...data }) => ({
        url: `/${id}/logo`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Brand'],
    }),

    // Update brand banner
    updateBrandBanner: builder.mutation<any, { 
      id: string; 
      bannerData?: BrandImage; 
      externalUrl?: string; 
    }>({
      query: ({ id, ...data }) => ({
        url: `/${id}/banner`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Brand'],
    }),

    // Get all brands
    getBrands: builder.query<any, {
      page?: number;
      limit?: number;
      search?: string;
      status?: 'all' | 'active' | 'inactive';
      featured?: 'all' | 'featured' | 'not-featured';
    }>({
      query: (params) => ({
        url: '/',
        params,
      }),
      providesTags: ['Brand'],
    }),

    // Get single brand
    getBrand: builder.query<any, string>({
      query: (id) => `/${id}`,
      providesTags: ['Brand'],
    }),
  }),
});

export const {
  useGenerateUploadUrlsMutation,
  useProcessUploadedImagesMutation,
  useCreateBrandMutation,
  useUpdateBrandMutation,
  useUpdateBrandLogoMutation,
  useUpdateBrandBannerMutation,
  useGetBrandsQuery,
  useGetBrandQuery,
} = brandApi;
```

### Custom Hook for Asset Upload

```typescript
// src/hooks/useBrandAssetUpload.ts
import { useState } from 'react';
import { 
  useGenerateUploadUrlsMutation, 
  useProcessUploadedImagesMutation 
} from '../store/api/brandApi';

interface UploadProgress {
  stage: 'idle' | 'generating-urls' | 'uploading' | 'processing' | 'complete' | 'error';
  progress: number;
  message: string;
  error?: string;
}

export const useBrandAssetUpload = () => {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    stage: 'idle',
    progress: 0,
    message: '',
  });

  const [generateUrls] = useGenerateUploadUrlsMutation();
  const [processImages] = useProcessUploadedImagesMutation();

  const uploadAssets = async (assets: {
    logo?: File;
    banner?: File;
    externalUrls?: {
      logo?: string;
      banner?: string;
    };
  }) => {
    try {
      setUploadProgress({
        stage: 'generating-urls',
        progress: 10,
        message: 'Generating upload URLs...',
      });

      // Step 1: Generate upload URLs
      const fileTypes: ('logo' | 'banner')[] = [];
      if (assets.logo) fileTypes.push('logo');
      if (assets.banner) fileTypes.push('banner');

      const urlResponse = await generateUrls({
        fileTypes,
        externalUrls: assets.externalUrls,
      }).unwrap();

      setUploadProgress({
        stage: 'uploading',
        progress: 30,
        message: 'Uploading files to S3...',
      });

      // Step 2: Upload files to S3 using presigned URLs
      const uploadPromises: Promise<any>[] = [];
      const uploadedAssets: Record<string, any> = {};

      // Handle direct file uploads
      if (assets.logo && urlResponse.data.uploadUrls.logo) {
        const logoUpload = fetch(urlResponse.data.uploadUrls.logo.uploadUrl, {
          method: 'PUT',
          body: assets.logo,
          headers: {
            'Content-Type': assets.logo.type,
          },
        }).then(() => {
          uploadedAssets.logo = {
            tempKey: urlResponse.data.uploadUrls.logo.key,
            filename: assets.logo!.name,
            originalName: assets.logo!.name,
          };
        });
        uploadPromises.push(logoUpload);
      }

      if (assets.banner && urlResponse.data.uploadUrls.banner) {
        const bannerUpload = fetch(urlResponse.data.uploadUrls.banner.uploadUrl, {
          method: 'PUT',
          body: assets.banner,
          headers: {
            'Content-Type': assets.banner.type,
          },
        }).then(() => {
          uploadedAssets.banner = {
            tempKey: urlResponse.data.uploadUrls.banner.key,
            filename: assets.banner!.name,
            originalName: assets.banner!.name,
          };
        });
        uploadPromises.push(bannerUpload);
      }

      // Wait for all uploads to complete
      await Promise.all(uploadPromises);

      setUploadProgress({
        stage: 'processing',
        progress: 70,
        message: 'Processing uploaded images...',
      });

      // Step 3: Process uploaded images
      let processedResults: any = {};
      if (Object.keys(uploadedAssets).length > 0) {
        const processResponse = await processImages({
          uploads: uploadedAssets,
        }).unwrap();
        processedResults = processResponse.data.processedImages;
      }

      // Step 4: Handle external URLs (already processed in step 1)
      const externalResults = urlResponse.data.externalResults || {};

      setUploadProgress({
        stage: 'complete',
        progress: 100,
        message: 'Upload complete!',
      });

      // Return processed asset data for brand creation/update
      const finalAssets: Record<string, any> = {};

      // Add processed uploads
      Object.entries(processedResults).forEach(([type, data]) => {
        finalAssets[type] = data;
      });

      // Add external URL results
      Object.entries(externalResults).forEach(([type, data]) => {
        if ((data as any).success) {
          finalAssets[type] = data;
        }
      });

      return finalAssets;

    } catch (error: any) {
      setUploadProgress({
        stage: 'error',
        progress: 0,
        message: 'Upload failed',
        error: error.message || 'Unknown error occurred',
      });
      throw error;
    }
  };

  const resetProgress = () => {
    setUploadProgress({
      stage: 'idle',
      progress: 0,
      message: '',
    });
  };

  return {
    uploadAssets,
    uploadProgress,
    resetProgress,
    isUploading: uploadProgress.stage !== 'idle' && uploadProgress.stage !== 'complete' && uploadProgress.stage !== 'error',
  };
};
```

### React Component Example

```typescript
// src/components/BrandForm.tsx
import React, { useState } from 'react';
import { useCreateBrandMutation, useUpdateBrandMutation } from '../store/api/brandApi';
import { useBrandAssetUpload } from '../hooks/useBrandAssetUpload';

interface BrandFormProps {
  brandId?: string;
  initialData?: any;
  onSuccess?: () => void;
}

export const BrandForm: React.FC<BrandFormProps> = ({ 
  brandId, 
  initialData, 
  onSuccess 
}) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    shortDescription: initialData?.shortDescription || '',
    businessInfo: initialData?.businessInfo || {},
    socialMedia: initialData?.socialMedia || {},
    seo: initialData?.seo || {},
    isActive: initialData?.isActive ?? true,
    isFeatured: initialData?.isFeatured ?? false,
    showInMenu: initialData?.showInMenu ?? true,
    showInHomepage: initialData?.showInHomepage ?? false,
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [externalUrls, setExternalUrls] = useState({
    logo: '',
    banner: '',
  });

  const [createBrand] = useCreateBrandMutation();
  const [updateBrand] = useUpdateBrandMutation();
  const { uploadAssets, uploadProgress, isUploading } = useBrandAssetUpload();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      let processedAssets: any = {};

      // Upload assets if any are provided
      if (logoFile || bannerFile || externalUrls.logo || externalUrls.banner) {
        processedAssets = await uploadAssets({
          logo: logoFile || undefined,
          banner: bannerFile || undefined,
          externalUrls: {
            logo: externalUrls.logo || undefined,
            banner: externalUrls.banner || undefined,
          },
        });
      }

      // Prepare brand data
      const brandData = {
        ...formData,
        logo: processedAssets.logo,
        banner: processedAssets.banner,
      };

      // Create or update brand
      if (brandId) {
        await updateBrand({ id: brandId, data: brandData }).unwrap();
      } else {
        await createBrand(brandData).unwrap();
      }

      onSuccess?.();
    } catch (error) {
      console.error('Brand save failed:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="brand-form">
      {/* Basic form fields */}
      <div className="form-group">
        <label htmlFor="name">Brand Name *</label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          maxLength={100}
        />
      </div>

      <div className="form-group">
        <label htmlFor="description">Description *</label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
          maxLength={2000}
        />
      </div>

      {/* Logo upload section */}
      <div className="form-group">
        <label>Brand Logo</label>
        <div className="upload-options">
          <div>
            <label>Upload File:</label>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
            />
            <small>Max 5MB, will be resized to 300x300</small>
          </div>
          <div>
            <label>Or External URL:</label>
            <input
              type="url"
              placeholder="https://example.com/logo.png"
              value={externalUrls.logo}
              onChange={(e) => setExternalUrls({ ...externalUrls, logo: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Banner upload section */}
      <div className="form-group">
        <label>Brand Banner</label>
        <div className="upload-options">
          <div>
            <label>Upload File:</label>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
            />
            <small>Max 10MB, will be resized to 1200x400</small>
          </div>
          <div>
            <label>Or External URL:</label>
            <input
              type="url"
              placeholder="https://example.com/banner.png"
              value={externalUrls.banner}
              onChange={(e) => setExternalUrls({ ...externalUrls, banner: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Upload progress */}
      {isUploading && (
        <div className="upload-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${uploadProgress.progress}%` }}
            />
          </div>
          <p>{uploadProgress.message}</p>
          {uploadProgress.error && (
            <p className="error">Error: {uploadProgress.error}</p>
          )}
        </div>
      )}

      {/* Submit button */}
      <button 
        type="submit" 
        disabled={isUploading}
        className="submit-button"
      >
        {isUploading ? 'Processing...' : (brandId ? 'Update Brand' : 'Create Brand')}
      </button>
    </form>
  );
};
```

---

## 📊 Validation Rules & Constraints

### File Upload Constraints

| Asset Type | Max Size | Dimensions | Formats | Processing |
|------------|----------|------------|---------|------------|
| **Logo** | 5MB | 300x300px (auto-resize) | JPG, PNG, GIF, WebP, AVIF | ✅ WebP conversion |
| **Banner** | 10MB | 1200x400px (auto-resize) | JPG, PNG, GIF, WebP, AVIF | ✅ WebP conversion |

### External URL Constraints

- **Timeout**: 30 seconds maximum
- **Size Limit**: 20MB maximum
- **Valid Domains**: Cannot use your own S3/CDN domains
- **Format Validation**: Must end with valid image extensions
- **Content-Type**: Must be `image/*`

### Brand Data Validation

| Field | Type | Required | Min Length | Max Length | Notes |
|-------|------|----------|------------|------------|-------|
| `name` | String | ✅ | 2 | 100 | Brand name |
| `description` | String | ✅ | 1 | 2000 | Full description |
| `shortDescription` | String | ❌ | 0 | 300 | Brief description |
| `seo.metaTitle` | String | ❌ | 0 | 60 | SEO title |
| `seo.metaDescription` | String | ❌ | 0 | 160 | SEO description |
| `businessInfo.email` | String | ❌ | 0 | - | Valid email format |
| `order` | Number | ❌ | 0 | 9999 | Display order |

---

## 🚨 Error Handling

### Common Error Responses

```typescript
// Upload URL Generation Errors
{
  "success": false,
  "error": "Invalid file types: invalidType"
}

// External URL Processing Errors
{
  "success": false,
  "message": "Upload URLs and external processing completed",
  "data": {
    "uploadUrls": {},
    "externalResults": {
      "logo": {
        "success": false,
        "error": "Invalid external image URL. Must be a valid image URL ending with jpg, jpeg, png, gif, webp, or avif"
      }
    }
  }
}

// Image Processing Errors
{
  "success": false,
  "message": "Some images failed to process",
  "data": {
    "processedImages": {},
    "errors": [
      "Temp file not found for logo: brands/temp/user/timestamp/logo_abc123",
      "Failed to process banner: Invalid file format"
    ]
  }
}

// Brand Creation/Update Errors
{
  "success": false,
  "error": "Brand name must be between 2-100 characters",
  "details": {
    "field": "name",
    "minLength": 2,
    "maxLength": 100
  }
}
```

### Frontend Error Handling

```typescript
// Error handling in custom hook
try {
  const result = await uploadAssets(assets);
  return result;
} catch (error: any) {
  if (error.data?.errors) {
    // Handle processing errors
    console.error('Processing errors:', error.data.errors);
  } else if (error.data?.externalResults) {
    // Handle external URL errors
    Object.entries(error.data.externalResults).forEach(([type, result]) => {
      if (!(result as any).success) {
        console.error(`${type} error:`, (result as any).error);
      }
    });
  } else {
    // Handle general errors
    console.error('Upload error:', error.message);
  }
  throw error;
}
```

---

## 🔧 Frontend Constants & Enums

```typescript
// src/constants/brand.ts

export const BRAND_VALIDATION = {
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 100,
  },
  DESCRIPTION: {
    MAX_LENGTH: 2000,
  },
  SHORT_DESCRIPTION: {
    MAX_LENGTH: 300,
  },
  SEO: {
    META_TITLE_MAX: 60,
    META_DESCRIPTION_MAX: 160,
    META_KEYWORDS_MAX: 20,
  },
  ORDER: {
    MIN: 0,
    MAX: 9999,
  },
  LOGO: {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    DIMENSIONS: { width: 300, height: 300 },
  },
  BANNER: {
    MAX_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    DIMENSIONS: { width: 1200, height: 400 },
  },
} as const;

export const BRAND_STATUS_OPTIONS = [
  { value: 'all', label: 'All Brands' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
] as const;

export const BRAND_FEATURED_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'featured', label: 'Featured' },
  { value: 'not-featured', label: 'Not Featured' },
] as const;

export const UPLOAD_STAGES = [
  'idle',
  'generating-urls',
  'uploading',
  'processing',
  'complete',
  'error',
] as const;

export type BrandStatus = typeof BRAND_STATUS_OPTIONS[number]['value'];
export type BrandFeatured = typeof BRAND_FEATURED_OPTIONS[number]['value'];
export type UploadStage = typeof UPLOAD_STAGES[number];
```

---

## 📱 Testing Guidelines

### Unit Tests

```typescript
// Test upload flow
describe('useBrandAssetUpload', () => {
  it('should upload assets successfully', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const { uploadAssets } = useBrandAssetUpload();
    
    const result = await uploadAssets({
      logo: mockFile,
      banner: mockFile,
    });
    
    expect(result).toHaveProperty('logo');
    expect(result).toHaveProperty('banner');
  });

  it('should handle external URLs', async () => {
    const { uploadAssets } = useBrandAssetUpload();
    
    const result = await uploadAssets({
      externalUrls: {
        logo: 'https://example.com/logo.png',
      },
    });
    
    expect(result.logo).toHaveProperty('url');
    expect(result.logo.uploadMethod).toBe('external_url');
  });
});
```

### Integration Tests

```typescript
// Test complete brand creation flow
describe('Brand Creation Flow', () => {
  it('should create brand with uploaded assets', async () => {
    // 1. Upload assets
    const assets = await uploadAssets({
      logo: logoFile,
      banner: bannerFile,
    });

    // 2. Create brand
    const brandData = {
      name: 'Test Brand',
      description: 'Test Description',
      logo: assets.logo,
      banner: assets.banner,
    };

    const result = await createBrand(brandData).unwrap();
    
    expect(result.success).toBe(true);
    expect(result.data.logo.url).toBeDefined();
    expect(result.data.banner.url).toBeDefined();
  });
});
```

---

## 🎯 Key Benefits for Frontend

### Performance Benefits
- **Direct S3 Upload**: No server bandwidth usage for file transfers
- **Parallel Processing**: External URLs processed while user uploads files
- **Optimized Images**: Automatic WebP conversion for better performance
- **CDN Delivery**: Fast global image delivery through CloudFront

### Developer Experience
- **Type Safety**: Full TypeScript support with detailed interfaces
- **Error Handling**: Comprehensive error messages and validation
- **Progress Tracking**: Real-time upload progress with stage indicators
- **Flexible API**: Support for multiple upload methods in single request

### User Experience
- **Fast Uploads**: Direct S3 upload reduces upload time
- **Real-time Progress**: Users see detailed progress indicators
- **Flexible Options**: Support for both file uploads and external URLs
- **Automatic Processing**: Images are automatically optimized

---

## 🔄 Migration Notes

### No Breaking Changes
- All existing endpoints maintain the same signatures
- Response formats remain unchanged
- Backward compatibility maintained for simple URL strings
- Enhanced functionality is additive, not replacing

### Enhanced Features
- Logo and banner fields now accept both strings and detailed objects
- Better error handling and validation
- Automatic image optimization
- Support for external URL processing

---

## 📞 Support & Troubleshooting

### Common Issues

1. **Upload Timeout**: Presigned URLs expire after 1 hour
2. **File Size Limits**: Check BRAND_VALIDATION constants
3. **CORS Issues**: Ensure S3 bucket CORS is configured correctly
4. **External URL Fails**: Check URL format and domain restrictions

### Debug Tips

```typescript
// Enable detailed logging
const uploadAssets = async (assets) => {
  console.log('Starting upload with assets:', assets);
  
  try {
    const result = await uploadAssetsInternal(assets);
    console.log('Upload successful:', result);
    return result;
  } catch (error) {
    console.error('Upload failed:', error);
    console.error('Error details:', error.data);
    throw error;
  }
};
```

### Contact Points
- **Backend Issues**: Check server logs for detailed error messages
- **Upload Failures**: Verify S3 configuration and permissions
- **Processing Errors**: Check image format and size constraints

---

This comprehensive guide provides everything needed to implement the brand asset upload functionality in the frontend. The system is designed to be flexible, performant, and user-friendly while maintaining backward compatibility with existing implementations.