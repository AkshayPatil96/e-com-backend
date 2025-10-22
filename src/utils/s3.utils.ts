import {
  IS3DeleteResult,
  IS3FileUpload,
  IS3ListObjectsResult,
  IS3PresignedUrlResult,
  IS3UploadResult,
  IS3UsageAnalytics,
  S3ServiceResponse,
} from "../@types/s3.type";
import { buildS3Url, extractS3Key, S3_CONFIG } from "../config/aws/s3.config";
import config from "../config/index";
import { s3UploadService } from "../services/aws/s3-upload.service";
import { loggerHelpers } from "./logger";

/**
 * S3 Utility Functions
 * Collection of utility functions for common S3 operations
 */

/**
 * Upload file from URL to S3 with enhanced brand context support
 */
export const uploadFileFromUrl = async (
  url: string,
  folder: "brands" | "categories" | "products" | "users" | "documents" | "temp",
  filename: string,
  options?: {
    subFolder?: string;
    processImage?: boolean;
    imageConfig?: {
      width?: number;
      height?: number;
      quality?: number;
      format?: "webp" | "jpeg" | "png";
    };
    // Enhanced brand-specific options
    timeout?: number;
    maxSize?: number;
    brandContext?: {
      brandName?: string;
      imageType?: "logo" | "banner";
    };
    makePublic?: boolean;
  },
): Promise<
  S3ServiceResponse<
    IS3UploadResult & {
      metadata?: {
        originalUrl: string;
        uploadMethod: string;
        width?: number;
        height?: number;
        size: number;
        format: string;
        compressionRatio?: number;
      };
    }
  >
> => {
  try {
    // Enhanced validation for brand context
    if (options?.brandContext) {
      const urlPattern = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|avif)$/i;
      if (!urlPattern.test(url)) {
        return {
          success: false,
          error:
            "Invalid image URL format for brand asset. Must be a valid image URL ending with jpg, jpeg, png, gif, webp, or avif",
        };
      }

      // Check if it's NOT from our S3 or CloudFront
      const ourDomains = [
        S3_CONFIG.BUCKET_NAME + ".s3." + config.AWS_REGION + ".amazonaws.com",
        config.AWS_CLOUDFRONT_URL?.replace("https://", ""),
      ].filter(Boolean);

      if (ourDomains.some((domain) => url.includes(domain!))) {
        return {
          success: false,
          error: "Cannot use URLs from our own domain as external URLs",
        };
      }
    }

    // Configure timeout and size limits
    const timeout = options?.timeout || 30000; // Default 30 seconds
    const maxSize = options?.maxSize || 20 * 1024 * 1024; // Default 20MB

    // Fetch file from URL with enhanced controls
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; E-commerce-Bot/1.0)",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          error: `Failed to fetch file from URL: ${response.status} ${response.statusText}`,
        };
      }

      // Check content type for brand context
      const contentType =
        response.headers.get("content-type") || "application/octet-stream";
      if (
        options?.brandContext &&
        (!contentType || !contentType.startsWith("image/"))
      ) {
        return {
          success: false,
          error: "URL does not point to a valid image file",
        };
      }

      // Check file size before downloading
      const contentLength = response.headers.get("content-length");
      if (contentLength && parseInt(contentLength) > maxSize) {
        return {
          success: false,
          error: `External file too large (max ${formatFileSize(maxSize)})`,
        };
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Validate actual file size
      if (buffer.length > maxSize) {
        return {
          success: false,
          error: `External file too large (max ${formatFileSize(maxSize)})`,
        };
      }

      // Enhanced filename generation for brand context
      let finalFilename = filename;
      if (
        options?.brandContext?.brandName &&
        options?.brandContext?.imageType
      ) {
        const { brandName, imageType } = options.brandContext;
        const originalExtension =
          url.split("/").pop()?.split("?")[0].split(".").pop()?.toLowerCase() ||
          "jpg";
        const sanitizedBrandName = brandName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "_");
        finalFilename = `${sanitizedBrandName}_${imageType}_${Date.now()}.${originalExtension}`;
      }

      // Auto-configure image processing for brand assets
      let imageConfig = options?.imageConfig;
      if (options?.brandContext?.imageType && !imageConfig) {
        imageConfig =
          options.brandContext.imageType === "logo"
            ? S3_CONFIG.IMAGE_PROCESSING.BRAND_LOGO
            : S3_CONFIG.IMAGE_PROCESSING.BRAND_BANNER;
      }

      // Create file upload object
      const fileData = {
        file: buffer,
        filename: finalFilename,
        mimetype: contentType,
        size: buffer.length,
      };

      // Upload to S3 with enhanced options
      const uploadResult = await s3UploadService.uploadFile(fileData, {
        folder,
        subFolder: options?.subFolder,
        processImage: options?.processImage !== false, // Default to true for brand context
        imageConfig,
        makePublic: options?.makePublic !== false, // Default to true
      });

      if (!uploadResult.success) {
        return uploadResult;
      }

      // Enhanced response with metadata for brand context
      if (options?.brandContext) {
        return {
          success: true,
          data: {
            ...uploadResult.data,
            metadata: {
              originalUrl: url,
              uploadMethod: "external_url",
              width: imageConfig?.width,
              height: imageConfig?.height,
              size: uploadResult.data.size!,
              format: imageConfig?.format || "webp",
              compressionRatio:
                buffer.length / (uploadResult.data.size || buffer.length),
            },
          },
        };
      }

      return uploadResult;
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error) {
        if (fetchError.name === "AbortError") {
          return {
            success: false,
            error: "Request timeout while downloading external file",
          };
        }
        return {
          success: false,
          error: `Failed to fetch external file: ${fetchError.message}`,
        };
      }

      return {
        success: false,
        error: "Unknown error while fetching external file",
      };
    }
  } catch (error) {
    return {
      success: false,
      error: `URL upload failed: ${(error as Error).message}`,
    };
  }
};

