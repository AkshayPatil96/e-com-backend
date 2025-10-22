import { NextFunction, Request, Response } from "express";
import multer from "multer";
import multerS3 from "multer-s3";
import {
  IFileValidationOptions,
  IS3FileUpload,
  IS3MulterFile,
  IS3UploadOptions,
  S3ErrorCodes,
} from "../@types/s3.type";
import { S3_CONFIG, s3Client } from "../config/aws/s3.config";
import { s3UploadService } from "../services/aws/s3-upload.service";
import ErrorHandler from "../utils/ErrorHandler";
import { loggerHelpers } from "../utils/logger";

/**
 * Extended Request interface to include uploaded files
 */
export interface IRequestWithFiles extends Request {
  uploadedFiles?: {
    [fieldname: string]: IS3MulterFile | IS3MulterFile[];
  };
  s3UploadResults?: any;
}

/**
 * S3 Upload Middleware Configuration Options
 */
export interface IS3MiddlewareOptions {
  folder: "brands" | "categories" | "products" | "users" | "documents" | "temp";
  subFolder?: string;
  processImage?: boolean;
  imageConfig?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: "webp" | "jpeg" | "png";
  };
  fileValidation?: IFileValidationOptions;
  fieldConfig?: {
    single?: string; // Field name for single file
    multiple?: { name: string; maxCount?: number }; // Field config for multiple files
    fields?: { name: string; maxCount?: number }[]; // Multiple field configs
  };
  allowPublic?: boolean;
}

/**
 * Create Multer S3 configuration
 */
const createMulterS3Config = (options: IS3MiddlewareOptions) => {
  return multerS3({
    s3: s3Client,
    bucket: S3_CONFIG.BUCKET_NAME,
    acl: options.allowPublic !== false ? "public-read" : "private",
    contentType: multerS3.AUTO_CONTENT_TYPE,

    // Generate S3 key
    key: (req: Request, file: Express.Multer.File, cb) => {
      try {
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 8);
        const sanitizedFilename = file.originalname.replace(
          /[^a-zA-Z0-9.-]/g,
          "_",
        );

        const folderMapping: Record<string, string> = {
          brands: S3_CONFIG.FOLDERS.BRANDS,
          categories: S3_CONFIG.FOLDERS.CATEGORIES,
          products: S3_CONFIG.FOLDERS.PRODUCTS,
          users: S3_CONFIG.FOLDERS.USERS,
          documents: S3_CONFIG.FOLDERS.DOCUMENTS,
          temp: S3_CONFIG.FOLDERS.TEMP,
        };

        const folderPath = folderMapping[options.folder];
        const keyParts: string[] = [folderPath];

        if (options.subFolder) {
          keyParts.push(options.subFolder);
        }

        keyParts.push(`${timestamp}_${randomString}_${sanitizedFilename}`);
        const key = keyParts.join("/");

        cb(null, key);
      } catch (error) {
        cb(error as Error);
      }
    },

    // Set cache control
    cacheControl: S3_CONFIG.CACHE_CONTROL.IMAGES,

    // Set metadata
    metadata: (req: Request, file: Express.Multer.File, cb) => {
      cb(null, {
        uploadedBy: (req as any).user?.id || "anonymous",
        uploadedAt: new Date().toISOString(),
        originalName: file.originalname,
        folder: options.folder,
      });
    },
  });
};

/**
 * File filter function for Multer
 */
const createFileFilter = (options: IS3MiddlewareOptions) => {
  return (
    req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback,
  ) => {
    try {
      // Get allowed types for the folder
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

      const allowedTypes =
        options.fileValidation?.allowedTypes ||
        getAllowedTypesForFolder(options.folder);

      // Check file type
      if (!allowedTypes.includes(file.mimetype)) {
        const error = new Error(
          `File type ${file.mimetype} is not allowed for ${options.folder}`,
        ) as any;
        error.code = S3ErrorCodes.INVALID_FILE_TYPE;
        return cb(error);
      }

      // Check file extension if specified
      if (options.fileValidation?.allowedExtensions) {
        const extension = file.originalname.split(".").pop()?.toLowerCase();
        if (
          !extension ||
          !options.fileValidation.allowedExtensions.includes(extension)
        ) {
          const error = new Error(
            `File extension .${extension} is not allowed`,
          ) as any;
          error.code = S3ErrorCodes.INVALID_FILE_TYPE;
          return cb(error);
        }
      }

      cb(null, true);
    } catch (error) {
      cb(error as Error);
    }
  };
};

/**
 * Create Multer instance with S3 configuration
 */
