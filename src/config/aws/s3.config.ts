import { S3Client } from "@aws-sdk/client-s3";
import { SESClient } from "@aws-sdk/client-ses";
import config from "../index";

/**
 * AWS S3 Client Configuration
 * Creates and exports S3 client instance with proper credentials and region setup
 */
export const s3Client = new S3Client({
  region: config.AWS_REGION,
  credentials: {
    accessKeyId: config.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
  },
  // Optional: Configure request timeout and retry logic
  requestHandler: {
    requestTimeout: 30000, // 30 seconds
  },
  maxAttempts: 3, // Retry failed requests up to 3 times
});

/**
 * AWS SES Client Configuration (for email services)
 * Optional: For sending emails via AWS SES
 */
export const sesClient = new SESClient({
  region: config.AWS_REGION,
  credentials: {
    accessKeyId: config.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * S3 Configuration Constants
 */
export const S3_CONFIG = {
  // Main bucket for storing files
  BUCKET_NAME: config.AWS_S3_BUCKET_NAME,

  // CDN/CloudFront URL for serving files (optional)
  CDN_URL:
    config.AWS_CLOUDFRONT_URL ||
    `https://${config.AWS_S3_BUCKET_NAME}.s3.${config.AWS_REGION}.amazonaws.com`,

  // Maximum file size (50MB)
  MAX_FILE_SIZE: 50 * 1024 * 1024,

  // Allowed file types for different purposes
  ALLOWED_IMAGE_TYPES: [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ],
  ALLOWED_DOCUMENT_TYPES: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  ALLOWED_VIDEO_TYPES: ["video/mp4", "video/mpeg", "video/quicktime"],

  // Folder structure in S3
  FOLDERS: {
    BRANDS: "brands",
    CATEGORIES: "categories",
    PRODUCTS: "products",
    USERS: "users",
    DOCUMENTS: "documents",
    TEMP: "temp",
  },

  // Image processing settings
  IMAGE_PROCESSING: {
    // Brand logos
    BRAND_LOGO: {
      width: 300,
      height: 300,
      quality: 90,
      format: "webp" as const,
    },
    // Brand banners
    BRAND_BANNER: {
      width: 1200,
      height: 400,
      quality: 85,
      format: "webp" as const,
    },
    // Product images
    PRODUCT_MAIN: {
      width: 800,
      height: 800,
      quality: 90,
      format: "webp" as const,
    },
    PRODUCT_THUMBNAIL: {
      width: 300,
      height: 300,
      quality: 80,
      format: "webp" as const,
    },
    // Category images
    CATEGORY_IMAGE: {
      width: 600,
      height: 400,
      quality: 85,
      format: "webp" as const,
    },
    // User avatars
    USER_AVATAR: {
      width: 200,
      height: 200,
      quality: 85,
      format: "webp" as const,
    },
  },

  // Cache control settings
  CACHE_CONTROL: {
    IMAGES: "public, max-age=31536000", // 1 year
    DOCUMENTS: "public, max-age=2592000", // 30 days
    TEMP: "public, max-age=3600", // 1 hour
  },
} as const;

/**
 * S3 URL Builder
 * Builds full URL for S3 objects
 */
export const buildS3Url = (key: string): string => {
  if (config.AWS_CLOUDFRONT_URL) {
    return `${config.AWS_CLOUDFRONT_URL}${key}`;
  } else {
    return `https://${S3_CONFIG.BUCKET_NAME}.s3.${config.AWS_REGION}.amazonaws.com/${key}`;
  }
};

/**
 * Extract S3 key from URL
 * Extracts the S3 key from a full S3 URL
 */
export const extractS3Key = (url: string): string | null => {
  try {
    if (
      config.AWS_CLOUDFRONT_URL &&
      url.startsWith(config.AWS_CLOUDFRONT_URL)
    ) {
      return url.replace(`${config.AWS_CLOUDFRONT_URL}/`, "");
    }

    const s3UrlPattern = new RegExp(
      `https://${S3_CONFIG.BUCKET_NAME}\\.s3\\.${config.AWS_REGION}\\.amazonaws\\.com/(.+)`,
    );
    const match = url.match(s3UrlPattern);
    return match ? match[1] : null;
  } catch (error) {
    return null;
  }
};

/**
 * Generate S3 key for file upload
 * Creates a structured key path for S3 storage
 */
export const generateS3Key = (
  folder: keyof typeof S3_CONFIG.FOLDERS,
  filename: string,
  subFolder?: string,
): string => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");

  const folderPath = S3_CONFIG.FOLDERS[folder];
  const keyParts: string[] = [folderPath];

  if (subFolder) {
    keyParts.push(subFolder);
  }

  keyParts.push(`${timestamp}_${randomString}_${sanitizedFilename}`);

  return keyParts.join("/");
};

export default s3Client;
