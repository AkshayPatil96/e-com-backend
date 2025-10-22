import { Readable } from "stream";

/**
 * S3 File Upload Types and Interfaces
 */

export interface IS3FileUpload {
  file: Buffer | Readable;
  filename: string;
  mimetype: string;
  size: number;
}

export interface IS3UploadOptions {
  folder: "brands" | "categories" | "products" | "users" | "documents" | "temp";
  subFolder?: string;
  processImage?: boolean;
  imageConfig?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: "webp" | "jpeg" | "png";
  };
  cacheControl?: string;
  makePublic?: boolean;
}

export interface IS3UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  bucket?: string;
  size?: number;
  mimetype?: string;
  processedFormats?: {
    original?: string;
    webp?: string;
    thumbnail?: string;
  };
  error?: string;
}

export interface IS3DeleteOptions {
  key?: string;
  url?: string;
}

export interface IS3DeleteResult {
  success: boolean;
  deletedKey?: string;
  error?: string;
}

export interface IS3PresignedUrlOptions {
  key: string;
  expiresIn?: number; // in seconds, default 3600 (1 hour)
  operation?: "getObject" | "putObject";
}

export interface IS3PresignedUrlResult {
  success: boolean;
  url?: string;
  expiresAt?: Date;
  error?: string;
}

export interface IS3ListObjectsOptions {
  prefix?: string;
  maxKeys?: number;
  continuationToken?: string;
}

export interface IS3Object {
  key: string;
  url: string;
  size: number;
  lastModified: Date;
  etag: string;
}

export interface IS3ListObjectsResult {
  success: boolean;
  objects?: IS3Object[];
  isTruncated?: boolean;
  nextContinuationToken?: string;
  totalCount?: number;
  error?: string;
}

export interface IS3BucketInfo {
  name: string;
  region: string;
  url: string;
  cdnUrl?: string;
}

export interface IS3ServiceConfig {
  bucket: IS3BucketInfo;
  maxFileSize: number;
  allowedTypes: {
    images: string[];
    documents: string[];
    videos: string[];
  };
  defaultCacheControl: string;
  imageProcessing: {
    defaultQuality: number;
    defaultFormat: "webp" | "jpeg" | "png";
    enableThumbnails: boolean;
    thumbnailSize: { width: number; height: number };
  };
}

/**
 * Multer S3 Extended File Interface
 */
export interface IS3MulterFile extends Express.Multer.File {
  location: string;
  bucket: string;
  key: string;
  acl: string;
  contentType: string;
  contentDisposition: string;
  contentEncoding: string;
  storageClass: string;
  serverSideEncryption: string;
  metadata: any;
  etag: string;
  versionId?: string;
}

/**
 * Image Processing Types
 */
export interface IImageProcessingOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: "webp" | "jpeg" | "png" | "avif";
  fit?: "cover" | "contain" | "fill" | "inside" | "outside";
  background?: string;
  sharpen?: boolean;
  blur?: number;
  grayscale?: boolean;
}

export interface IImageProcessingResult {
  success: boolean;
  processedBuffer?: Buffer;
  originalSize?: number;
  processedSize?: number;
  compressionRatio?: number;
  format?: string;
  dimensions?: {
    width: number;
    height: number;
  };
  error?: string;
}

/**
 * Bulk Operations Types
 */
export interface IS3BulkUploadOptions {
  files: IS3FileUpload[];
  options: IS3UploadOptions;
  concurrent?: number; // max concurrent uploads, default 3
}

export interface IS3BulkUploadResult {
  success: boolean;
  results: IS3UploadResult[];
  totalFiles: number;
  successCount: number;
  failureCount: number;
  errors?: string[];
}

export interface IS3BulkDeleteOptions {
  keys?: string[];
  urls?: string[];
  concurrent?: number;
}

export interface IS3BulkDeleteResult {
  success: boolean;
  results: IS3DeleteResult[];
  totalFiles: number;
  successCount: number;
  failureCount: number;
  errors?: string[];
}

/**
 * S3 Service Response Types
 */
export type S3ServiceResponse<T = any> =
  | {
      success: true;
      data: T;
      message?: string;
    }
  | {
      success: false;
      error: string;
      code?: string;
    };

/**
 * File Validation Types
 */
export interface IFileValidationOptions {
  maxSize?: number;
  allowedTypes?: string[];
  allowedExtensions?: string[];
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  exactDimensions?: { width: number; height: number };
}

export interface IFileValidationResult {
  isValid: boolean;
  errors: string[];
  fileInfo?: {
    size: number;
    type: string;
    extension: string;
    dimensions?: {
      width: number;
      height: number;
    };
  };
}

/**
 * S3 Analytics Types
 */
export interface IS3UsageAnalytics {
  totalObjects: number;
  totalSize: number; // in bytes
  folderBreakdown: Record<
    string,
    {
      count: number;
      size: number;
    }
  >;
  typeBreakdown: Record<
    string,
    {
      count: number;
      size: number;
    }
  >;
  lastUpdated: Date;
}

/**
 * S3 Error Types
 */
export class S3ServiceError extends Error {
  constructor(
    public message: string,
    public code?: string,
    public statusCode?: number,
    public awsError?: any,
  ) {
    super(message);
    this.name = "S3ServiceError";
  }
}

export enum S3ErrorCodes {
  FILE_TOO_LARGE = "FILE_TOO_LARGE",
  INVALID_FILE_TYPE = "INVALID_FILE_TYPE",
  UPLOAD_FAILED = "UPLOAD_FAILED",
  DELETE_FAILED = "DELETE_FAILED",
  FILE_NOT_FOUND = "FILE_NOT_FOUND",
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  BUCKET_NOT_FOUND = "BUCKET_NOT_FOUND",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NETWORK_ERROR = "NETWORK_ERROR",
  IMAGE_PROCESSING_FAILED = "IMAGE_PROCESSING_FAILED",
  INVALID_URL = "INVALID_URL",
  INVALID_KEY = "INVALID_KEY",
}

/**
 * S3 Event Types (for webhooks/notifications)
 */
export interface IS3UploadEvent {
  eventType: "upload";
  timestamp: Date;
  bucket: string;
  key: string;
  size: number;
  contentType: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface IS3DeleteEvent {
  eventType: "delete";
  timestamp: Date;
  bucket: string;
  key: string;
  userId?: string;
}

export type S3Event = IS3UploadEvent | IS3DeleteEvent;
