import { NextFunction, Request, Response } from "express";
import {
  IBrandAdminFilters,
  IBrandBulkActionBody,
  ICreateBrandAdminBody,
  IUpdateBrandAdminBody,
} from "../../../@types/brand-admin.type";
import { IUser } from "../../../@types/user.type";
import { S3_CONFIG, buildS3Url } from "../../../config/aws/s3.config";
import config from "../../../config/index";
import { CatchAsyncErrors } from "../../../middleware/catchAsyncErrors";
import {
  copyFile,
  deleteFile,
  generatePresignedUrl,
  s3UploadService,
} from "../../../services/aws/s3-upload.service";
import ErrorHandler from "../../../utils/ErrorHandler";
import { loggerHelpers } from "../../../utils/logger";
import { s3Utils } from "../../../utils/s3.utils";
import brandService from "../../services/brand/brand.service";

// Extend Request interface to include user
interface AuthenticatedRequest extends Request {
  user?: IUser;
}

// ================================
// HELPER FUNCTIONS FOR BRAND ASSETS
// ================================

/**
 * Helper function to delete brand asset from S3 and database
 */
const deleteBrandAsset = async (
  brandId: string,
  assetType: "logo" | "banner",
  currentUser: IUser,
) => {
  // Get the current brand to access asset data
  const brand = await brandService.getBrandByIdAdmin(brandId);
  if (!brand) {
    throw new Error("Brand not found");
  }

  const assetData = brand[assetType] as any; // Type assertion to handle union type
  console.log("<=============== assetData: ===============>", assetData);
  if (!assetData) {
    throw new Error(`Brand has no ${assetType} to delete`);
  }

  loggerHelpers.business(`brand_${assetType}_delete_attempt`, {
    brandId,
    assetUrl: typeof assetData === "string" ? assetData : assetData.url,
    s3Key:
      typeof assetData === "object" && assetData.s3Key
        ? assetData.s3Key
        : undefined,
    updatedBy: currentUser._id?.toString(),
  });

  // Delete from S3 if s3Key exists and it's an object with s3Key
  if (typeof assetData === "object" && assetData.s3Key) {
    console.log(
      "<============== assetData.s3Key: =====================>",
      assetData.s3Key,
    );
    try {
      const deleteResult = await s3UploadService.deleteFile({
        key: assetData.s3Key,
      });
      console.log(
        "<============== deleteResult: =====================>",
        deleteResult,
      );

      if (!deleteResult.success) {
        loggerHelpers.system(`brand_${assetType}_s3_delete_warning`, {
          brandId,
          s3Key: assetData.s3Key,
          error:
            deleteResult.success === false
              ? deleteResult.error
              : "Delete operation failed",
          currentUserId: currentUser._id?.toString(),
        });
        // Continue with DB update even if S3 delete fails
      }
    } catch (error) {
      loggerHelpers.system(`brand_${assetType}_s3_delete_error`, {
        brandId,
        s3Key: assetData.s3Key,
        error: (error as Error).message,
        currentUserId: currentUser._id?.toString(),
      });
      // Continue with DB update even if S3 delete fails
    }
  }

  // Remove asset from database using $unset operation
  const updateData = {
    $unset: { [assetType]: 1 },
  };
  console.log("<============ updateData: ================>", updateData);
  const updatedBrand = await brandService.updateBrandRaw(
    brandId,
    updateData,
    currentUser._id.toString(),
  );

  if (!updatedBrand) {
    throw new Error("Brand not found after update");
  }

  loggerHelpers.business(`brand_${assetType}_deleted`, {
    brandId,
    assetUrl: typeof assetData === "string" ? assetData : assetData.url,
    s3Key:
      typeof assetData === "object" && assetData.s3Key
        ? assetData.s3Key
        : undefined,
    updatedBy: currentUser._id?.toString(),
  });

  return {
    success: true,
    message: `Brand ${assetType} deleted successfully`,
    data: {
      brandId,
      [`deleted${assetType.charAt(0).toUpperCase() + assetType.slice(1)}`]: {
        url: typeof assetData === "string" ? assetData : assetData.url,
        s3Key:
          typeof assetData === "object" && assetData.s3Key
            ? assetData.s3Key
            : undefined,
      },
      deletedAt: new Date(),
    },
  };
};

/**
 * Helper function to process external URL for brand asset
 */
const processExternalUrlAsset = async (
  externalUrl: string,
  assetType: "logo" | "banner",
) => {
  const originalFilename =
    externalUrl.split("/").pop()?.split("?")[0] || assetType;

  const result = await s3Utils.uploadFileFromUrl(
    externalUrl,
    "brands",
    originalFilename,
    {
      subFolder: `${assetType}s`,
      processImage: true,
      brandContext: {
        imageType: assetType,
      },
      timeout: 30000,
      maxSize: 20 * 1024 * 1024, // 20MB
      makePublic: true,
    },
  );

  if (!result.success) {
    throw new Error(
      `Failed to process external URL: ${result.success === false ? result.error : "Processing failed"}`,
    );
  }

  const defaultDimensions = {
    logo: { width: 300, height: 300 },
    banner: { width: 1200, height: 400 },
  };

  return {
    url: result.data.url!,
    alt: `Brand ${assetType}`,
    s3Key: result.data.key!,
    bucket: S3_CONFIG.BUCKET_NAME,
    width: result.data.metadata?.width || defaultDimensions[assetType].width,
    height: result.data.metadata?.height || defaultDimensions[assetType].height,
    size: result.data.metadata?.size || result.data.size || 0,
    format: result.data.metadata?.format || "webp",
    uploadMethod: "external_url",
    originalUrl: externalUrl,
    isPrimary: false,
    isProcessed: true,
    processingStatus: "completed",
    uploadedAt: new Date(),
    processedAt: new Date(),
  };
};

/**
 * Helper function to process asset data from presigned upload
 */