const createMulterInstance = (options: IS3MiddlewareOptions) => {
  const storage = createMulterS3Config(options);
  const fileFilter = createFileFilter(options);

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: options.fileValidation?.maxSize || S3_CONFIG.MAX_FILE_SIZE,
      files: 10, // Max 10 files per request
    },
  });
};

/**
 * S3 Upload Middleware Factory
 * Creates middleware for handling file uploads to S3
 */
export const createS3UploadMiddleware = (options: IS3MiddlewareOptions) => {
  const upload = createMulterInstance(options);

  // Determine upload type based on field configuration
  let multerMiddleware: any;

  if (options.fieldConfig?.single) {
    multerMiddleware = upload.single(options.fieldConfig.single);
  } else if (options.fieldConfig?.multiple) {
    multerMiddleware = upload.array(
      options.fieldConfig.multiple.name,
      options.fieldConfig.multiple.maxCount || 5,
    );
  } else if (options.fieldConfig?.fields) {
    multerMiddleware = upload.fields(options.fieldConfig.fields);
  } else {
    multerMiddleware = upload.any(); // Accept any field names
  }

  return [
    // Multer middleware
    multerMiddleware,

    // Post-processing middleware
    async (req: IRequestWithFiles, res: Response, next: NextFunction) => {
      try {
        // Add uploaded file info to request
        req.uploadedFiles = {};

        if (req.file) {
          req.uploadedFiles[req.file.fieldname] = req.file as IS3MulterFile;

          loggerHelpers.business("s3_file_uploaded_direct", {
            key: (req.file as any).key,
            size: req.file.size,
            mimetype: req.file.mimetype,
            location: (req.file as any).location,
          });
        }

        if (req.files) {
          if (Array.isArray(req.files)) {
            req.files.forEach((file: any) => {
              if (!req.uploadedFiles![file.fieldname]) {
                req.uploadedFiles![file.fieldname] = [];
              }
              if (Array.isArray(req.uploadedFiles![file.fieldname])) {
                (req.uploadedFiles![file.fieldname] as IS3MulterFile[]).push(
                  file,
                );
              } else {
                req.uploadedFiles![file.fieldname] = [
                  req.uploadedFiles![file.fieldname] as IS3MulterFile,
                  file,
                ];
              }

              loggerHelpers.business("s3_file_uploaded_direct", {
                key: file.key,
                size: file.size,
                mimetype: file.mimetype,
                location: file.location,
              });
            });
          } else {
            Object.entries(req.files).forEach(([fieldname, files]) => {
              req.uploadedFiles![fieldname] = files as
                | IS3MulterFile
                | IS3MulterFile[];

              const fileArray = Array.isArray(files) ? files : [files];
              fileArray.forEach((file: any) => {
                loggerHelpers.business("s3_file_uploaded_direct", {
                  key: file.key,
                  size: file.size,
                  mimetype: file.mimetype,
                  location: file.location,
                });
              });
            });
          }
        }

        next();
      } catch (error) {
        next(
          new ErrorHandler(
            500,
            `File upload processing failed: ${(error as Error).message}`,
          ),
        );
      }
    },
  ];
};

/**
 * Pre-configured middleware for common use cases
 */

// Brand logo upload (single file)
export const brandLogoUpload = createS3UploadMiddleware({
  folder: "brands",
  subFolder: "logos",
  processImage: true,
  imageConfig: S3_CONFIG.IMAGE_PROCESSING.BRAND_LOGO,
  fieldConfig: { single: "logo" },
  fileValidation: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: [...S3_CONFIG.ALLOWED_IMAGE_TYPES],
  },
});

// Brand banner upload (single file)
export const brandBannerUpload = createS3UploadMiddleware({
  folder: "brands",
  subFolder: "banners",
  processImage: true,
  imageConfig: S3_CONFIG.IMAGE_PROCESSING.BRAND_BANNER,
  fieldConfig: { single: "banner" },
  fileValidation: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: [...S3_CONFIG.ALLOWED_IMAGE_TYPES],
  },
});

// Product images upload (multiple files)
export const productImagesUpload = createS3UploadMiddleware({
  folder: "products",
  subFolder: "images",
  processImage: true,
  imageConfig: S3_CONFIG.IMAGE_PROCESSING.PRODUCT_MAIN,
  fieldConfig: { multiple: { name: "images", maxCount: 10 } },
  fileValidation: {
    maxSize: 8 * 1024 * 1024, // 8MB per file
    allowedTypes: [...S3_CONFIG.ALLOWED_IMAGE_TYPES],
  },
});

