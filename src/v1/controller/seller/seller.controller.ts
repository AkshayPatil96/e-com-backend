import { NextFunction, Request, Response } from "express";
import {
  ISellerAdminFilters,
  ISellerBulkActionBody,
  IUpdateSellerAdminBody,
} from "../../../@types/seller-admin.type";
import { IUser } from "../../../@types/user.type";
import { S3_CONFIG, buildS3Url } from "../../../config/aws/s3.config";
import { CatchAsyncErrors } from "../../../middleware/catchAsyncErrors";
import User from "../../../model/user/index";
import {
  generatePresignedUrl,
  s3UploadService,
} from "../../../services/aws/s3-upload.service";
import ErrorHandler from "../../../utils/ErrorHandler";
import { loggerHelpers } from "../../../utils/logger";
import { convertToSlug } from "../../../utils/logic";
import { s3Utils } from "../../../utils/s3.utils";
import sellerService from "../../services/seller/seller.service";

// Extend Request interface to include user
interface AuthenticatedRequest extends Request {
  user?: IUser;
}

// ================================
// HELPER FUNCTIONS FOR SELLER ASSETS
// ================================

/**
 * Helper function to delete seller asset from S3 and database
 */
const deleteSellerAsset = async (
  sellerId: string,
  assetType: "image" | "banner",
  currentUser: IUser,
) => {
  // Get the current seller to access asset data
  const seller = await sellerService.getSellerByIdAdmin(sellerId);
  if (!seller) {
    throw new Error("Seller not found");
  }

  const assetData = seller[assetType] as any; // Type assertion to handle union type
  if (!assetData) {
    throw new Error(`Seller has no ${assetType} to delete`);
  }

  loggerHelpers.business(`seller_${assetType}_delete_attempt`, {
    sellerId,
    assetUrl: typeof assetData === "string" ? assetData : assetData.url,
    s3Key:
      typeof assetData === "object" && assetData.s3Key
        ? assetData.s3Key
        : undefined,
    updatedBy: currentUser._id?.toString(),
  });

  // Delete from S3 if s3Key exists and it's an object with s3Key
  if (typeof assetData === "object" && assetData.s3Key) {
    try {
      const deleteResult = await s3UploadService.deleteFile({
        key: assetData.s3Key,
      });

      if (!deleteResult.success) {
        loggerHelpers.system(`seller_${assetType}_s3_delete_warning`, {
          sellerId,
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
      loggerHelpers.system(`seller_${assetType}_s3_delete_error`, {
        sellerId,
        s3Key: assetData.s3Key,
        error: (error as Error).message,
        currentUserId: currentUser._id?.toString(),
      });
      // Continue with DB update even if S3 delete fails
    }
  }

  // Remove asset from database using $unset operation
  const updateData = { $unset: { [assetType]: 1 } };
  const updatedSeller = await sellerService.updateSellerRaw(
    sellerId,
    updateData,
    currentUser._id.toString(),
  );

  if (!updatedSeller) {
    throw new Error("Seller not found after update");
  }

  loggerHelpers.business(`seller_${assetType}_deleted`, {
    sellerId,
    assetUrl: typeof assetData === "string" ? assetData : assetData.url,
    s3Key:
      typeof assetData === "object" && assetData.s3Key
        ? assetData.s3Key
        : undefined,
    updatedBy: currentUser._id?.toString(),
  });

  return {
    success: true,
    message: `Seller ${assetType} deleted successfully`,
    data: {
      sellerId,
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
 * Helper function to process external URL for seller asset
 */
const processExternalUrlAsset = async (
  externalUrl: string,
  assetType: "image" | "banner",
) => {
  const originalFilename =
    externalUrl.split("/").pop()?.split("?")[0] || assetType;

  const result = await s3Utils.uploadFileFromUrl(
    externalUrl,
    "users",
    originalFilename,
    {
      subFolder: `sellers/${assetType}s`,
      processImage: true,
      brandContext: {
        imageType: assetType === "image" ? "logo" : "banner",
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
    image: { width: 300, height: 300 },
    banner: { width: 1200, height: 400 },
  };

  return {
    url: result.data.url!,
    alt: `Seller ${assetType}`,
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
const processAssetData = (assetData: any, assetType: "image" | "banner") => {
  const defaultDimensions = {
    image: { width: 300, height: 300 },
    banner: { width: 1200, height: 400 },
  };

  return {
    url: assetData.url,
    alt: assetData.alt || `Seller ${assetType}`,
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

const sellerController = {
  /**
   * Get all sellers with filtering, sorting, and pagination for admin panel
   * @route GET /admin/sellers
   * @access Admin with sellers.canView permission
   */
  getAllSellersAdmin: CatchAsyncErrors(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const currentUser = req.user;

      loggerHelpers.business("seller_admin_list_view_attempt", {
        currentUserId: currentUser?._id?.toString(),
        ip: req.ip,
      });

      // Extract and validate query parameters
      const filters: ISellerAdminFilters = {
        page: Math.max(1, parseInt(req.query.page as string) || 1),
        limit: Math.min(
          100,
          Math.max(1, parseInt(req.query.limit as string) || 20),
        ),
        search: ((req.query.search as string) || "").trim().substring(0, 100),
        status: (req.query.status as any) || "all",
        verified:
          (req.query.verified as "all" | "verified" | "unverified") || "all",
        // Handle both boolean and string values for featured
        featured: (() => {
          const featuredParam = req.query.featured as string;
          if (featuredParam === "true") return "featured";
          if (featuredParam === "false") return "not-featured";
          return (
            (featuredParam as "all" | "featured" | "not-featured") || "all"
          );
        })(),
        isDeleted: req.query.isDeleted === "true",
        sortBy: (req.query.sortBy as any) || "createdAt",
        sortOrder: (req.query.sortOrder as "asc" | "desc") || "desc",
        categories: req.query.categories as string,
        minSales: req.query.minSales
          ? parseInt(req.query.minSales as string)
          : undefined,
        maxSales: req.query.maxSales
          ? parseInt(req.query.maxSales as string)
          : undefined,
        minRating: req.query.minRating
          ? parseFloat(req.query.minRating as string)
          : undefined,
        maxRating: req.query.maxRating
          ? parseFloat(req.query.maxRating as string)
          : undefined,
      };
      console.log("filters:======================> ", filters);

      try {
        // Validate enum values
        const validStatus = [
          "all",
          "active",
          "suspended",
          "pending",
          "rejected",
          "inactive",
        ];
        const validVerified = ["all", "verified", "unverified"];
        const validFeatured = ["all", "featured", "not-featured"];
        const validSortBy = [
          "storeName",
          "createdAt",
          "joinedDate",
          "totalSales",
          "totalOrders",
          "averageRating",
        ];
        const validSortOrder = ["asc", "desc"];

        if (!validStatus.includes(filters.status)) {
          return next(ErrorHandler.validation("Invalid status filter value"));
        }
        if (!validVerified.includes(filters.verified)) {
          return next(ErrorHandler.validation("Invalid verified filter value"));
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

        const result = await sellerService.getAllSellersAdmin(filters);

        loggerHelpers.business("seller_admin_list_viewed", {
          currentUserId: currentUser?._id?.toString(),
          currentUserRole: currentUser?.role,
          sellerCount: result.data.length,
          totalCount: result.totalCount,
          filters: {
            search: filters.search,
            status: filters.status,
            verified: filters.verified,
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
          message: "Sellers retrieved successfully",
          data: result,
        });
      } catch (error) {
        loggerHelpers.system("seller_admin_list_error", {
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
        next(error);
      }
    },
  ),

  /**
   * Get single seller by ID for admin
   * @route GET /admin/sellers/:id
   * @access Admin with sellers.canView permission
   */
  getSellerByIdAdmin: CatchAsyncErrors(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const { id } = req.params;
      const currentUser = req.user;

      loggerHelpers.business("seller_admin_view_attempt", {
        currentUserId: currentUser?._id?.toString(),
        sellerId: id,
        ip: req.ip,
      });

      if (!id) {
        return next(ErrorHandler.validation("Seller ID is required"));
      }

      try {
        const seller = await sellerService.getSellerByIdAdmin(id);

        if (!seller) {
          return next(ErrorHandler.notFound("Seller not found"));
        }

        loggerHelpers.business("seller_admin_viewed", {
          currentUserId: currentUser?._id?.toString(),
          sellerId: id,
          storeName: seller.storeName,
          ip: req.ip,
        });

        res.status(200).json({
          success: true,
          message: "Seller retrieved successfully",
          data: seller,
        });
      } catch (error) {
        loggerHelpers.system("seller_admin_view_error", {
          currentUserId: currentUser?._id?.toString(),
          sellerId: id,
          error: (error as Error).message,
          ip: req.ip,
        });
        next(error);
        // return next(new ErrorHandler(500, "Failed to get seller"));
      }
    },
  ),

  /**
   * Create new seller (simplified for admin panel)
   * @route POST /admin/sellers
   * @access Admin with sellers.canCreate permission
   */
  createSeller: CatchAsyncErrors(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const requestData = req.body;
      const currentUser = req.user;

      loggerHelpers.business("seller_admin_create_attempt", {
        currentUserId: currentUser?._id?.toString(),
        storeName: requestData.storeName,
        email: requestData.contactEmail,
        ip: req.ip,
      });

      // Validate required fields only
      if (!requestData.storeName?.trim()) {
        return next(
          ErrorHandler.validation("Store name is required", {
            field: "storeName",
            code: "MISSING_STORE_NAME",
          }),
        );
      }

      if (!requestData.contactEmail?.trim()) {
        return next(
          ErrorHandler.validation("Contact email is required", {
            field: "contactEmail",
            code: "MISSING_EMAIL",
          }),
        );
      }

      if (!requestData.phoneNumber?.trim()) {
        return next(
          ErrorHandler.validation("Phone number is required", {
            field: "phoneNumber",
            code: "MISSING_PHONE",
          }),
        );
      }

      // Validate store name length
      if (
        requestData.storeName.trim().length < 3 ||
        requestData.storeName.trim().length > 100
      ) {
        return next(
          ErrorHandler.validation(
            "Store name must be between 3-100 characters",
            {
              field: "storeName",
              minLength: 3,
              maxLength: 100,
            },
          ),
        );
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(requestData.contactEmail)) {
        return next(
          ErrorHandler.validation("Invalid email format", {
            field: "contactEmail",
            code: "INVALID_EMAIL",
          }),
        );
      }

      loggerHelpers.business("seller_admin_create_attempt", {
        currentUserId: currentUser?._id?.toString(),
        storeName: requestData.storeName,
        hasImage: false,
        hasBanner: false,
        ip: req.ip,
      });

      try {
        const { seller, userId, newUserCreated } =
          await sellerService.createSeller(
            requestData,
            currentUser!._id.toString(),
            req.ip,
          );

        loggerHelpers.business("seller_admin_created", {
          currentUserId: currentUser?._id?.toString(),
          sellerId: (seller as any)._id.toString(),
          storeName: seller.storeName,
          newUserCreated,
          userId: userId,
          ip: req.ip,
        });

        res.status(201).json({
          success: true,
          message: newUserCreated
            ? "Seller and user account created successfully"
            : "Seller created successfully",
          data: seller,
          userAccount: {
            created: newUserCreated,
            userId: userId,
            // tempPassword: newUserCreated && !requestData.password,
            loginEmail: requestData.contactEmail.toLowerCase(),
            // loginPassword: newUserCreated
            //   ? requestData.password || "TempPassword123!"
            //   : undefined,
          },
        });
      } catch (error) {
        loggerHelpers.system("seller_admin_create_error", {
          currentUserId: currentUser?._id?.toString(),
          storeName: requestData.storeName,
          error: (error as Error).message,
          ip: req.ip,
        });
        next(error);
      }
    },
  ),

  /**
   * Update seller
   * @route PUT /admin/sellers/:id
   * @access Admin with sellers.canEdit permission
   */
  updateSeller: CatchAsyncErrors(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const { id } = req.params;
      const requestData = req.body;
      const currentUser = req.user;

      loggerHelpers.business("seller_admin_update_attempt", {
        currentUserId: currentUser?._id?.toString(),
        sellerId: id,
        updateFields: Object.keys(requestData),
        ip: req.ip,
      });

      if (!id) {
        return next(ErrorHandler.validation("Seller ID is required"));
      }

      // Map frontend fields to backend format
      const updateData: IUpdateSellerAdminBody = {
        storeName: requestData.storeName,
        storeDescription: requestData.storeDescription,
        categories: requestData.categories,
        contactEmail: requestData.contactEmail,
        phoneNumber: requestData.phoneNumber,
        alternatePhone: requestData.alternatePhone,
        addresses: requestData.addresses,
        image: requestData.image,
        banner: requestData.banner,
        socialLinks: requestData.socialLinks,
        commissionRate: requestData.commissionRate,
        isVerified: requestData.isVerified,
        isFeatured: requestData.isFeatured,
        isTopSeller: requestData.isTopSeller,
        status: requestData.status,
        policies: requestData.policies,
        ...requestData,
      };

      // Remove undefined fields
      Object.keys(updateData).forEach((key) => {
        if (updateData[key as keyof IUpdateSellerAdminBody] === undefined) {
          delete updateData[key as keyof IUpdateSellerAdminBody];
        }
      });

      // Validate update fields
      if (updateData.storeName !== undefined) {
        if (
          !updateData.storeName ||
          updateData.storeName.trim().length < 3 ||
          updateData.storeName.trim().length > 100
        ) {
          return next(
            ErrorHandler.validation(
              "Store name must be between 3-100 characters",
              {
                field: "storeName",
                minLength: 3,
                maxLength: 100,
              },
            ),
          );
        }
      }

      if (updateData.contactEmail !== undefined) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(updateData.contactEmail)) {
          return next(
            ErrorHandler.validation("Invalid email format", {
              field: "contactEmail",
              code: "INVALID_EMAIL",
            }),
          );
        }
      }

      try {
        const updatedSeller = await sellerService.updateSeller(
          id,
          updateData,
          currentUser!._id.toString(),
        );

        if (!updatedSeller) {
          return next(ErrorHandler.notFound("Seller not found"));
        }

        loggerHelpers.business("seller_admin_updated", {
          currentUserId: currentUser?._id?.toString(),
          sellerId: id,
          storeName: updatedSeller.storeName,
          updateFields: Object.keys(updateData),
          ip: req.ip,
        });

        res.status(200).json({
          success: true,
          message: "Seller updated successfully",
          data: updatedSeller,
        });
      } catch (error) {
        loggerHelpers.system("seller_admin_update_error", {
          currentUserId: currentUser?._id?.toString(),
          sellerId: id,
          error: (error as Error).message,
          ip: req.ip,
        });
        next(error);
      }
    },
  ),

  /**
   * Soft delete seller
   * @route DELETE /admin/sellers/:id
   * @access Admin with sellers.canDelete permission
   */
  deleteSeller: CatchAsyncErrors(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const { id } = req.params;
      const currentUser = req.user;

      loggerHelpers.business("seller_admin_delete_attempt", {
        currentUserId: currentUser?._id?.toString(),
        sellerId: id,
        ip: req.ip,
      });

      if (!id) {
        return next(ErrorHandler.validation("Seller ID is required"));
      }

      try {
        const deleted = await sellerService.deleteSeller(id);

        if (!deleted) {
          return next(ErrorHandler.notFound("Seller not found"));
        }

        loggerHelpers.business("seller_admin_deleted", {
          currentUserId: currentUser?._id?.toString(),
          sellerId: id,
          ip: req.ip,
        });

        res.status(200).json({
          success: true,
          message: "Seller deleted successfully",
          data: {
            sellerId: id,
            deletedAt: new Date(),
          },
        });
      } catch (error) {
        loggerHelpers.system("seller_admin_delete_error", {
          currentUserId: currentUser?._id?.toString(),
          sellerId: id,
          error: (error as Error).message,
          ip: req.ip,
        });
        next(error);
      }
    },
  ),

  /**
   * Restore deleted seller
   * @route PUT /admin/sellers/:id/restore
   * @access Admin with sellers.canDelete permission
   */
  restoreSeller: CatchAsyncErrors(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const { id } = req.params;
      const currentUser = req.user;

      loggerHelpers.business("seller_admin_restore_attempt", {
        currentUserId: currentUser?._id?.toString(),
        sellerId: id,
        ip: req.ip,
      });

      if (!id) {
        return next(ErrorHandler.validation("Seller ID is required"));
      }

      try {
        const restoredSeller = await sellerService.restoreSeller(id);

        if (!restoredSeller) {
          return next(ErrorHandler.notFound("Seller not found"));
        }

        loggerHelpers.business("seller_admin_restored", {
          currentUserId: currentUser?._id?.toString(),
          sellerId: id,
          storeName: restoredSeller.storeName,
          ip: req.ip,
        });

        res.status(200).json({
          success: true,
          message: "Seller restored successfully",
          data: {
            sellerId: id,
            restoredAt: new Date(),
            seller: restoredSeller,
          },
        });
      } catch (error) {
        loggerHelpers.system("seller_admin_restore_error", {
          currentUserId: currentUser?._id?.toString(),
          sellerId: id,
          error: (error as Error).message,
          ip: req.ip,
        });
        next(error);
      }
    },
  ),

  /**
   * Toggle seller status
   * @route PUT /admin/sellers/:id/toggle-status
   * @access Admin with sellers.canEdit permission
   */
  toggleSellerStatus: CatchAsyncErrors(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const { id } = req.params;
      const currentUser = req.user;

      loggerHelpers.business("seller_admin_status_toggle_attempt", {
        currentUserId: currentUser?._id?.toString(),
        sellerId: id,
        ip: req.ip,
      });

      if (!id) {
        return next(ErrorHandler.validation("Seller ID is required"));
      }

      try {
        const updatedSeller = await sellerService.toggleSellerStatus(id);

        if (!updatedSeller) {
          return next(ErrorHandler.notFound("Seller not found"));
        }

        loggerHelpers.business("seller_admin_status_toggled", {
          currentUserId: currentUser?._id?.toString(),
          sellerId: id,
          storeName: updatedSeller.storeName,
          newStatus: updatedSeller.status,
          ip: req.ip,
        });

        res.status(200).json({
          success: true,
          message: `Seller status changed to ${updatedSeller.status} successfully`,
          data: {
            sellerId: id,
            status: updatedSeller.status,
            toggledAt: new Date(),
          },
        });
      } catch (error) {
        loggerHelpers.system("seller_admin_status_toggle_error", {
          currentUserId: currentUser?._id?.toString(),
          sellerId: id,
          error: (error as Error).message,
          ip: req.ip,
        });
        next(error);
      }
    },
  ),

  /**
   * Search sellers for autocomplete/dropdown
   * @route GET /admin/sellers/search
   * @access Admin with sellers.canView permission
   */
  searchSellers: CatchAsyncErrors(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const currentUser = req.user;
      const query = (req.query.q as string) || "";
      const limit = Math.min(
        50,
        Math.max(1, parseInt(req.query.limit as string) || 20),
      );
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const includeDeleted = req.query.includeDeleted === "true";

      loggerHelpers.business("seller_search_attempt", {
        currentUserId: currentUser?._id?.toString(),
        query: query.substring(0, 50),
        page,
        limit,
        includeDeleted,
        ip: req.ip,
      });

      try {
        const result = await sellerService.searchSellers(query, {
          limit,
          page,
          includeDeleted,
        });

        loggerHelpers.business("seller_search_completed", {
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
              ? `Found ${result.results.length} sellers`
              : "No sellers found",
          data: result,
        });
      } catch (error) {
        loggerHelpers.system("seller_search_error", {
          currentUserId: currentUser?._id?.toString(),
          query: query.substring(0, 50),
          page,
          error: (error as Error).message,
          ip: req.ip,
        });
        next(error);
      }
    },
  ),

  /**
   * Get seller statistics for admin dashboard
   * @route GET /admin/sellers/statistics
   * @access Admin with sellers.canView permission
   */
  getSellerStatistics: CatchAsyncErrors(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const currentUser = req.user;

      loggerHelpers.business("seller_admin_statistics_view_attempt", {
        currentUserId: currentUser?._id?.toString(),
        ip: req.ip,
      });

      try {
        const statistics = await sellerService.getSellerStatistics();

        loggerHelpers.business("seller_admin_statistics_viewed", {
          currentUserId: currentUser?._id?.toString(),
          totalSellers: statistics.totalSellers,
          ip: req.ip,
        });

        res.status(200).json({
          success: true,
          message: "Seller statistics retrieved successfully",
          data: statistics,
        });
      } catch (error) {
        loggerHelpers.system("seller_admin_statistics_error", {
          currentUserId: currentUser?._id?.toString(),
          error: (error as Error).message,
          ip: req.ip,
        });
        next(error);
      }
    },
  ),

  /**
   * Bulk actions on sellers
   * @route POST /admin/sellers/bulk-action
   * @access Admin with sellers.canEdit permission
   */
  bulkAction: CatchAsyncErrors(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const { sellerIds, action }: ISellerBulkActionBody = req.body;
      const currentUser = req.user;

      loggerHelpers.business("seller_admin_bulk_action_attempt", {
        currentUserId: currentUser?._id?.toString(),
        action,
        sellerCount: sellerIds?.length,
        ip: req.ip,
      });

      // Validate input
      if (!sellerIds || !Array.isArray(sellerIds) || sellerIds.length === 0) {
        return next(
          ErrorHandler.validation("Seller IDs array is required", {
            field: "sellerIds",
            code: "MISSING_SELLER_IDS",
          }),
        );
      }

      if (sellerIds.length > 100) {
        return next(
          ErrorHandler.validation(
            "Cannot perform bulk action on more than 100 sellers at once",
            {
              field: "sellerIds",
              maxLength: 100,
            },
          ),
        );
      }

      const validActions = [
        "activate",
        "suspend",
        "delete",
        "restore",
        "verify",
        "unverify",
        "feature",
        "unfeature",
        "approve",
        "reject",
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
        const result = await sellerService.bulkAction(
          sellerIds,
          action,
          currentUser!._id.toString(),
        );

        loggerHelpers.business("seller_admin_bulk_action_completed", {
          currentUserId: currentUser?._id?.toString(),
          action,
          sellerCount: sellerIds.length,
          success: result.success,
          failed: result.failed,
          ip: req.ip,
        });

        res.status(200).json({
          success: true,
          message: `Bulk action completed. ${result.success} successful, ${result.failed} failed.`,
          data: {
            action,
            total: sellerIds.length,
            success: result.success,
            failed: result.failed,
            errors: result.errors,
            completedAt: new Date(),
          },
        });
      } catch (error) {
        loggerHelpers.system("seller_admin_bulk_action_error", {
          currentUserId: currentUser?._id?.toString(),
          action,
          sellerCount: sellerIds.length,
          error: (error as Error).message,
          ip: req.ip,
        });
        next(error);
      }
    },
  ),

  // ================================
  // SELLER ASSET MANAGEMENT
  // ================================

  /**
   * Generate presigned URLs for seller image and banner uploads
   * @route POST /admin/sellers/upload-urls
   * @access Admin with sellers.canCreate permission
   */
  generateUploadUrls: CatchAsyncErrors(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const { fileTypes, externalUrls } = req.body;
      const currentUser = req.user;

      loggerHelpers.business("seller_upload_urls_request", {
        currentUserId: currentUser?._id?.toString(),
        fileTypes,
        externalUrls,
        ip: req.ip,
      });

      // Validate input
      if (!fileTypes || !Array.isArray(fileTypes)) {
        return next(ErrorHandler.validation("File types array is required"));
      }

      const validFileTypes = ["image", "banner"];
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
                  const originalFilename =
                    externalUrl.split("/").pop()?.split("?")[0] || "image";

                  const result = await s3Utils.uploadFileFromUrl(
                    externalUrl,
                    "users",
                    originalFilename,
                    {
                      subFolder: `sellers/${fileType}s`,
                      processImage: true,
                      brandContext: {
                        imageType: fileType === "image" ? "logo" : "banner",
                      },
                      timeout: 30000,
                      maxSize: 20 * 1024 * 1024, // 20MB
                      makePublic: true,
                    },
                  );

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
          const tempKey = `users/sellers/temp/${userId}/${timestamp}/${fileType}_${Math.random().toString(36).substr(2, 9)}`;

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

        loggerHelpers.business("seller_upload_urls_generated", {
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
        loggerHelpers.system("seller_upload_urls_error", {
          currentUserId: currentUser?._id?.toString(),
          error: (error as Error).message,
          ip: req.ip,
        });
        next(error);
      }
    },
  ),

  /**
   * Process uploaded images (move from temp to permanent, resize, optimize)
   * @route POST /admin/sellers/process-images
   * @access Admin with sellers.canCreate permission
   */
  processUploadedImages: CatchAsyncErrors(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const { uploads } = req.body;
      const currentUser = req.user;

      loggerHelpers.business("seller_process_images_request", {
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
          if (!["image", "banner"].includes(imageType)) {
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
            // Check if temp file exists
            const exists = await s3Utils.fileExists(tempKey);
            if (!exists) {
              errors.push(`Temp file not found for ${imageType}: ${tempKey}`);
              continue;
            }

            // Generate permanent key
            const permanentKey = s3Utils.generateUniqueFilename(
              `${imageType}_${originalName || filename}`,
            );
            const finalKey = `users/sellers/${imageType}s/${permanentKey}`;

            // Copy file
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

            // Clean up temp file
            const deleteResult = await s3UploadService.deleteFile({
              key: tempKey,
            });
            if (!deleteResult.success) {
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
              imageType === "image"
                ? S3_CONFIG.IMAGE_PROCESSING.BRAND_LOGO // Reuse brand logo config
                : S3_CONFIG.IMAGE_PROCESSING.BRAND_BANNER; // Reuse brand banner config

            // Build final URL
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

            loggerHelpers.business(`seller_${imageType}_processed`, {
              currentUserId: currentUser?._id?.toString(),
              tempKey,
              permanentKey: finalKey,
              finalUrl,
            });
          } catch (error) {
            errors.push(
              `Failed to process ${imageType}: ${(error as Error).message}`,
            );

            loggerHelpers.system(`seller_${imageType}_process_error`, {
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
        loggerHelpers.system("seller_process_images_error", {
          currentUserId: currentUser?._id?.toString(),
          error: (error as Error).message,
          ip: req.ip,
        });
        next(error);
      }
    },
  ),

  /**
   * Update seller image using presigned URL, external URL, or delete
   * @route PUT /admin/sellers/:id/image
   * @access Admin with sellers.canEdit permission
   */
  updateSellerImage: CatchAsyncErrors(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const { id } = req.params;
      const { imageData, externalUrl, deleteFromS3 } = req.body;
      const currentUser = req.user;

      if (!id) {
        return next(ErrorHandler.validation("Seller ID is required"));
      }

      // Handle deletion case
      if (deleteFromS3 === true) {
        try {
          const result = await deleteSellerAsset(id, "image", currentUser!);
          return res.status(200).json(result);
        } catch (error) {
          loggerHelpers.system("seller_image_delete_error", {
            sellerId: id,
            error: (error as Error).message,
            currentUserId: currentUser?._id?.toString(),
          });
          next(error);
        }
      }

      // Handle update case
      if (!imageData && !externalUrl) {
        return next(
          ErrorHandler.validation(
            "Either imageData, externalUrl, or deleteFromS3=true is required",
          ),
        );
      }

      try {
        let processedImageData: any;

        // Handle external URL
        if (externalUrl && s3Utils.isExternalImageUrl(externalUrl)) {
          processedImageData = await processExternalUrlAsset(
            externalUrl,
            "image",
          );
        } else if (imageData) {
          // Handle processed image data from presigned upload
          processedImageData = processAssetData(imageData, "image");
        }

        // Update seller with new image
        const updatedSeller = await sellerService.updateSeller(
          id,
          { image: processedImageData },
          currentUser!._id.toString(),
        );

        if (!updatedSeller) {
          return next(ErrorHandler.notFound("Seller not found"));
        }

        loggerHelpers.business("seller_image_updated", {
          sellerId: id,
          uploadMethod: processedImageData.uploadMethod,
          imageUrl: processedImageData.url,
          updatedBy: currentUser?._id?.toString(),
        });

        res.status(200).json({
          success: true,
          message: "Seller image updated successfully",
          data: {
            sellerId: id,
            image: processedImageData,
          },
        });
      } catch (error) {
        loggerHelpers.system("seller_image_update_error", {
          sellerId: id,
          error: (error as Error).message,
          currentUserId: currentUser?._id?.toString(),
        });
        next(error);
      }
    },
  ),

  /**
   * Update seller banner using presigned URL, external URL, or delete
   * @route PUT /admin/sellers/:id/banner
   * @access Admin with sellers.canEdit permission
   */
  updateSellerBanner: CatchAsyncErrors(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const { id } = req.params;
      const { bannerData, externalUrl, deleteFromS3 } = req.body;
      const currentUser = req.user;

      if (!id) {
        return next(ErrorHandler.validation("Seller ID is required"));
      }

      // Handle deletion case
      if (deleteFromS3 === true) {
        try {
          const result = await deleteSellerAsset(id, "banner", currentUser!);
          return res.status(200).json(result);
        } catch (error) {
          loggerHelpers.system("seller_banner_delete_error", {
            sellerId: id,
            error: (error as Error).message,
            currentUserId: currentUser?._id?.toString(),
          });
          next(error);
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

        // Update seller with new banner
        const updatedSeller = await sellerService.updateSeller(
          id,
          { banner: processedBannerData },
          currentUser!._id.toString(),
        );

        if (!updatedSeller) {
          return next(ErrorHandler.notFound("Seller not found"));
        }

        loggerHelpers.business("seller_banner_updated", {
          sellerId: id,
          uploadMethod: processedBannerData.uploadMethod,
          bannerUrl: processedBannerData.url,
          updatedBy: currentUser?._id?.toString(),
        });

        res.status(200).json({
          success: true,
          message: "Seller banner updated successfully",
          data: {
            sellerId: id,
            banner: processedBannerData,
          },
        });
      } catch (error) {
        loggerHelpers.system("seller_banner_update_error", {
          sellerId: id,
          error: (error as Error).message,
          currentUserId: currentUser?._id?.toString(),
        });
        next(error);
      }
    },
  ),

  // ================================
  // PUBLIC SELLER APIS (No Auth Required)
  // ================================

  /**
   * Search sellers for public use
   * @route GET /sellers/search
   * @access Public
   */
  searchSellersPublic: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const query = (req.query.q as string) || "";
      const limit = Math.min(
        50,
        Math.max(1, parseInt(req.query.limit as string) || 20),
      );
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const activeOnly = req.query.activeOnly !== "false"; // Default true

      try {
        const result = await sellerService.searchSellers(query, {
          limit,
          page,
          includeDeleted: false,
        });

        // Filter only active sellers if requested
        let filteredResults = result.results;
        if (activeOnly) {
          filteredResults = result.results.filter(
            (seller: any) => seller.status === "active",
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
              ? `Found ${filteredResults.length} sellers`
              : "No sellers found",
          data: {
            results: filteredResults,
            pagination: adjustedPagination,
            query: result.query,
          },
        });
      } catch (error) {
        next(error);
      }
    },
  ),

  /**
   * Get seller by slug for public viewing
   * @route GET /sellers/:slug
   * @access Public
   */
  getSellerBySlugPublic: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const { slug } = req.params;

      if (!slug) {
        return next(ErrorHandler.validation("Seller slug is required"));
      }

      try {
        const seller = await sellerService.getSellerBySlug(slug);

        if (!seller || seller.status !== "active" || seller.isDeleted) {
          return next(ErrorHandler.notFound("Seller not found"));
        }

        res.status(200).json({
          success: true,
          message: "Seller retrieved successfully",
          data: seller,
        });
      } catch (error) {
        next(error);
      }
    },
  ),
};

export default sellerController;