const processAssetData = (assetData: any, assetType: "logo" | "banner") => {
  const defaultDimensions = {
    logo: { width: 300, height: 300 },
    banner: { width: 1200, height: 400 },
  };

  return {
    url: assetData.url,
    alt: assetData.alt || `Brand ${assetType}`,
    s3Key: assetData.s3Key,
    bucket: assetData.bucket || S3_CONFIG.BUCKET_NAME,
    width: assetData.width || defaultDimensions[assetType].width,
    height: assetData.height || defaultDimensions[assetType].height,
    size: assetData.size || 0,
    format: assetData.format || "webp",
    uploadMethod: assetData.uploadMethod || "presigned",
    originalUrl: assetData.originalUrl,
    isPrimary: assetData.isPrimary || false,
    isProcessed:
      assetData.isProcessed !== undefined ? assetData.isProcessed : true,
    processingStatus: assetData.processingStatus || "completed",
    uploadedAt: assetData.uploadedAt
      ? new Date(assetData.uploadedAt)
      : new Date(),
    processedAt: assetData.processedAt
      ? new Date(assetData.processedAt)
      : new Date(),
  };
};

const brandController = {
  /**
   * Get all brands with filtering, sorting, and pagination for admin panel
   * @route GET /admin/brands
   * @access Admin with brands.canView permission
   */
  getAllBrandsAdmin: CatchAsyncErrors(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const currentUser = req.user;

      loggerHelpers.business("brand_admin_list_view_attempt", {
        currentUserId: currentUser?._id?.toString(),
        ip: req.ip,
      });

      // Extract and validate query parameters
      const filters: IBrandAdminFilters = {
        page: Math.max(1, parseInt(req.query.page as string) || 1),
        limit: Math.min(
          100,
          Math.max(1, parseInt(req.query.limit as string) || 20),
        ),
        search: ((req.query.search as string) || "").trim().substring(0, 100),
        status: (req.query.status as "all" | "active" | "inactive") || "all",
        featured:
          (req.query.featured as "all" | "featured" | "not-featured") || "all",
        isDeleted: req.query.isDeleted === "true",
        sortBy: (req.query.sortBy as any) || "order",
        sortOrder: (req.query.sortOrder as "asc" | "desc") || "asc",
        showInMenu:
          req.query.showInMenu !== undefined
            ? req.query.showInMenu === "true"
            : undefined,
        showInHomepage:
          req.query.showInHomepage !== undefined
            ? req.query.showInHomepage === "true"
            : undefined,
      };

      try {
        // Validate enum values
        const validStatus = ["all", "active", "inactive"];
        const validFeatured = ["all", "featured", "not-featured"];
        const validSortBy = [
          "name",
          "createdAt",
          "order",
          "productCount",
          "viewCount",
        ];
        const validSortOrder = ["asc", "desc"];

        if (!validStatus.includes(filters.status)) {
          return next(ErrorHandler.validation("Invalid status filter value"));
        }
        if (!validFeatured.includes(filters.featured)) {
          return next(ErrorHandler.validation("Invalid featured filter value"));
        }
        if (!validSortBy.includes(filters.sortBy)) {
          return next(ErrorHandler.validation("Invalid sortBy value"));
        }
        if (!validSortOrder.includes(filters.sortOrder)) {
          return next(ErrorHandler.validation("Invalid sortOrder value"));
        }

        const result = await brandService.getAllBrandsAdmin(filters);

        loggerHelpers.business("brand_admin_list_viewed", {
          currentUserId: currentUser?._id?.toString(),
          currentUserRole: currentUser?.role,
          brandCount: result.data.length,
          totalCount: result.totalCount,
          filters: {
            search: filters.search,
            status: filters.status,
            featured: filters.featured,
            isDeleted: filters.isDeleted,
          },
          pagination: {
            page: filters.page,
            limit: filters.limit,
          },
          ip: req.ip,
        });

        res.status(200).json({
          success: true,
          message: "Brands retrieved successfully",
          data: result,
        });
      } catch (error) {
        loggerHelpers.system("brand_admin_list_error", {
          currentUserId: currentUser?._id?.toString(),
          error: (error as Error).message,
          stack: (error as Error).stack,
          filters: {
            page: filters.page,
            limit: filters.limit,
            search: filters.search,
          },
          ip: req.ip,
        });
        return next(new ErrorHandler(500, "Failed to get brands"));
      }
    },
  ),

  /**
   * Get single brand by ID for admin
   * @route GET /admin/brands/:id
   * @access Admin with brands.canView permission
   */
  getBrandByIdAdmin: CatchAsyncErrors(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const { id } = req.params;
      const currentUser = req.user;

      // Log brand view attempt
      loggerHelpers.business("brand_admin_view_attempt", {
        currentUserId: currentUser?._id?.toString(),
        brandId: id,
        ip: req.ip,
      });

      if (!id) {
        return next(ErrorHandler.validation("Brand ID is required"));
      }

      try {
        const brand = await brandService.getBrandByIdAdmin(id);

        if (!brand) {
          return next(ErrorHandler.notFound("Brand not found"));
        }

        loggerHelpers.business("brand_admin_viewed", {
          currentUserId: currentUser?._id?.toString(),
          brandId: id,
          brandName: brand.name,
          ip: req.ip,
        });

        res.status(200).json({
          success: true,
          message: "Brand retrieved successfully",
          data: brand,
        });
      } catch (error) {
        loggerHelpers.system("brand_admin_view_error", {
          currentUserId: currentUser?._id?.toString(),
          brandId: id,
          error: (error as Error).message,
          ip: req.ip,
        });
        return next(new ErrorHandler(500, "Failed to get brand"));
      }
    },
  ),

  /**
   * Create new brand
   * @route POST /admin/brands
   * @access Admin with brands.canCreate permission
   */
  createBrand: CatchAsyncErrors(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const requestData = req.body;
      const currentUser = req.user;

      // Handle processed images from presigned uploads or external URLs
      let logoData: any = undefined;
      let bannerData: any = undefined;

      // Process logo if provided
      if (requestData.logo) {
        if (typeof requestData.logo === "string") {
          // It's a URL (external or processed)
          logoData = {
            url: requestData.logo,
            alt: `${requestData.name} logo`,
            uploadMethod: s3Utils.isExternalImageUrl(requestData.logo)
              ? "external_url"
              : "presigned",
            uploadedAt: new Date(),
          };
        } else if (typeof requestData.logo === "object") {
          // It's a processed image object from presigned upload
          logoData = {
            url: requestData.logo.url,
            alt: requestData.logo.alt || `${requestData.name} logo`,
            s3Key: requestData.logo.s3Key,
            bucket: requestData.logo.bucket || S3_CONFIG.BUCKET_NAME,
            width: requestData.logo.width,
            height: requestData.logo.height,
            size: requestData.logo.size,
            format: requestData.logo.format || "webp",
            uploadMethod: requestData.logo.uploadMethod || "presigned",
            originalUrl: requestData.logo.originalUrl,
            isProcessed: true,
            processingStatus: "completed",
            uploadedAt: requestData.logo.uploadedAt || new Date(),
            processedAt: requestData.logo.processedAt || new Date(),
          };
        }
      }

      // Process banner if provided
      if (requestData.banner) {
        if (typeof requestData.banner === "string") {
          // It's a URL (external or processed)
          bannerData = {
            url: requestData.banner,
            alt: `${requestData.name} banner`,
            uploadMethod: s3Utils.isExternalImageUrl(requestData.banner)
              ? "external_url"
              : "presigned",
            uploadedAt: new Date(),
          };
        } else if (typeof requestData.banner === "object") {
          // It's a processed image object from presigned upload
          bannerData = {
            url: requestData.banner.url,
            alt: requestData.banner.alt || `${requestData.name} banner`,
            s3Key: requestData.banner.s3Key,
            bucket: requestData.banner.bucket || S3_CONFIG.BUCKET_NAME,
            width: requestData.banner.width,
            height: requestData.banner.height,
            size: requestData.banner.size,
            format: requestData.banner.format || "webp",
            uploadMethod: requestData.banner.uploadMethod || "presigned",
            originalUrl: requestData.banner.originalUrl,
            isProcessed: true,
            processingStatus: "completed",
            uploadedAt: requestData.banner.uploadedAt || new Date(),
            processedAt: requestData.banner.processedAt || new Date(),
          };
        }
      }

      // Map frontend fields to backend expected format
      const brandData: ICreateBrandAdminBody = {
        name: requestData.name,
        description: requestData.description,
        shortDescription: requestData.shortDescription,
        categories: requestData.categories,
        logo: logoData,
        banner: bannerData,
        businessInfo: requestData.businessInfo,
        socialMedia: requestData.socialMedia,
        seo: requestData.seo,
        order: requestData.order,
        isActive:
          requestData.isActive !== undefined ? requestData.isActive : true,
        isFeatured:
          requestData.isFeatured !== undefined ? requestData.isFeatured : false,
        showInMenu:
          requestData.showInMenu !== undefined ? requestData.showInMenu : true,
        showInHomepage:
          requestData.showInHomepage !== undefined
            ? requestData.showInHomepage
            : false,
        ...requestData,
      };
      console.log("<=========== brandData: =================>", brandData);

      // Log brand creation attempt
      loggerHelpers.business("brand_admin_create_attempt", {
        currentUserId: currentUser?._id?.toString(),
        brandName: brandData.name,
        hasLogo: !!logoData,
        hasBanner: !!bannerData,
        ip: req.ip,
      });

      // Validate required fields
      if (!brandData.name) {
        return next(
          ErrorHandler.validation("Brand name is required", {
            field: "name",
            code: "MISSING_NAME",
          }),
        );
      }

      if (
        brandData.name.trim().length < 2 ||
        brandData.name.trim().length > 100
      ) {
        return next(
          ErrorHandler.validation(
            "Brand name must be between 2-100 characters",
            {
              field: "name",
              minLength: 2,
              maxLength: 100,
            },
          ),
        );
      }

      if (!brandData.description) {
        return next(
          ErrorHandler.validation("Brand description is required", {
            field: "description",
            code: "MISSING_DESCRIPTION",
          }),
        );
      }

      // Validate optional fields
      if (brandData.description && brandData.description.length > 2000) {
        return next(
          ErrorHandler.validation(
            "Description must not exceed 2000 characters",
            {
              field: "description",
              maxLength: 2000,
            },
          ),
        );
      }

      if (
        brandData.shortDescription &&
        brandData.shortDescription.length > 300
      ) {
        return next(
          ErrorHandler.validation(
            "Short description must not exceed 300 characters",
            {
              field: "shortDescription",
              maxLength: 300,
            },
          ),
        );
      }

      if (
        brandData.order !== undefined &&
        (brandData.order < 0 || brandData.order > 9999)
      ) {
        return next(
          ErrorHandler.validation("Order must be between 0-9999", {
            field: "order",
            min: 0,
            max: 9999,
          }),
        );
      }

      // Validate SEO fields if provided
      if (brandData.seo?.metaTitle && brandData.seo.metaTitle.length > 60) {
        return next(
          ErrorHandler.validation("Meta title must not exceed 60 characters", {
            field: "seo.metaTitle",
            maxLength: 60,
          }),
        );
      }

      if (
        brandData.seo?.metaDescription &&
        brandData.seo.metaDescription.length > 160
      ) {
        return next(
          ErrorHandler.validation(
            "Meta description must not exceed 160 characters",
            {
              field: "seo.metaDescription",
              maxLength: 160,
            },
          ),
        );
      }

      // Validate email if provided
      if (brandData.businessInfo?.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(brandData.businessInfo.email)) {
          return next(
            ErrorHandler.validation("Invalid email format", {
              field: "businessInfo.email",
              code: "INVALID_EMAIL",
            }),
          );
        }
      }

      try {
        const brand = await brandService.createBrand(
          brandData,
          currentUser!._id.toString(),
        );

        loggerHelpers.business("brand_admin_created", {
          currentUserId: currentUser?._id?.toString(),
          brandId: brand._id.toString(),
          brandName: brand.name,
          ip: req.ip,
        });

        res.status(201).json({
          success: true,
          message: "Brand created successfully",
          data: brand,
        });
      } catch (error) {
        if ((error as Error).message.includes("already exists")) {
          return next(
            ErrorHandler.validation("Brand with this name already exists", {
              field: "name",
              value: brandData.name,
            }),
          );
        }

        loggerHelpers.system("brand_admin_create_error", {
          currentUserId: currentUser?._id?.toString(),
          brandName: brandData.name,
          error: (error as Error).message,
          ip: req.ip,
        });
        return next(new ErrorHandler(500, "Failed to create brand"));
      }
    },
  ),

  /**
   * Update brand
   * @route PUT /admin/brands/:id
   * @access Admin with brands.canEdit permission
   */
  updateBrand: CatchAsyncErrors(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const { id } = req.params;
      const requestData = req.body;
      const currentUser = req.user;

      // Log brand update attempt
      loggerHelpers.business("brand_admin_update_attempt", {
        currentUserId: currentUser?._id?.toString(),
        brandId: id,
        updateFields: Object.keys(requestData),
        ip: req.ip,
      });

      if (!id) {
        return next(ErrorHandler.validation("Brand ID is required"));
      }

      // Map frontend fields to backend format
      const updateData: IUpdateBrandAdminBody = {
        name: requestData.name,
        description: requestData.description,
        shortDescription: requestData.shortDescription,
        logo: requestData.logo,
        banner: requestData.banner,
        businessInfo: requestData.businessInfo,
        socialMedia: requestData.socialMedia,
        seo: requestData.seo,
        order: requestData.order,
        isActive: requestData.isActive,
        isFeatured: requestData.isFeatured,
        showInMenu: requestData.showInMenu,
        showInHomepage: requestData.showInHomepage,
        ...requestData,
      };

      // Remove undefined fields
      Object.keys(updateData).forEach((key) => {
        if (updateData[key as keyof IUpdateBrandAdminBody] === undefined) {
          delete updateData[key as keyof IUpdateBrandAdminBody];
        }
      });

      // Validate update fields
      if (updateData.name !== undefined) {
        if (
          !updateData.name ||
          updateData.name.trim().length < 2 ||
          updateData.name.trim().length > 100
        ) {
          return next(
            ErrorHandler.validation(
              "Brand name must be between 2-100 characters",
              {
                field: "name",
                minLength: 2,
                maxLength: 100,
              },
            ),
          );
        }
      }

      if (
        updateData.description !== undefined &&
        updateData.description.length > 2000
      ) {
        return next(
          ErrorHandler.validation(
            "Description must not exceed 2000 characters",
            {
              field: "description",
              maxLength: 2000,
            },
          ),
        );
      }

      if (
        updateData.shortDescription !== undefined &&
        updateData.shortDescription.length > 300
      ) {
        return next(
          ErrorHandler.validation(
            "Short description must not exceed 300 characters",
            {
              field: "shortDescription",
              maxLength: 300,
            },
          ),
        );
      }

      if (
        updateData.order !== undefined &&
        (updateData.order < 0 || updateData.order > 9999)
      ) {
        return next(
          ErrorHandler.validation("Order must be between 0-9999", {
            field: "order",
            min: 0,
            max: 9999,
          }),
        );
      }

      // Validate SEO fields if provided
      if (updateData.seo?.metaTitle && updateData.seo.metaTitle.length > 60) {
        return next(
          ErrorHandler.validation("Meta title must not exceed 60 characters", {
            field: "seo.metaTitle",
            maxLength: 60,
          }),
        );
      }

      if (
        updateData.seo?.metaDescription &&
        updateData.seo.metaDescription.length > 160
      ) {
        return next(
          ErrorHandler.validation(
            "Meta description must not exceed 160 characters",
            {
              field: "seo.metaDescription",
              maxLength: 160,
            },
          ),
        );
      }

      // Validate email if provided
      if (updateData.businessInfo?.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(updateData.businessInfo.email)) {
          return next(
            ErrorHandler.validation("Invalid email format", {
              field: "businessInfo.email",
              code: "INVALID_EMAIL",
            }),
          );
        }
      }

      try {
        const updatedBrand = await brandService.updateBrand(
          id,
          updateData,
          currentUser!._id.toString(),
        );

        if (!updatedBrand) {
          return next(ErrorHandler.notFound("Brand not found"));
        }

        loggerHelpers.business("brand_admin_updated", {
          currentUserId: currentUser?._id?.toString(),
          brandId: id,
          brandName: updatedBrand.name,
          updateFields: Object.keys(updateData),
          ip: req.ip,
        });

        res.status(200).json({
          success: true,
          message: "Brand updated successfully",
          data: updatedBrand,
        });
      } catch (error) {
        if ((error as Error).message.includes("already exists")) {
          return next(
            ErrorHandler.validation("Brand with this name already exists", {
              field: "name",
              value: updateData.name,
            }),
          );
        }

        loggerHelpers.system("brand_admin_update_error", {
          currentUserId: currentUser?._id?.toString(),
          brandId: id,
          error: (error as Error).message,
          ip: req.ip,
        });
        return next(new ErrorHandler(500, "Failed to update brand"));
      }
    },
  ),

  /**
   * Soft delete brand
   * @route DELETE /admin/brands/:id
   * @access Admin with brands.canDelete permission
   */
  deleteBrand: CatchAsyncErrors(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const { id } = req.params;
      const currentUser = req.user;

      // Log brand delete attempt
      loggerHelpers.business("brand_admin_delete_attempt", {
        currentUserId: currentUser?._id?.toString(),
        brandId: id,
        ip: req.ip,
      });

      if (!id) {
        return next(ErrorHandler.validation("Brand ID is required"));
      }

      try {
        const deleted = await brandService.deleteBrand(id);

        if (!deleted) {
          return next(ErrorHandler.notFound("Brand not found"));
        }

        loggerHelpers.business("brand_admin_deleted", {
          currentUserId: currentUser?._id?.toString(),
          brandId: id,
          ip: req.ip,
        });

        res.status(200).json({
          success: true,
          message: "Brand deleted successfully",
          data: {
            brandId: id,
            deletedAt: new Date(),
          },
        });
      } catch (error) {
        if ((error as Error).message.includes("products")) {
          return next(
            ErrorHandler.validation(
              "Cannot delete brand with products. Move or delete products first.",
              {
                code: "HAS_PRODUCTS",
              },
            ),
          );
        }

        loggerHelpers.system("brand_admin_delete_error", {
          currentUserId: currentUser?._id?.toString(),
          brandId: id,
          error: (error as Error).message,
          ip: req.ip,
        });
        return next(new ErrorHandler(500, "Failed to delete brand"));
      }
    },
  ),

  /**
   * Restore deleted brand
   * @route PUT /admin/brands/:id/restore
   * @access Admin with brands.canDelete permission
   */
  restoreBrand: CatchAsyncErrors(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const { id } = req.params;
      const currentUser = req.user;

      // Log brand restore attempt
      loggerHelpers.business("brand_admin_restore_attempt", {
        currentUserId: currentUser?._id?.toString(),
        brandId: id,
        ip: req.ip,
      });

      if (!id) {
        return next(ErrorHandler.validation("Brand ID is required"));
      }

      try {
        const restoredBrand = await brandService.restoreBrand(id);

        if (!restoredBrand) {
          return next(ErrorHandler.notFound("Brand not found"));
        }

        loggerHelpers.business("brand_admin_restored", {
          currentUserId: currentUser?._id?.toString(),
          brandId: id,
          brandName: restoredBrand.name,
          ip: req.ip,
        });

        res.status(200).json({
          success: true,
          message: "Brand restored successfully",
          data: {
            brandId: id,
            restoredAt: new Date(),
            brand: restoredBrand,
          },
        });
      } catch (error) {
        loggerHelpers.system("brand_admin_restore_error", {
          currentUserId: currentUser?._id?.toString(),
          brandId: id,
          error: (error as Error).message,
          ip: req.ip,
        });
        return next(new ErrorHandler(500, "Failed to restore brand"));
      }
    },
  ),

  /**
   * Toggle brand status (active/inactive)
   * @route PUT /admin/brands/:id/toggle-status
   * @access Admin with brands.canEdit permission
   */
  toggleBrandStatus: CatchAsyncErrors(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const { id } = req.params;
      const currentUser = req.user;

      // Log brand status toggle attempt
      loggerHelpers.business("brand_admin_status_toggle_attempt", {
        currentUserId: currentUser?._id?.toString(),
        brandId: id,
        ip: req.ip,
      });

      if (!id) {
        return next(ErrorHandler.validation("Brand ID is required"));
      }

      try {
        const updatedBrand = await brandService.toggleBrandStatus(id);

        if (!updatedBrand) {
          return next(ErrorHandler.notFound("Brand not found"));
        }

        loggerHelpers.business("brand_admin_status_toggled", {
          currentUserId: currentUser?._id?.toString(),
          brandId: id,
          brandName: updatedBrand.name,
          newStatus: updatedBrand.isActive ? "active" : "inactive",
          ip: req.ip,
        });

        res.status(200).json({
          success: true,
          message: `Brand ${updatedBrand.isActive ? "activated" : "deactivated"} successfully`,
          data: {
            brandId: id,
            isActive: updatedBrand.isActive,
            toggledAt: new Date(),
          },
        });
      } catch (error) {
        loggerHelpers.system("brand_admin_status_toggle_error", {
          currentUserId: currentUser?._id?.toString(),
          brandId: id,
          error: (error as Error).message,
          ip: req.ip,
        });
        return next(new ErrorHandler(500, "Failed to toggle brand status"));
      }
    },
  ),

  /**
   * Search brands for autocomplete/dropdown
   * @route GET /admin/brands/search
   * @access Admin with brands.canView permission
   */
  searchBrands: CatchAsyncErrors(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const currentUser = req.user;
      const query = (req.query.q as string) || "";
      const limit = Math.min(
        50,
        Math.max(1, parseInt(req.query.limit as string) || 20),
      );
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const includeDeleted = req.query.includeDeleted === "true";

      loggerHelpers.business("brand_search_attempt", {
        currentUserId: currentUser?._id?.toString(),
        query: query.substring(0, 50), // Log truncated query for privacy
        page,
        limit,
        includeDeleted,
        ip: req.ip,
      });

      try {
        const result = await brandService.searchBrands(query, {
          limit,
          page,
          includeDeleted,
        });

        loggerHelpers.business("brand_search_completed", {
          currentUserId: currentUser?._id?.toString(),
          query: query.substring(0, 50),
          page,
          resultCount: result.results.length,
          totalCount: result.pagination.totalCount,
          hasMore: result.pagination.hasMore,
          ip: req.ip,
        });

        res.status(200).json({
          success: true,
          message:
            result.results.length > 0
              ? `Found ${result.results.length} brands`
              : "No brands found",
          data: result,
        });
      } catch (error) {
        loggerHelpers.system("brand_search_error", {
          currentUserId: currentUser?._id?.toString(),
          query: query.substring(0, 50),
          page,
          error: (error as Error).message,
          ip: req.ip,
        });
        return next(new ErrorHandler(500, "Failed to search brands"));
      }
    },
  ),

  /**
   * Get brand statistics for admin dashboard
   * @route GET /admin/brands/statistics
   * @access Admin with brands.canView permission
   */
  getBrandStatistics: CatchAsyncErrors(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const currentUser = req.user;

      // Log statistics view attempt
      loggerHelpers.business("brand_admin_statistics_view_attempt", {
        currentUserId: currentUser?._id?.toString(),
        ip: req.ip,
      });

      try {
        const statistics = await brandService.getBrandStatistics();

        loggerHelpers.business("brand_admin_statistics_viewed", {
          currentUserId: currentUser?._id?.toString(),
          totalBrands: statistics.totalBrands,
          ip: req.ip,
        });

        res.status(200).json({
          success: true,
          message: "Brand statistics retrieved successfully",
          data: statistics,
        });
      } catch (error) {
        loggerHelpers.system("brand_admin_statistics_error", {
          currentUserId: currentUser?._id?.toString(),
          error: (error as Error).message,
          ip: req.ip,
        });
        return next(new ErrorHandler(500, "Failed to get brand statistics"));
      }
    },
  ),

  /**
   * Bulk actions on brands
   * @route POST /admin/brands/bulk-action
   * @access Admin with brands.canEdit or brands.canDelete permission
   */
  bulkAction: CatchAsyncErrors(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const { brandIds, action }: IBrandBulkActionBody = req.body;
      const currentUser = req.user;

      // Log bulk action attempt
      loggerHelpers.business("brand_admin_bulk_action_attempt", {
        currentUserId: currentUser?._id?.toString(),
        action,
        brandCount: brandIds?.length,
        ip: req.ip,
      });

      // Validate input
      if (!brandIds || !Array.isArray(brandIds) || brandIds.length === 0) {
        return next(
          ErrorHandler.validation("Brand IDs array is required", {
            field: "brandIds",
            code: "MISSING_BRAND_IDS",
          }),
        );
      }

      if (brandIds.length > 100) {
        return next(
          ErrorHandler.validation(
            "Cannot perform bulk action on more than 100 brands at once",
            {
              field: "brandIds",
              maxLength: 100,
            },
          ),
        );
      }

      const validActions = [
        "activate",
        "deactivate",
        "delete",
        "restore",
        "feature",
        "unfeature",
      ];
      if (!action || !validActions.includes(action)) {
        return next(
          ErrorHandler.validation("Invalid action", {
            field: "action",
            allowedValues: validActions,
          }),
        );
      }

      try {
        const result = await brandService.bulkAction(
          brandIds,
          action,
          currentUser!._id.toString(),
        );

        loggerHelpers.business("brand_admin_bulk_action_completed", {
          currentUserId: currentUser?._id?.toString(),
          action,
          brandCount: brandIds.length,
          success: result.success,
          failed: result.failed,
          ip: req.ip,
        });

        res.status(200).json({
          success: true,
          message: `Bulk action completed. ${result.success} successful, ${result.failed} failed.`,
          data: {
            action,
            total: brandIds.length,
            success: result.success,
            failed: result.failed,
            errors: result.errors,
            completedAt: new Date(),
          },
        });
      } catch (error) {
        loggerHelpers.system("brand_admin_bulk_action_error", {
          currentUserId: currentUser?._id?.toString(),
          action,
          brandCount: brandIds.length,
          error: (error as Error).message,
          ip: req.ip,
        });
        return next(new ErrorHandler(500, "Failed to perform bulk action"));
      }
    },
  ),

  // ================================
  // PUBLIC BRAND APIS (No Auth Required)
  // ================================

  /**
   * Search brands for public use
   * @route GET /brands/search
   * @access Public
   */
  searchBrandsPublic: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const query = (req.query.q as string) || "";
      const limit = Math.min(
        50,
        Math.max(1, parseInt(req.query.limit as string) || 20),
      );
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const activeOnly = req.query.activeOnly !== "false"; // Default true

      try {
        const result = await brandService.searchBrands(query, {
          limit,
          page,
          includeDeleted: false, // Never include deleted for public
        });

        // Filter only active brands if requested
        let filteredResults = result.results;
        if (activeOnly) {
          filteredResults = result.results.filter(
            (brand: any) => brand.isActive,
          );
        }

        // Adjust pagination for filtered results
        const adjustedPagination = {
          ...result.pagination,
          count: filteredResults.length,
          hasMore: activeOnly
            ? filteredResults.length === limit && result.pagination.hasMore
            : result.pagination.hasMore,
        };

        res.status(200).json({
          success: true,
          message:
            filteredResults.length > 0
              ? `Found ${filteredResults.length} brands`
              : "No brands found",
          data: {
            results: filteredResults,
            pagination: adjustedPagination,
            query: result.query,
          },
        });
      } catch (error) {
        return next(new ErrorHandler(500, "Failed to search brands"));
      }
    },
  ),

  /**
   * Generate presigned URLs for brand asset uploads (logo/banner)
   * @route POST /admin/brands/upload-urls
   * @access Admin with brands.canCreate or brands.canEdit permission
   */
  generateUploadUrls: CatchAsyncErrors(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const { fileTypes, externalUrls } = req.body;
      const currentUser = req.user;

      loggerHelpers.business("brand_upload_urls_request", {
        currentUserId: currentUser?._id?.toString(),
        fileTypes,
        externalUrls,
        ip: req.ip,
      });

      // Validate input
      if (!fileTypes || !Array.isArray(fileTypes)) {
        return next(ErrorHandler.validation("File types array is required"));
      }

      const validFileTypes = ["logo", "banner"];
      const invalidTypes = fileTypes.filter(
        (type) => !validFileTypes.includes(type),
      );

      if (invalidTypes.length > 0) {
        return next(
          ErrorHandler.validation(
            `Invalid file types: ${invalidTypes.join(", ")}`,
          ),
        );
      }

      try {
        const uploadUrls: Record<string, any> = {};
        const externalResults: Record<string, any> = {};
        const timestamp = Date.now();
        const userId = currentUser!._id.toString();

        // Handle external URLs if provided
        if (externalUrls && typeof externalUrls === "object") {
          for (const [fileType, externalUrl] of Object.entries(externalUrls)) {
            if (
              validFileTypes.includes(fileType) &&
              typeof externalUrl === "string"
            ) {
              // Validate external URL
              if (s3Utils.isExternalImageUrl(externalUrl)) {
                try {
                  // Generate filename for the upload
                  const originalFilename =
                    externalUrl.split("/").pop()?.split("?")[0] || "image";

                  const result = await s3Utils.uploadFileFromUrl(
                    externalUrl,
                    "brands",
                    originalFilename,
                    {
                      subFolder: `${fileType}s`,
                      processImage: true,
                      brandContext: {
                        imageType: fileType as "logo" | "banner",
                      },
                      timeout: 30000,
                      maxSize: 20 * 1024 * 1024, // 20MB
                      makePublic: true,
                    },
                  );

                  console.log("result:===========> ", result);
                  if (result.success) {
                    externalResults[fileType] = {
                      success: true,
                      url: result.data.url!,
                      s3Key: result.data.key!,
                      metadata: result.data.metadata,
                    };
                  } else {
                    externalResults[fileType] = {
                      success: false,
                      error:
                        result.success === false
                          ? result.error
                          : "Upload failed",
                    };
                  }
                } catch (error) {
                  externalResults[fileType] = {
                    success: false,
                    error: `Failed to process external URL: ${(error as Error).message}`,
                  };
                }
              } else {
                externalResults[fileType] = {
                  success: false,
                  error: "Invalid external URL or URL from our own domain",
                };
              }
            }
          }
        }

        // Generate presigned URLs for direct uploads
        for (const fileType of fileTypes) {
          // Skip if external URL was processed successfully
          if (externalResults[fileType]?.success) {
            continue;
          }

          // Generate unique key for temp upload
          const tempKey = `brands/temp/${userId}/${timestamp}/${fileType}_${Math.random().toString(36).substr(2, 9)}`;
          console.log(
            "<================== tempKey: ====================>",
            tempKey,
          );

          // Generate presigned URL for upload (PUT operation)
          const uploadUrl = await generatePresignedUrl({
            key: tempKey,
            expiresIn: 3600, // 1 hour
            operation: "putObject",
          });

          if (uploadUrl.success) {
            uploadUrls[fileType] = {
              uploadUrl: uploadUrl.data.url,
              key: tempKey,
              publicUrl: buildS3Url(tempKey),
              fileType,
              expiresAt: uploadUrl.data.expiresAt,
            };
          } else {
            uploadUrls[fileType] = {
              error:
                uploadUrl.success === false
                  ? uploadUrl.error
                  : "Failed to generate upload URL",
            };
          }
        }

        loggerHelpers.business("brand_upload_urls_generated", {
          currentUserId: currentUser?._id?.toString(),
          fileTypes,
          urlCount: Object.keys(uploadUrls).length,
          externalProcessed: Object.keys(externalResults).length,
          ip: req.ip,
        });

        res.status(200).json({
          success: true,
          message: "Upload URLs and external processing completed",
          data: {
            uploadUrls,
            externalResults,
            expiresIn: 3600,
            instructions: {
              presignedUpload: {
                method: "PUT",
                note: "Upload files directly to the uploadUrl using PUT method",
                example: "fetch(uploadUrl, { method: 'PUT', body: file })",
              },
              externalUrls: {
                note: "External URLs are processed immediately and don't require additional upload",
              },
            },
          },
        });
      } catch (error) {
        loggerHelpers.system("brand_upload_urls_error", {
          currentUserId: currentUser?._id?.toString(),
          error: (error as Error).message,
          ip: req.ip,
        });
        return next(new ErrorHandler(500, "Failed to generate upload URLs"));
      }
    },
  ),

  /**
   * Process uploaded images (move from temp to permanent, resize, optimize)
   * @route POST /admin/brands/process-images
   * @access Admin with brands.canCreate or brands.canEdit permission
   */
  processUploadedImages: CatchAsyncErrors(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const { uploads } = req.body; // { logo: { tempKey: "...", filename: "..." }, banner: { ... } }
      const currentUser = req.user;

      loggerHelpers.business("brand_process_images_request", {
        currentUserId: currentUser?._id?.toString(),
        uploads: Object.keys(uploads || {}),
        ip: req.ip,
      });

      if (!uploads || typeof uploads !== "object") {
        return next(ErrorHandler.validation("Uploads object is required"));
      }

      try {
        const processedImages: Record<string, any> = {};
        const errors: string[] = [];

        for (const [imageType, uploadData] of Object.entries(uploads)) {
          if (!["logo", "banner"].includes(imageType)) {
            errors.push(`Invalid image type: ${imageType}`);
            continue;
          }

          const { tempKey, filename, originalName } = uploadData as {
            tempKey: string;
            filename: string;
            originalName?: string;
          };

          if (!tempKey) {
            errors.push(`Missing tempKey for ${imageType}`);
            continue;
          }

          try {
            // Check if temp file exists using existing utility
            const exists = await s3Utils.fileExists(tempKey);
            if (!exists) {
              errors.push(`Temp file not found for ${imageType}: ${tempKey}`);
              continue;
            }

            // Generate permanent key using existing pattern
            const permanentKey = s3Utils.generateUniqueFilename(
              `${imageType}_${originalName || filename}`,
            );
            const finalKey = `brands/${imageType}s/${permanentKey}`;

            // Use existing copyFile function from s3UploadService
            const copyResult = await s3UploadService.copyFile(
              tempKey,
              finalKey,
            );
            if (!copyResult.success) {
              errors.push(
                `Failed to copy ${imageType}: ${copyResult.success === false ? copyResult.error : "Copy operation failed"}`,
              );
              continue;
            }

            // Use existing deleteFile function to clean up temp file
            const deleteResult = await s3UploadService.deleteFile({
              key: tempKey,
            });
            if (!deleteResult.success) {
              // Log warning but don't fail the operation
              loggerHelpers.system("temp_file_cleanup_warning", {
                tempKey,
                error:
                  deleteResult.success === false
                    ? deleteResult.error
                    : "Delete operation failed",
                currentUserId: currentUser?._id?.toString(),
              });
            }

            // Get image config for processing
            const imageConfig =
              imageType === "logo"
                ? S3_CONFIG.IMAGE_PROCESSING.BRAND_LOGO
                : S3_CONFIG.IMAGE_PROCESSING.BRAND_BANNER;

            // Build final URL using existing utility
            const finalUrl = buildS3Url(finalKey);

            processedImages[imageType] = {
              success: true,
              url: finalUrl,
              s3Key: finalKey,
              bucket: S3_CONFIG.BUCKET_NAME,
              width: imageConfig.width,
              height: imageConfig.height,
              format: imageConfig.format,
              uploadMethod: "presigned",
              isProcessed: true,
              processingStatus: "completed",
              uploadedAt: new Date(),
              processedAt: new Date(),
            };

            loggerHelpers.business(`brand_${imageType}_processed`, {
              currentUserId: currentUser?._id?.toString(),
              tempKey,
              permanentKey: finalKey,
              finalUrl,
            });
          } catch (error) {
            errors.push(
              `Failed to process ${imageType}: ${(error as Error).message}`,
            );

            loggerHelpers.system(`brand_${imageType}_process_error`, {
              currentUserId: currentUser?._id?.toString(),
              tempKey,
              error: (error as Error).message,
            });
          }
        }

        res.status(200).json({
          success: errors.length === 0,
          message:
            errors.length === 0
              ? "All images processed successfully"
              : "Some images failed to process",
          data: {
            processedImages,
            errors: errors.length > 0 ? errors : undefined,
          },
        });
      } catch (error) {
        loggerHelpers.system("brand_process_images_error", {
          currentUserId: currentUser?._id?.toString(),
          error: (error as Error).message,
          ip: req.ip,
        });
        return next(new ErrorHandler(500, "Failed to process uploaded images"));
      }
    },
  ),

  /**
   * Update brand logo using presigned URL, external URL, or delete
   * @route PUT /admin/brands/:id/logo
   * @access Admin with brands.canEdit permission
   */
  updateBrandLogo: CatchAsyncErrors(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const { id } = req.params;
      const { logoData, externalUrl, deleteFromS3 } = req.body;
      const currentUser = req.user;

      if (!id) {
        return next(ErrorHandler.validation("Brand ID is required"));
      }

      // Handle deletion case
      if (deleteFromS3 === true) {
        try {
          const result = await deleteBrandAsset(id, "logo", currentUser!);
          return res.status(200).json(result);
        } catch (error) {
          loggerHelpers.system("brand_logo_delete_error", {
            brandId: id,
            error: (error as Error).message,
            currentUserId: currentUser?._id?.toString(),
          });
          return next(new ErrorHandler(500, (error as Error).message));
        }
      }

      // Handle update case
      if (!logoData && !externalUrl) {
        return next(
          ErrorHandler.validation(
            "Either logoData, externalUrl, or deleteFromS3=true is required",
          ),
        );
      }

      try {
        let processedLogoData: any;

        // Handle external URL
        if (externalUrl && s3Utils.isExternalImageUrl(externalUrl)) {
          processedLogoData = await processExternalUrlAsset(
            externalUrl,
            "logo",
          );
        } else if (logoData) {
          // Handle processed logo data from presigned upload
          processedLogoData = processAssetData(logoData, "logo");
        }

        // Update brand with new logo
        const updatedBrand = await brandService.updateBrand(
          id,
          { logo: processedLogoData },
          currentUser!._id.toString(),
        );

        if (!updatedBrand) {
          return next(ErrorHandler.notFound("Brand not found"));
        }

        loggerHelpers.business("brand_logo_updated", {
          brandId: id,
          uploadMethod: processedLogoData.uploadMethod,
          logoUrl: processedLogoData.url,
          updatedBy: currentUser?._id?.toString(),
        });

        res.status(200).json({
          success: true,
          message: "Brand logo updated successfully",
          data: {
            brandId: id,
            logo: processedLogoData,
          },
        });
      } catch (error) {
        loggerHelpers.system("brand_logo_update_error", {
          brandId: id,
          error: (error as Error).message,
          currentUserId: currentUser?._id?.toString(),
        });
        return next(new ErrorHandler(500, "Failed to update brand logo"));
      }
    },
  ),

  /**
   * Update brand banner using presigned URL, external URL, or delete
   * @route PUT /admin/brands/:id/banner
   * @access Admin with brands.canEdit permission
   */
  updateBrandBanner: CatchAsyncErrors(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const { id } = req.params;
      const { bannerData, externalUrl, deleteFromS3 } = req.body;
      const currentUser = req.user;

      if (!id) {
        return next(ErrorHandler.validation("Brand ID is required"));
      }

      // Handle deletion case
      if (deleteFromS3 === true) {
        try {
          const result = await deleteBrandAsset(id, "banner", currentUser!);
          return res.status(200).json(result);
        } catch (error) {
          loggerHelpers.system("brand_banner_delete_error", {
            brandId: id,
            error: (error as Error).message,
            currentUserId: currentUser?._id?.toString(),
          });
          return next(new ErrorHandler(500, (error as Error).message));
        }
      }

      // Handle update case
      if (!bannerData && !externalUrl) {
        return next(
          ErrorHandler.validation(
            "Either bannerData, externalUrl, or deleteFromS3=true is required",
          ),
        );
      }

      try {
        let processedBannerData: any;

        // Handle external URL
        if (externalUrl && s3Utils.isExternalImageUrl(externalUrl)) {
          processedBannerData = await processExternalUrlAsset(
            externalUrl,
            "banner",
          );
        } else if (bannerData) {
          // Handle processed banner data from presigned upload
          processedBannerData = processAssetData(bannerData, "banner");
        }

        // Update brand with new banner
        const updatedBrand = await brandService.updateBrand(
          id,
          { banner: processedBannerData },
          currentUser!._id.toString(),
        );

        if (!updatedBrand) {
          return next(ErrorHandler.notFound("Brand not found"));
        }

        loggerHelpers.business("brand_banner_updated", {
          brandId: id,
          uploadMethod: processedBannerData.uploadMethod,
          bannerUrl: processedBannerData.url,
          updatedBy: currentUser?._id?.toString(),
        });

        res.status(200).json({
          success: true,
          message: "Brand banner updated successfully",
          data: {
            brandId: id,
            banner: processedBannerData,
          },
        });
      } catch (error) {
        loggerHelpers.system("brand_banner_update_error", {
          brandId: id,
          error: (error as Error).message,
          currentUserId: currentUser?._id?.toString(),
        });
        return next(new ErrorHandler(500, "Failed to update brand banner"));
      }
    },
  ),

  /**
   * Get brand by slug for public viewing
   * @route GET /brands/:slug
   * @access Public
   */
  getBrandBySlugPublic: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const { slug } = req.params;

      if (!slug) {
        return next(ErrorHandler.validation("Brand slug is required"));
      }

      try {
        // Find brand by slug, only active and not deleted
        const brand = await brandService.getBrandBySlug(slug);

        if (!brand || !brand.isActive || brand.isDeleted) {
          return next(ErrorHandler.notFound("Brand not found"));
        }

        res.status(200).json({
          success: true,
          message: "Brand retrieved successfully",
          data: brand,
        });
      } catch (error) {
        return next(new ErrorHandler(500, "Failed to get brand"));
      }
    },
  ),
};

export default brandController;