/**
 * Upload base64 encoded file to S3
 */
export const uploadBase64File = async (
  base64Data: string,
  filename: string,
  folder: "brands" | "categories" | "products" | "users" | "documents" | "temp",
  options?: {
    subFolder?: string;
    processImage?: boolean;
    imageConfig?: {
      width?: number;
      height?: number;
      quality?: number;
      format?: "webp" | "jpeg" | "png";
    };
  },
): Promise<S3ServiceResponse<IS3UploadResult>> => {
  try {
    // Parse base64 data
    let base64String = base64Data;
    let mimeType = "application/octet-stream";

    // Check if it's a data URL (data:mime/type;base64,data)
    if (base64Data.startsWith("data:")) {
      const parts = base64Data.split(",");
      if (parts.length === 2) {
        const header = parts[0];
        base64String = parts[1];

        // Extract MIME type
        const mimeMatch = header.match(/data:([^;]+)/);
        if (mimeMatch) {
          mimeType = mimeMatch[1];
        }
      }
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(base64String, "base64");

    // Create file upload object
    const fileData = {
      file: buffer,
      filename,
      mimetype: mimeType,
      size: buffer.length,
    };

    // Upload to S3
    return await s3UploadService.uploadFile(fileData, {
      folder,
      subFolder: options?.subFolder,
      processImage: options?.processImage,
      imageConfig: options?.imageConfig,
    });
  } catch (error) {
    return {
      success: false,
      error: `Base64 upload failed: ${(error as Error).message}`,
    };
  }
};

/**
 * Generate presigned URL for file upload
 */
export const generateUploadUrl = async (
  key: string,
  expiresIn: number = 3600,
): Promise<S3ServiceResponse<IS3PresignedUrlResult>> => {
  return await s3UploadService.generatePresignedUrl({
    key,
    expiresIn,
    operation: "putObject",
  });
};

/**
 * Generate presigned URL for file download
 */
export const generateDownloadUrl = async (
  key: string,
  expiresIn: number = 3600,
): Promise<S3ServiceResponse<IS3PresignedUrlResult>> => {
  return await s3UploadService.generatePresignedUrl({
    key,
    expiresIn,
    operation: "getObject",
  });
};

/**
 * Check if file exists in S3
 */
export const fileExists = async (keyOrUrl: string): Promise<boolean> => {
  try {
    let key = keyOrUrl;

    // If it's a URL, extract the key
    if (keyOrUrl.startsWith("http")) {
      const extractedKey = extractS3Key(keyOrUrl);
      if (!extractedKey) {
        return false;
      }
      key = extractedKey;
    }

    return await s3UploadService.fileExists(key);
  } catch (error) {
    loggerHelpers.system("s3_file_exists_check_error", {
      error: (error as Error).message,
      keyOrUrl,
    });
    return false;
  }
};

/**
 * Get file size from S3
 */
export const getFileSize = async (keyOrUrl: string): Promise<number | null> => {
  try {
    let key = keyOrUrl;

    // If it's a URL, extract the key
    if (keyOrUrl.startsWith("http")) {
      const extractedKey = extractS3Key(keyOrUrl);
      if (!extractedKey) {
        return null;
      }
      key = extractedKey;
    }

    const listResult = await s3UploadService.listObjects({
      prefix: key,
      maxKeys: 1,
    });

    if (
      listResult.success &&
      listResult.data.objects &&
      listResult.data.objects.length > 0
    ) {
      const exactMatch = listResult.data.objects.find((obj) => obj.key === key);
      return exactMatch ? exactMatch.size : null;
    }

    return null;
  } catch (error) {
    loggerHelpers.system("s3_file_size_check_error", {
      error: (error as Error).message,
      keyOrUrl,
    });
    return null;
  }
};

/**
 * Copy file within S3
 */
export const copyFile = async (
  sourceKeyOrUrl: string,
  destinationKey: string,
): Promise<S3ServiceResponse<{ url: string }>> => {
  try {
    let sourceKey = sourceKeyOrUrl;

    // If it's a URL, extract the key
    if (sourceKeyOrUrl.startsWith("http")) {
      const extractedKey = extractS3Key(sourceKeyOrUrl);
      if (!extractedKey) {
        return {
          success: false,
          error: "Invalid source URL provided",
        };
      }
      sourceKey = extractedKey;
    }

    return await s3UploadService.copyFile(sourceKey, destinationKey);
  } catch (error) {
    return {
      success: false,
      error: `Copy failed: ${(error as Error).message}`,
    };
  }
};

/**
 * Move file within S3 (copy + delete)
 */
export const moveFile = async (
  sourceKeyOrUrl: string,
  destinationKey: string,
): Promise<S3ServiceResponse<{ url: string }>> => {
  try {
    // First copy the file
    const copyResult = await copyFile(sourceKeyOrUrl, destinationKey);

    if (!copyResult.success) {
      return copyResult;
    }

    // Then delete the original
    const deleteResult = await s3UploadService.deleteFile({
      key: sourceKeyOrUrl.startsWith("http")
        ? extractS3Key(sourceKeyOrUrl) || sourceKeyOrUrl
        : sourceKeyOrUrl,
    });

    if (!deleteResult.success) {
      // If delete fails, try to clean up the copied file
      await s3UploadService.deleteFile({ key: destinationKey });
      return {
        success: false,
        error: `Move failed during delete: ${deleteResult.error}`,
      };
    }

    return copyResult;
  } catch (error) {
    return {
      success: false,
      error: `Move failed: ${(error as Error).message}`,
    };
  }
};

/**
 * Delete multiple files by URLs or keys
 */
export const deleteFiles = async (
  filesKeysOrUrls: string[],
): Promise<S3ServiceResponse<IS3DeleteResult[]>> => {
  try {
    const keys: string[] = [];
    const urls: string[] = [];

    filesKeysOrUrls.forEach((item) => {
      if (item.startsWith("http")) {
        urls.push(item);
      } else {
        keys.push(item);
      }
    });

    const result = await s3UploadService.bulkDelete({ keys, urls });

    if (result.success) {
      return {
        success: true,
        data: result.data.results,
      };
    }

    return {
      success: false,
      error: result.error,
    };
  } catch (error) {
    return {
      success: false,
      error: `Bulk delete failed: ${(error as Error).message}`,
    };
  }
};

/**
 * Get folder contents
 */
export const getFolderContents = async (
  folder: string,
  options?: {
    maxKeys?: number;
    continuationToken?: string;
  },
): Promise<S3ServiceResponse<IS3ListObjectsResult>> => {
  return await s3UploadService.listObjects({
    prefix: folder.endsWith("/") ? folder : `${folder}/`,
    maxKeys: options?.maxKeys,
    continuationToken: options?.continuationToken,
  });
};

/**
 * Get S3 usage statistics
 */
export const getUsageStatistics = async (): Promise<
  S3ServiceResponse<IS3UsageAnalytics>
> => {
  return await s3UploadService.getUsageAnalytics();
};

/**
 * Clean up old files in temp folder
 */
export const cleanupTempFiles = async (
  olderThanDays: number = 7,
): Promise<S3ServiceResponse<{ deletedCount: number }>> => {
  try {
    const tempContents = await getFolderContents(S3_CONFIG.FOLDERS.TEMP);

    if (!tempContents.success || !tempContents.data.objects) {
      return {
        success: false,
        error: "Failed to list temp folder contents",
      };
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const oldFiles = tempContents.data.objects.filter(
      (obj) => obj.lastModified < cutoffDate,
    );

    if (oldFiles.length === 0) {
      return {
        success: true,
        data: { deletedCount: 0 },
      };
    }

    const deleteResult = await deleteFiles(oldFiles.map((f) => f.key));

    if (deleteResult.success) {
      const deletedCount = deleteResult.data.filter((r) => r.success).length;

      loggerHelpers.business("s3_temp_cleanup_completed", {
        deletedCount,
        totalFiles: oldFiles.length,
        olderThanDays,
      });

      return {
        success: true,
        data: { deletedCount },
      };
    }

    return {
      success: false,
      error: "Cleanup failed during deletion",
    };
  } catch (error) {
    return {
      success: false,
      error: `Cleanup failed: ${(error as Error).message}`,
    };
  }
};

/**
 * Validate image URL is from our S3 bucket
 */
export const isValidS3ImageUrl = (url: string): boolean => {
  if (!url || typeof url !== "string") {
    return false;
  }

  // Check if it's from our bucket
  const bucketUrl = `https://${S3_CONFIG.BUCKET_NAME}.s3.`;
  const cloudFrontUrl = process.env.AWS_CLOUDFRONT_URL;

  return (
    url.startsWith(bucketUrl) ||
    (cloudFrontUrl ? url.startsWith(cloudFrontUrl) : false)
  );
};

/**
 * Extract filename from S3 URL
 */
export const getFilenameFromUrl = (url: string): string | null => {
  try {
    const key = extractS3Key(url);
    if (!key) return null;

    const parts = key.split("/");
    const filename = parts[parts.length - 1];

    // Remove timestamp and random string if present
    const match = filename.match(/^\d+_[a-z0-9]+_(.+)$/);
    return match ? match[1] : filename;
  } catch (error) {
    return null;
  }
};

/**
 * Get file extension from URL or key
 */
export const getFileExtension = (urlOrKey: string): string | null => {
  try {
    const filename = urlOrKey.includes("/")
      ? urlOrKey.split("/").pop() || ""
      : urlOrKey;

    const extension = filename.split(".").pop();
    return extension ? extension.toLowerCase() : null;
  } catch (error) {
    return null;
  }
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

/**
 * Get MIME type from file extension
 */
export const getMimeTypeFromExtension = (extension: string): string => {
  const mimeTypes: Record<string, string> = {
    // Images
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    bmp: "image/bmp",
    tiff: "image/tiff",

    // Documents
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    txt: "text/plain",
    rtf: "application/rtf",

    // Videos
    mp4: "video/mp4",
    avi: "video/x-msvideo",
    mov: "video/quicktime",
    wmv: "video/x-ms-wmv",
    flv: "video/x-flv",
    webm: "video/webm",

    // Audio
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    m4a: "audio/mp4",

    // Archives
    zip: "application/zip",
    rar: "application/x-rar-compressed",
    "7z": "application/x-7z-compressed",
    tar: "application/x-tar",
    gz: "application/gzip",
  };

  return mimeTypes[extension.toLowerCase()] || "application/octet-stream";
};

/**
 * Validate file type against allowed types
 */
export const isAllowedFileType = (
  mimetype: string,
  allowedTypes: string[],
): boolean => {
  return allowedTypes.includes(mimetype);
};

/**
 * Validate if URL is an external image URL (not from our S3/CDN)
 */
export const isExternalImageUrl = (url: string): boolean => {
  if (!url || typeof url !== "string") return false;

  // Check if it's a valid URL
  const urlPattern = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|avif)(\?.*)?$/i;
  if (!urlPattern.test(url)) return false;

  // Check if it's NOT from our S3 or CloudFront
  const ourDomains = [
    S3_CONFIG.BUCKET_NAME + ".s3." + config.AWS_REGION + ".amazonaws.com",
    config.AWS_CLOUDFRONT_URL?.replace("https://", ""),
  ].filter(Boolean);

  return !ourDomains.some((domain) => url.includes(domain!));
};

/**
 * Generate unique filename with timestamp
 */
export const generateUniqueFilename = (originalFilename: string): string => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const extension = getFileExtension(originalFilename);
  const nameWithoutExt = originalFilename.replace(`.${extension}`, "");
  const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9.-]/g, "_");

  return `${timestamp}_${randomString}_${sanitizedName}.${extension}`;
};

/**
 * S3 Utilities Export
 */
export const s3Utils = {
  uploadFileFromUrl,
  uploadBase64File,
  isExternalImageUrl,
  generateUploadUrl,
  generateDownloadUrl,
  fileExists,
  getFileSize,
  copyFile,
  moveFile,
  deleteFiles,
  getFolderContents,
  getUsageStatistics,
  cleanupTempFiles,
  isValidS3ImageUrl,
  getFilenameFromUrl,
  getFileExtension,
  formatFileSize,
  getMimeTypeFromExtension,
  isAllowedFileType,
  generateUniqueFilename,
  buildS3Url,
  extractS3Key,
};

export default s3Utils;
