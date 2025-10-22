import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sharp from "sharp";
import {
  IFileValidationOptions,
  IFileValidationResult,
  IImageProcessingOptions,
  IImageProcessingResult,
  IS3BulkDeleteOptions,
  IS3BulkDeleteResult,
  IS3BulkUploadOptions,
  IS3BulkUploadResult,
  IS3DeleteOptions,
  IS3DeleteResult,
  IS3FileUpload,
  IS3ListObjectsOptions,
  IS3ListObjectsResult,
  IS3Object,
  IS3PresignedUrlOptions,
  IS3PresignedUrlResult,
  IS3UploadOptions,
  IS3UploadResult,
  IS3UsageAnalytics,
  S3ErrorCodes,
  S3ServiceError,
  S3ServiceResponse,
} from "../../@types/s3.type";
import {
  S3_CONFIG,
  buildS3Url,
  extractS3Key,
  generateS3Key,
  s3Client,
} from "../../config/aws/s3.config";
import { loggerHelpers } from "../../utils/logger";

/**
 * S3 Upload Service Module
 * Comprehensive module for managing file uploads to AWS S3
 */

// Module constants
const MAX_CONCURRENT_UPLOADS = 3;

// Helper functions
const streamToBuffer = async (stream: any): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
};

const isImageFile = (mimetype: string): boolean => {
  return (S3_CONFIG.ALLOWED_IMAGE_TYPES as readonly string[]).includes(
    mimetype,
  );
};

const getAllowedTypesForFolder = (folder: string): string[] => {
  switch (folder) {
    case "brands":
    case "categories":
    case "products":
    case "users":
      return [...S3_CONFIG.ALLOWED_IMAGE_TYPES];
    case "documents":
      return [
        ...S3_CONFIG.ALLOWED_IMAGE_TYPES,
        ...S3_CONFIG.ALLOWED_DOCUMENT_TYPES,
      ];
    default:
      return [
        ...S3_CONFIG.ALLOWED_IMAGE_TYPES,
        ...S3_CONFIG.ALLOWED_DOCUMENT_TYPES,
        ...S3_CONFIG.ALLOWED_VIDEO_TYPES,
      ];
  }
};

const getDefaultImageConfig = (folder: string): IImageProcessingOptions => {
  switch (folder) {
    case "brands":
      return S3_CONFIG.IMAGE_PROCESSING.BRAND_LOGO;
    case "categories":
      return S3_CONFIG.IMAGE_PROCESSING.CATEGORY_IMAGE;
    case "products":
      return S3_CONFIG.IMAGE_PROCESSING.PRODUCT_MAIN;
    case "users":
      return S3_CONFIG.IMAGE_PROCESSING.USER_AVATAR;
    default:
      return {
        width: 800,
        height: 600,
        quality: 85,
        format: "webp",
      };
  }
};