// Category image upload (single file)
export const categoryImageUpload = createS3UploadMiddleware({
  folder: "categories",
  subFolder: "images",
  processImage: true,
  imageConfig: S3_CONFIG.IMAGE_PROCESSING.CATEGORY_IMAGE,
  fieldConfig: { single: "image" },
  fileValidation: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: [...S3_CONFIG.ALLOWED_IMAGE_TYPES],
  },
});

// User avatar upload (single file)
export const userAvatarUpload = createS3UploadMiddleware({
  folder: "users",
  subFolder: "avatars",
  processImage: true,
  imageConfig: S3_CONFIG.IMAGE_PROCESSING.USER_AVATAR,
  fieldConfig: { single: "avatar" },
  fileValidation: {
    maxSize: 2 * 1024 * 1024, // 2MB
    allowedTypes: [...S3_CONFIG.ALLOWED_IMAGE_TYPES],
  },
});

// Document upload (single file)
export const documentUpload = createS3UploadMiddleware({
  folder: "documents",
  processImage: false,
  fieldConfig: { single: "document" },
  fileValidation: {
    maxSize: 20 * 1024 * 1024, // 20MB
    allowedTypes: [...S3_CONFIG.ALLOWED_DOCUMENT_TYPES],
  },
});

// Generic file upload (any files)
export const genericFileUpload = createS3UploadMiddleware({
  folder: "temp",
  processImage: false,
  fieldConfig: { multiple: { name: "files", maxCount: 5 } },
  fileValidation: {
    maxSize: S3_CONFIG.MAX_FILE_SIZE,
  },
});

/**
 * Error handling middleware for S3 uploads
 */
export const handleS3UploadError = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (error) {
    loggerHelpers.system("s3_upload_middleware_error", {
      error: error.message,
      code: error.code,
      field: error.field,
    });

    // Handle specific Multer errors
    if (error.code === "LIMIT_FILE_SIZE") {
      return next(new ErrorHandler(400, "File size too large"));
    }

    if (error.code === "LIMIT_FILE_COUNT") {
      return next(new ErrorHandler(400, "Too many files uploaded"));
    }

    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return next(new ErrorHandler(400, "Unexpected file field"));
    }

    if (error.code === S3ErrorCodes.INVALID_FILE_TYPE) {
      return next(new ErrorHandler(400, error.message));
    }

    // Generic upload error
    return next(new ErrorHandler(500, `File upload failed: ${error.message}`));
  }

  next();
};

/**
 * Middleware to clean up uploaded files on error
 */
export const cleanupS3FilesOnError = async (
  req: IRequestWithFiles,
  res: Response,
  next: NextFunction,
) => {
  // Store original end function
  const originalEnd = res.end;
  const originalSend = res.send;

  let responseSent = false;

  // Override response methods to detect errors
  res.end = function (chunk?: any, encoding?: any) {
    responseSent = true;
    return originalEnd.call(this, chunk, encoding);
  };

  res.send = function (body?: any) {
    responseSent = true;
    return originalSend.call(this, body);
  };

  // Handle errors
  const errorHandler = async (error: any) => {
    if (!responseSent && req.uploadedFiles) {
      // Clean up uploaded files
      const cleanupPromises: Promise<any>[] = [];

      Object.values(req.uploadedFiles).forEach((fileOrFiles) => {
        if (Array.isArray(fileOrFiles)) {
          fileOrFiles.forEach((file) => {
            if ((file as any).key) {
              cleanupPromises.push(
                s3UploadService.deleteFile({ key: (file as any).key }),
              );
            }
          });
        } else if ((fileOrFiles as any).key) {
          cleanupPromises.push(
            s3UploadService.deleteFile({ key: (fileOrFiles as any).key }),
          );
        }
      });

      try {
        await Promise.all(cleanupPromises);
        loggerHelpers.business("s3_files_cleaned_up_on_error", {
          fileCount: cleanupPromises.length,
          error: error.message,
        });
      } catch (cleanupError) {
        loggerHelpers.system("s3_cleanup_failed", {
          error: (cleanupError as Error).message,
          originalError: error.message,
        });
      }
    }
  };

  // Add error handler to response
  res.on("error", errorHandler);

  // Continue to next middleware
  next();
};

export default {
  createS3UploadMiddleware,
  brandLogoUpload,
  brandBannerUpload,
  productImagesUpload,
  categoryImageUpload,
  userAvatarUpload,
  documentUpload,
  genericFileUpload,
  handleS3UploadError,
  cleanupS3FilesOnError,
};