const uploadToS3 = async (
  buffer: Buffer,
  key: string,
  contentType: string,
  cacheControl?: string,
): Promise<S3ServiceResponse<any>> => {
  try {
    const command = new PutObjectCommand({
      Bucket: S3_CONFIG.BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: cacheControl || S3_CONFIG.CACHE_CONTROL.IMAGES,
      // ACL: "public-read",
    });

    await s3Client.send(command);
    return { success: true, data: null };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
};

const processImage = async (
  buffer: Buffer,
  options: IImageProcessingOptions,
): Promise<IImageProcessingResult> => {
  try {
    let sharpInstance = sharp(buffer);

    // Get original metadata
    const metadata = await sharpInstance.metadata();
    const originalSize = buffer.length;

    // Resize if dimensions specified
    if (options.width || options.height) {
      sharpInstance = sharpInstance.resize(options.width, options.height, {
        fit: options.fit || "cover",
        background: options.background || { r: 255, g: 255, b: 255, alpha: 1 },
      });
    }

    // Apply format and quality
    const format = options.format || "webp";
    const quality = options.quality || 85;

    switch (format) {
      case "webp":
        sharpInstance = sharpInstance.webp({ quality });
        break;
      case "jpeg":
        sharpInstance = sharpInstance.jpeg({ quality });
        break;
      case "png":
        sharpInstance = sharpInstance.png({ quality });
        break;
      case "avif":
        sharpInstance = sharpInstance.avif({ quality });
        break;
    }

    // Apply additional processing
    if (options.sharpen) {
      sharpInstance = sharpInstance.sharpen();
    }

    if (options.blur) {
      sharpInstance = sharpInstance.blur(options.blur);
    }

    if (options.grayscale) {
      sharpInstance = sharpInstance.grayscale();
    }

    const processedBuffer = await sharpInstance.toBuffer();
    const finalMetadata = await sharp(processedBuffer).metadata();

    return {
      success: true,
      processedBuffer,
      originalSize,
      processedSize: processedBuffer.length,
      compressionRatio: originalSize / processedBuffer.length,
      format,
      dimensions: {
        width: finalMetadata.width || 0,
        height: finalMetadata.height || 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Image processing failed: ${(error as Error).message}`,
    };
  }
};

const validateFile = async (
  file: IS3FileUpload,
  options: IFileValidationOptions,
): Promise<IFileValidationResult> => {
  const errors: string[] = [];

  // Check file size
  if (options.maxSize && file.size > options.maxSize) {
    errors.push(
      `File size (${file.size} bytes) exceeds maximum allowed size (${options.maxSize} bytes)`,
    );
  }

  // Check file type
  if (options.allowedTypes && !options.allowedTypes.includes(file.mimetype)) {
    errors.push(`File type (${file.mimetype}) is not allowed`);
  }

  // Check file extension
  if (options.allowedExtensions) {
    const extension = file.filename.split(".").pop()?.toLowerCase();
    if (!extension || !options.allowedExtensions.includes(extension)) {
      errors.push(`File extension (.${extension}) is not allowed`);
    }
  }

  // For images, check dimensions if specified
  if (
    isImageFile(file.mimetype) &&
    (options.minWidth ||
      options.maxWidth ||
      options.minHeight ||
      options.maxHeight ||
      options.exactDimensions)
  ) {
    try {
      const buffer =
        file.file instanceof Buffer
          ? file.file
          : await streamToBuffer(file.file);
      const metadata = await sharp(buffer).metadata();

      if (
        options.minWidth &&
        metadata.width &&
        metadata.width < options.minWidth
      ) {
        errors.push(
          `Image width (${metadata.width}px) is below minimum required (${options.minWidth}px)`,
        );
      }

      if (
        options.maxWidth &&
        metadata.width &&
        metadata.width > options.maxWidth
      ) {
        errors.push(
          `Image width (${metadata.width}px) exceeds maximum allowed (${options.maxWidth}px)`,
        );
      }

      if (
        options.minHeight &&
        metadata.height &&
        metadata.height < options.minHeight
      ) {
        errors.push(
          `Image height (${metadata.height}px) is below minimum required (${options.minHeight}px)`,
        );
      }

      if (
        options.maxHeight &&
        metadata.height &&
        metadata.height > options.maxHeight
      ) {
        errors.push(
          `Image height (${metadata.height}px) exceeds maximum allowed (${options.maxHeight}px)`,
        );
      }

      if (options.exactDimensions && metadata.width && metadata.height) {
        if (
          metadata.width !== options.exactDimensions.width ||
          metadata.height !== options.exactDimensions.height
        ) {
          errors.push(
            `Image dimensions (${metadata.width}x${metadata.height}) must be exactly ${options.exactDimensions.width}x${options.exactDimensions.height}`,
          );
        }
      }
    } catch (error) {
      errors.push("Failed to read image metadata");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    fileInfo: {
      size: file.size,
      type: file.mimetype,
      extension: file.filename.split(".").pop()?.toLowerCase() || "",
    },
  };
};

// Public API functions

/**
 * Upload single file to S3 with optional image processing
 */
export const uploadFile = async (
  fileData: IS3FileUpload,
  options: IS3UploadOptions,
): Promise<S3ServiceResponse<IS3UploadResult>> => {
  try {
    // Validate file
    const validation = await validateFile(fileData, {
      maxSize: S3_CONFIG.MAX_FILE_SIZE,
      allowedTypes: getAllowedTypesForFolder(options.folder),
    });

    if (!validation.isValid) {
      return {
        success: false,
        error: `File validation failed: ${validation.errors.join(", ")}`,
        code: S3ErrorCodes.INVALID_FILE_TYPE,
      };
    }

    // Generate S3 key
    const folderMapping: Record<string, keyof typeof S3_CONFIG.FOLDERS> = {
      brands: "BRANDS",
      categories: "CATEGORIES",
      products: "PRODUCTS",
      users: "USERS",
      documents: "DOCUMENTS",
      temp: "TEMP",
    };
    const s3Key = generateS3Key(
      folderMapping[options.folder],
      fileData.filename,
      options.subFolder,
    );

    let uploadBuffer =
      fileData.file instanceof Buffer
        ? fileData.file
        : await streamToBuffer(fileData.file);
    let finalMimetype = fileData.mimetype;
    const processedFormats: any = {};

    // Process image if requested and file is an image
    if (options.processImage && isImageFile(fileData.mimetype)) {
      const imageConfig =
        options.imageConfig || getDefaultImageConfig(options.folder);

      const processed = await processImage(uploadBuffer, imageConfig);
      if (processed.success && processed.processedBuffer) {
        uploadBuffer = processed.processedBuffer;
        finalMimetype = `image/${imageConfig.format || "webp"}`;
        processedFormats.original = buildS3Url(s3Key);

        // Update key with new extension if format changed
        if (imageConfig.format && imageConfig.format !== "jpeg") {
          const keyParts = s3Key.split(".");
          keyParts[keyParts.length - 1] = imageConfig.format;
          const newKey = keyParts.join(".");
          processedFormats.webp = buildS3Url(newKey);
        }
      }
    }

    // Upload to S3
    const uploadResult = await uploadToS3(
      uploadBuffer,
      s3Key,
      finalMimetype,
      options.cacheControl,
    );

    if (!uploadResult.success) {
      return uploadResult;
    }

    const result: IS3UploadResult = {
      success: true,
      url: buildS3Url(s3Key),
      key: s3Key,
      bucket: S3_CONFIG.BUCKET_NAME,
      size: uploadBuffer.length,
      mimetype: finalMimetype,
      processedFormats:
        Object.keys(processedFormats).length > 0 ? processedFormats : undefined,
    };

    loggerHelpers.business("s3_file_uploaded", {
      key: s3Key,
      size: uploadBuffer.length,
      mimetype: finalMimetype,
      folder: options.folder,
    });

    return { success: true, data: result };
  } catch (error) {
    loggerHelpers.system("s3_upload_error", {
      error: (error as Error).message,
      filename: fileData.filename,
      folder: options.folder,
    });

    return {
      success: false,
      error: `Upload failed: ${(error as Error).message}`,
      code: S3ErrorCodes.UPLOAD_FAILED,
    };
  }
};

/**
 * Delete file from S3
 */
export const deleteFile = async (
  options: IS3DeleteOptions,
): Promise<S3ServiceResponse<IS3DeleteResult>> => {
  try {
    let key: string;

    if (options.key) {
      key = options.key;
    } else if (options.url) {
      const extractedKey = extractS3Key(options.url);
      if (!extractedKey) {
        return {
          success: false,
          error: "Invalid S3 URL provided",
          code: S3ErrorCodes.INVALID_URL,
        };
      }
      key = extractedKey;
    } else {
      return {
        success: false,
        error: "Either key or url must be provided",
        code: S3ErrorCodes.INVALID_KEY,
      };
    }

    const command = new DeleteObjectCommand({
      Bucket: S3_CONFIG.BUCKET_NAME,
      Key: key,
    });
    console.log("<========= command: ===========>", command);

    await s3Client.send(command);

    loggerHelpers.business("s3_file_deleted", { key });

    return {
      success: true,
      data: {
        success: true,
        deletedKey: key,
      },
    };
  } catch (error) {
    loggerHelpers.system("s3_delete_error", {
      error: (error as Error).message,
      key: options.key || options.url,
    });

    return {
      success: false,
      error: `Delete failed: ${(error as Error).message}`,
      code: S3ErrorCodes.DELETE_FAILED,
    };
  }
};

/**
 * Generate presigned URL for direct upload or download
 */
export const generatePresignedUrl = async (
  options: IS3PresignedUrlOptions,
): Promise<S3ServiceResponse<IS3PresignedUrlResult>> => {
  try {
    const command =
      options.operation === "putObject"
        ? new PutObjectCommand({
            Bucket: S3_CONFIG.BUCKET_NAME,
            Key: options.key,
          })
        : new GetObjectCommand({
            Bucket: S3_CONFIG.BUCKET_NAME,
            Key: options.key,
          });

    const expiresIn = options.expiresIn || 3600; // 1 hour default
    const url = await getSignedUrl(s3Client, command, { expiresIn });
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    return {
      success: true,
      data: {
        success: true,
        url,
        expiresAt,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to generate presigned URL: ${(error as Error).message}`,
    };
  }
};

/**
 * List objects in S3 bucket with pagination
 */
export const listObjects = async (
  options: IS3ListObjectsOptions = {},
): Promise<S3ServiceResponse<IS3ListObjectsResult>> => {
  try {
    const command = new ListObjectsV2Command({
      Bucket: S3_CONFIG.BUCKET_NAME,
      Prefix: options.prefix,
      MaxKeys: options.maxKeys || 1000,
      ContinuationToken: options.continuationToken,
    });

    const response = await s3Client.send(command);

    const objects: IS3Object[] = (response.Contents || []).map((obj) => ({
      key: obj.Key!,
      url: buildS3Url(obj.Key!),
      size: obj.Size || 0,
      lastModified: obj.LastModified || new Date(),
      etag: obj.ETag || "",
    }));

    return {
      success: true,
      data: {
        success: true,
        objects,
        isTruncated: response.IsTruncated || false,
        nextContinuationToken: response.NextContinuationToken,
        totalCount: response.KeyCount || 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to list objects: ${(error as Error).message}`,
    };
  }
};

/**
 * Bulk upload multiple files
 */
export const bulkUpload = async (
  options: IS3BulkUploadOptions,
): Promise<S3ServiceResponse<IS3BulkUploadResult>> => {
  const results: IS3UploadResult[] = [];
  const errors: string[] = [];
  const concurrent = options.concurrent || MAX_CONCURRENT_UPLOADS;

  try {
    // Process files in batches
    for (let i = 0; i < options.files.length; i += concurrent) {
      const batch = options.files.slice(i, i + concurrent);
      const batchPromises = batch.map(async (file, index) => {
        const result = await uploadFile(file, options.options);
        if (result.success) {
          return result.data;
        } else {
          errors.push(`File ${i + index + 1}: ${result.error}`);
          return {
            success: false,
            error: result.error,
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.length - successCount;

    return {
      success: true,
      data: {
        success: failureCount === 0,
        results,
        totalFiles: options.files.length,
        successCount,
        failureCount,
        errors: errors.length > 0 ? errors : undefined,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Bulk upload failed: ${(error as Error).message}`,
    };
  }
};

/**
 * Bulk delete multiple files
 */
export const bulkDelete = async (
  options: IS3BulkDeleteOptions,
): Promise<S3ServiceResponse<IS3BulkDeleteResult>> => {
  const results: IS3DeleteResult[] = [];
  const errors: string[] = [];
  const concurrent = options.concurrent || MAX_CONCURRENT_UPLOADS;

  try {
    const deleteOptions: IS3DeleteOptions[] = [];

    if (options.keys) {
      deleteOptions.push(...options.keys.map((key) => ({ key })));
    }

    if (options.urls) {
      deleteOptions.push(...options.urls.map((url) => ({ url })));
    }

    // Process deletions in batches
    for (let i = 0; i < deleteOptions.length; i += concurrent) {
      const batch = deleteOptions.slice(i, i + concurrent);
      const batchPromises = batch.map(async (deleteOption, index) => {
        const result = await deleteFile(deleteOption);
        if (result.success) {
          return result.data;
        } else {
          errors.push(`Item ${i + index + 1}: ${result.error}`);
          return {
            success: false,
            error: result.error,
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.length - successCount;

    return {
      success: true,
      data: {
        success: failureCount === 0,
        results,
        totalFiles: deleteOptions.length,
        successCount,
        failureCount,
        errors: errors.length > 0 ? errors : undefined,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Bulk delete failed: ${(error as Error).message}`,
    };
  }
};

/**
 * Check if file exists in S3
 */
export const fileExists = async (key: string): Promise<boolean> => {
  try {
    const command = new HeadObjectCommand({
      Bucket: S3_CONFIG.BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Copy file within S3
 */
export const copyFile = async (
  sourceKey: string,
  destinationKey: string,
): Promise<S3ServiceResponse<{ url: string }>> => {
  try {
    const command = new CopyObjectCommand({
      Bucket: S3_CONFIG.BUCKET_NAME,
      CopySource: `${S3_CONFIG.BUCKET_NAME}/${sourceKey}`,
      Key: destinationKey,
    });

    await s3Client.send(command);

    return {
      success: true,
      data: {
        url: buildS3Url(destinationKey),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Copy failed: ${(error as Error).message}`,
    };
  }
};

/**
 * Get S3 usage analytics
 */
export const getUsageAnalytics = async (): Promise<
  S3ServiceResponse<IS3UsageAnalytics>
> => {
  try {
    const listResult = await listObjects({ maxKeys: 10000 });

    if (!listResult.success || !listResult.data.objects) {
      return {
        success: false,
        error: "Failed to fetch objects for analytics",
      };
    }

    const objects = listResult.data.objects;
    const folderBreakdown: Record<string, { count: number; size: number }> = {};
    const typeBreakdown: Record<string, { count: number; size: number }> = {};

    let totalSize = 0;

    objects.forEach((obj) => {
      totalSize += obj.size;

      // Folder breakdown
      const folder = obj.key.split("/")[0];
      if (!folderBreakdown[folder]) {
        folderBreakdown[folder] = { count: 0, size: 0 };
      }
      folderBreakdown[folder].count++;
      folderBreakdown[folder].size += obj.size;

      // Type breakdown (by extension)
      const extension = obj.key.split(".").pop()?.toLowerCase() || "unknown";
      if (!typeBreakdown[extension]) {
        typeBreakdown[extension] = { count: 0, size: 0 };
      }
      typeBreakdown[extension].count++;
      typeBreakdown[extension].size += obj.size;
    });

    return {
      success: true,
      data: {
        totalObjects: objects.length,
        totalSize,
        folderBreakdown,
        typeBreakdown,
        lastUpdated: new Date(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Analytics failed: ${(error as Error).message}`,
    };
  }
};

// Create a module object with all the functions for easier consumption
export const s3UploadService = {
  uploadFile,
  deleteFile,
  generatePresignedUrl,
  listObjects,
  bulkUpload,
  bulkDelete,
  fileExists,
  copyFile,
  getUsageAnalytics,
};

// Default export for backward compatibility
export default s3UploadService;
