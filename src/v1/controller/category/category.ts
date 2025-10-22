import { NextFunction, Request, Response } from "express";
import {
  ICategoryAdminFilters,
  ICategoryBulkActionBody,
  ICreateCategoryAdminBody,
  IUpdateCategoryAdminBody,
} from "../../../@types/category-admin.type";
import { IUser } from "../../../@types/user.type";
import { CatchAsyncErrors } from "../../../middleware/catchAsyncErrors";
import ErrorHandler from "../../../utils/ErrorHandler";
import { loggerHelpers } from "../../../utils/logger";
import categoryService from "../../services/category/category.service";

// Extend Request interface to include user
interface AuthenticatedRequest extends Request {
  user?: IUser;
}

const categoryController = {
  /**
   * Get all categories with filtering, sorting, and pagination for admin panel
   * @route GET /admin/categories
   * @access Admin with categories.canView permission
   */
  getAllCategoriesAdmin: CatchAsyncErrors(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const currentUser = req.user;

      loggerHelpers.business("category_admin_list_view_attempt", {
        currentUserId: currentUser?._id?.toString(),
        ip: req.ip,
      });

      // Extract and validate query parameters
      const filters: ICategoryAdminFilters = {
        page: Math.max(1, parseInt(req.query.page as string) || 1),
        limit: Math.min(
          100,
          Math.max(1, parseInt(req.query.limit as string) || 20),
        ),
        search: ((req.query.search as string) || "").trim().substring(0, 100),
        status: (req.query.status as "all" | "active" | "inactive") || "all",
        featured:
          (req.query.featured as "all" | "featured" | "not-featured") || "all",
        parent: (req.query.parent as string) || "all",
        level:
          req.query.level && req.query.level !== "null"
            ? parseInt(req.query.level as string) || null
            : null,
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

        const result = await categoryService.getAllCategoriesAdmin(filters);

        loggerHelpers.business("category_admin_list_viewed", {
          currentUserId: currentUser?._id?.toString(),
          currentUserRole: currentUser?.role,
          categoryCount: result.data.length,
          totalCount: result.totalCount,
          filters: {
            search: filters.search,
            status: filters.status,
            featured: filters.featured,
            parent: filters.parent,
            level: filters.level,
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
          message: "Categories retrieved successfully",
          data: result,
        });
      } catch (error) {
        loggerHelpers.system("category_admin_list_error", {
          currentUserId: currentUser?._id?.toString(),
          error: (error as Error).message,
          stack: (error as Error).stack,
          filters: {
            page: filters.page,
            limit: filters.limit,
            search: filters.search,
            level: filters.level,
            levelType: typeof filters.level,
            levelIsNaN: isNaN(filters.level as number),
          },
          ip: req.ip,
        });
        return next(new ErrorHandler(500, "Failed to get categories"));
      }
    },
  ),

  /**
   * Get single category by ID for admin
   * @route GET /admin/categories/:id
   * @access Admin with categories.canView permission
   */
  getCategoryByIdAdmin: CatchAsyncErrors(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const { id } = req.params;
      const currentUser = req.user;

      // Log category view attempt
      loggerHelpers.business("category_admin_view_attempt", {
        currentUserId: currentUser?._id?.toString(),
        categoryId: id,
        ip: req.ip,
      });

      if (!id) {
        return next(ErrorHandler.validation("Category ID is required"));
      }

      try {
        const category = await categoryService.getCategoryByIdAdmin(id);

        if (!category) {
          return next(ErrorHandler.notFound("Category not found"));
        }

        loggerHelpers.business("category_admin_viewed", {
          currentUserId: currentUser?._id?.toString(),
          categoryId: id,
          categoryName: category.name,
          ip: req.ip,
        });

        res.status(200).json({
          success: true,
          message: "Category retrieved successfully",
          data: category,
        });
      } catch (error) {
        loggerHelpers.system("category_admin_view_error", {
          currentUserId: currentUser?._id?.toString(),
          categoryId: id,
          error: (error as Error).message,
          ip: req.ip,
        });
        return next(new ErrorHandler(500, "Failed to get category"));
      }
    },
  ),

  /**
   * Create new category
   * @route POST /admin/categories
   * @access Admin with categories.canCreate permission
   */
  createCategory: CatchAsyncErrors(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const requestData = req.body;
      const currentUser = req.user;

      // Map frontend fields to backend expected format
      const categoryData: ICreateCategoryAdminBody = {
        name: requestData.name,
        description: requestData.description,
        shortDescription: requestData.shortDescription,
        parent: requestData.parent || null,
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
        seo: {
          metaTitle: requestData.seo?.metaTitle,
          metaDescription: requestData.seo?.metaDescription,
          metaKeywords: requestData.seo?.metaKeywords
            ? Array.isArray(requestData.seo.metaKeywords)
              ? requestData.seo.metaKeywords
              : [requestData.seo.metaKeywords]
            : undefined,
        },
      };

      // Handle slug separately since it's not in ICreateCategoryAdminBody but needed by service
      const categoryDataWithSlug = {
        ...categoryData,
        slug: requestData.slug, // Add slug for service layer
      };

      // Log category creation attempt
      loggerHelpers.business("category_admin_create_attempt", {
        currentUserId: currentUser?._id?.toString(),
        categoryName: categoryData.name,
        parentId: categoryData.parent,
        ip: req.ip,
      });

      // Validate required fields
      if (!categoryData.name) {
        return next(
          ErrorHandler.validation("Category name is required", {
            field: "name",
            code: "MISSING_NAME",
          }),
        );
      }

      if (
        categoryData.name.trim().length < 2 ||
        categoryData.name.trim().length > 100
      ) {
        return next(
          ErrorHandler.validation(
            "Category name must be between 2-100 characters",
            {
              field: "name",
              minLength: 2,
              maxLength: 100,
            },
          ),
        );
      }

      // Validate slug if provided (auto-generate if not)
      if (requestData.slug) {
        const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
        if (!slugRegex.test(requestData.slug)) {
          return next(
            ErrorHandler.validation(
              "Slug must contain only lowercase letters, numbers, and hyphens",
              {
                field: "slug",
                pattern: "lowercase-letters-numbers-hyphens",
              },
            ),
          );
        }
      }

      // Validate parent if provided
      if (categoryData.parent) {
        try {
          const parent = await categoryService.getCategoryByIdAdmin(
            categoryData.parent,
          );
          if (!parent) {
            return next(
              ErrorHandler.validation("Parent category not found", {
                field: "parentId", // Use frontend field name in error
                value: categoryData.parent,
              }),
            );
          }
          if (parent.isDeleted) {
            return next(
              ErrorHandler.validation("Cannot use deleted category as parent", {
                field: "parentId",
                value: categoryData.parent,
              }),
            );
          }
        } catch (error) {
          return next(
            ErrorHandler.validation("Invalid parent category ID", {
              field: "parentId", // Use frontend field name in error
              value: categoryData.parent,
            }),
          );
        }
      }

      // Validate optional fields
      if (categoryData.description && categoryData.description.length > 1000) {
        return next(
          ErrorHandler.validation(
            "Description must not exceed 1000 characters",
            {
              field: "description",
              maxLength: 1000,
            },
          ),
        );
      }

      if (
        categoryData.shortDescription &&
        categoryData.shortDescription.length > 200
      ) {
        return next(
          ErrorHandler.validation(
            "Short description must not exceed 200 characters",
            {
              field: "shortDescription",
              maxLength: 200,
            },
          ),
        );
      }

      if (
        categoryData.order !== undefined &&
        (categoryData.order < 0 || categoryData.order > 9999)
      ) {
        return next(
          ErrorHandler.validation("Order must be between 0-9999", {
            field: "order",
            min: 0,
            max: 9999,
          }),
        );
      }

      if (requestData.seo?.metaTitle && requestData.seo.metaTitle.length > 60) {
        return next(
          ErrorHandler.validation("Meta title must not exceed 60 characters", {
            field: "seo.metaTitle",
            maxLength: 60,
          }),
        );
      }

      if (
        requestData.seo?.metaDescription &&
        requestData.seo.metaDescription.length > 160
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

      try {
        const category = await categoryService.createCategory(
          categoryDataWithSlug,
          currentUser!._id.toString(),
        );

        loggerHelpers.business("category_admin_created", {
          currentUserId: currentUser?._id?.toString(),
          categoryId: category._id.toString(),
          categoryName: category.name,
          parentId: categoryData.parent,
          level: category.level,
          ip: req.ip,
        });

        res.status(201).json({
          success: true,
          message: "Category created successfully",
          data: category,
        });
      } catch (error) {
        if ((error as Error).message.includes("already exists")) {
          return next(
            ErrorHandler.validation("Category with this name already exists", {
              field: "name",
              value: categoryData.name,
            }),
          );
        }

        loggerHelpers.system("category_admin_create_error", {
          currentUserId: currentUser?._id?.toString(),
          categoryName: categoryData.name,
          error: (error as Error).message,
          ip: req.ip,
        });
        return next(new ErrorHandler(500, "Failed to create category"));
      }
    },
  ),

  /**
   * Update category
   * @route PUT /admin/categories/:id
   * @access Admin with categories.canEdit permission
   */
  updateCategory: CatchAsyncErrors(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const { id } = req.params;
      const requestData = req.body;
      const currentUser = req.user;

      // Log category update attempt
      loggerHelpers.business("category_admin_update_attempt", {
        currentUserId: currentUser?._id?.toString(),
        categoryId: id,
        updateFields: Object.keys(requestData),
        ip: req.ip,
      });

      if (!id) {
        return next(ErrorHandler.validation("Category ID is required"));
      }

      // Map frontend fields to backend format (handle both flat and nested seo)
      const updateData: IUpdateCategoryAdminBody = {
        name: requestData.name,
        description: requestData.description,
        shortDescription: requestData.shortDescription,
        parent: requestData.parent,
        slug: requestData.slug,
        order: requestData.order,
        isActive: requestData.isActive,
        isFeatured: requestData.isFeatured,
        showInMenu: requestData.showInMenu,
        showInHomepage: requestData.showInHomepage,
      };

      // Handle SEO fields (support both nested and flat structure)
      if (requestData.seo) {
        updateData.seo = {
          metaTitle: requestData.seo.metaTitle,
          metaDescription: requestData.seo.metaDescription,
          metaKeywords: requestData.seo.metaKeywords,
        };
      }

      // Remove undefined fields
      Object.keys(updateData).forEach((key) => {
        if (updateData[key as keyof IUpdateCategoryAdminBody] === undefined) {
          delete updateData[key as keyof IUpdateCategoryAdminBody];
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
              "Category name must be between 2-100 characters",
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
        updateData.description.length > 1000
      ) {
        return next(
          ErrorHandler.validation(
            "Description must not exceed 1000 characters",
            {
              field: "description",
              maxLength: 1000,
            },
          ),
        );
      }

      if (
        updateData.shortDescription !== undefined &&
        updateData.shortDescription.length > 200
      ) {
        return next(
          ErrorHandler.validation(
            "Short description must not exceed 200 characters",
            {
              field: "shortDescription",
              maxLength: 200,
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

      // Validate parent if provided
      if (updateData.parent !== undefined && updateData.parent) {
        try {
          const parent = await categoryService.getCategoryByIdAdmin(
            updateData.parent,
          );
          if (!parent) {
            return next(
              ErrorHandler.validation("Parent category not found", {
                field: "parent",
                value: updateData.parent,
              }),
            );
          }
        } catch (error) {
          return next(
            ErrorHandler.validation("Invalid parent category ID", {
              field: "parent",
              value: updateData.parent,
            }),
          );
        }
      }

      try {
        const updatedCategory = await categoryService.updateCategory(
          id,
          updateData,
          currentUser!._id.toString(),
        );

        if (!updatedCategory) {
          return next(ErrorHandler.notFound("Category not found"));
        }

        loggerHelpers.business("category_admin_updated", {
          currentUserId: currentUser?._id?.toString(),
          categoryId: id,
          categoryName: updatedCategory.name,
          updateFields: Object.keys(updateData),
          ip: req.ip,
        });

        res.status(200).json({
          success: true,
          message: "Category updated successfully",
          data: updatedCategory,
        });
      } catch (error) {
        if ((error as Error).message.includes("already exists")) {
          return next(
            ErrorHandler.validation("Category with this name already exists", {
              field: "name",
              value: updateData.name,
            }),
          );
        }

        if (
          (error as Error).message.includes("circular reference") ||
          (error as Error).message.includes("descendant")
        ) {
          return next(
            ErrorHandler.validation(
              "Cannot move category to its own descendant",
              {
                field: "parent",
                value: updateData.parent,
              },
            ),
          );
        }

        loggerHelpers.system("category_admin_update_error", {
          currentUserId: currentUser?._id?.toString(),
          categoryId: id,
          error: (error as Error).message,
          ip: req.ip,
        });
        return next(new ErrorHandler(500, "Failed to update category"));
      }
    },
  ),

  /**
   * Soft delete category
   * @route DELETE /admin/categories/:id
   * @access Admin with categories.canDelete permission
   */
  deleteCategory: CatchAsyncErrors(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const { id } = req.params;
      const currentUser = req.user;

      // Log category delete attempt
      loggerHelpers.business("category_admin_delete_attempt", {
        currentUserId: currentUser?._id?.toString(),
        categoryId: id,
        ip: req.ip,
      });

      if (!id) {
        return next(ErrorHandler.validation("Category ID is required"));
      }

      try {
        const deleted = await categoryService.deleteCategory(id);

        if (!deleted) {
          return next(ErrorHandler.notFound("Category not found"));
        }

        loggerHelpers.business("category_admin_deleted", {
          currentUserId: currentUser?._id?.toString(),
          categoryId: id,
          ip: req.ip,
        });

        res.status(200).json({
          success: true,
          message: "Category deleted successfully",
          data: {
            categoryId: id,
            deletedAt: new Date(),
          },
        });
      } catch (error) {
        if ((error as Error).message.includes("subcategories")) {
          return next(
            ErrorHandler.validation(
              "Cannot delete category with subcategories. Delete or move subcategories first.",
              {
                code: "HAS_SUBCATEGORIES",
              },
            ),
          );
        }

        if ((error as Error).message.includes("products")) {
          return next(
            ErrorHandler.validation(
              "Cannot delete category with products. Move or delete products first.",
              {
                code: "HAS_PRODUCTS",
              },
            ),
          );
        }

        loggerHelpers.system("category_admin_delete_error", {
          currentUserId: currentUser?._id?.toString(),
          categoryId: id,
          error: (error as Error).message,
          ip: req.ip,
        });
        return next(new ErrorHandler(500, "Failed to delete category"));
      }
    },
  ),

  /**
   * Restore deleted category
   * @route PUT /admin/categories/:id/restore
   * @access Admin with categories.canDelete permission
   */
  restoreCategory: CatchAsyncErrors(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const { id } = req.params;
      const currentUser = req.user;

      // Log category restore attempt
      loggerHelpers.business("category_admin_restore_attempt", {
        currentUserId: currentUser?._id?.toString(),
        categoryId: id,
        ip: req.ip,
      });

      if (!id) {
        return next(ErrorHandler.validation("Category ID is required"));
      }

      try {
        const restoredCategory = await categoryService.restoreCategory(id);

        if (!restoredCategory) {
          return next(ErrorHandler.notFound("Category not found"));
        }

        loggerHelpers.business("category_admin_restored", {
          currentUserId: currentUser?._id?.toString(),
          categoryId: id,
          categoryName: restoredCategory.name,
          ip: req.ip,
        });

        res.status(200).json({
          success: true,
          message: "Category restored successfully",
          data: {
            categoryId: id,
            restoredAt: new Date(),
            category: restoredCategory,
          },
        });
      } catch (error) {
        loggerHelpers.system("category_admin_restore_error", {
          currentUserId: currentUser?._id?.toString(),
          categoryId: id,
          error: (error as Error).message,
          ip: req.ip,
        });
        return next(new ErrorHandler(500, "Failed to restore category"));
      }
    },
  ),

  /**
   * Toggle category status (active/inactive)
   * @route PUT /admin/categories/:id/toggle-status
   * @access Admin with categories.canEdit permission
   */
  toggleCategoryStatus: CatchAsyncErrors(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const { id } = req.params;
      const currentUser = req.user;

      // Log category status toggle attempt
      loggerHelpers.business("category_admin_status_toggle_attempt", {
        currentUserId: currentUser?._id?.toString(),
        categoryId: id,
        ip: req.ip,
      });

      if (!id) {
        return next(ErrorHandler.validation("Category ID is required"));
      }

      try {
        const updatedCategory = await categoryService.toggleCategoryStatus(id);

        if (!updatedCategory) {
          return next(ErrorHandler.notFound("Category not found"));
        }

        loggerHelpers.business("category_admin_status_toggled", {
          currentUserId: currentUser?._id?.toString(),
          categoryId: id,
          categoryName: updatedCategory.name,
          newStatus: updatedCategory.isActive ? "active" : "inactive",
          ip: req.ip,
        });

        res.status(200).json({
          success: true,
          message: `Category ${updatedCategory.isActive ? "activated" : "deactivated"} successfully`,
          data: {
            categoryId: id,
            isActive: updatedCategory.isActive,
            toggledAt: new Date(),
          },
        });
      } catch (error) {
        loggerHelpers.system("category_admin_status_toggle_error", {
          currentUserId: currentUser?._id?.toString(),
          categoryId: id,
          error: (error as Error).message,
          ip: req.ip,
        });
        return next(new ErrorHandler(500, "Failed to toggle category status"));
      }
    },
  ),

  /**
   * Get category hierarchy tree for admin
   * @route GET /admin/categories/hierarchy
   * @access Admin with categories.canView permission
   */
  getCategoryHierarchy: CatchAsyncErrors(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const currentUser = req.user;

      // Log hierarchy view attempt
      loggerHelpers.business("category_admin_hierarchy_view_attempt", {
        currentUserId: currentUser?._id?.toString(),
        ip: req.ip,
      });

      try {
        const hierarchy = await categoryService.getCategoryHierarchyAdmin();

        loggerHelpers.business("category_admin_hierarchy_viewed", {
          currentUserId: currentUser?._id?.toString(),
          categoriesCount: hierarchy.length,
          ip: req.ip,
        });

        res.status(200).json({
          success: true,
          message: "Category hierarchy retrieved successfully",
          data: hierarchy,
        });
      } catch (error) {
        loggerHelpers.system("category_admin_hierarchy_error", {
          currentUserId: currentUser?._id?.toString(),
          error: (error as Error).message,
          ip: req.ip,
        });
        return next(new ErrorHandler(500, "Failed to get category hierarchy"));
      }
    },
  ),

  /**
   * Bulk actions on categories
   * @route POST /admin/categories/bulk-action
   * @access Admin with categories.canEdit or categories.canDelete permission
   */
  bulkAction: CatchAsyncErrors(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const { categoryIds, action }: ICategoryBulkActionBody = req.body;
      const currentUser = req.user;

      // Log bulk action attempt
      loggerHelpers.business("category_admin_bulk_action_attempt", {
        currentUserId: currentUser?._id?.toString(),
        action,
        categoryCount: categoryIds?.length,
        ip: req.ip,
      });

      // Validate input
      if (
        !categoryIds ||
        !Array.isArray(categoryIds) ||
        categoryIds.length === 0
      ) {
        return next(
          ErrorHandler.validation("Category IDs array is required", {
            field: "categoryIds",
            code: "MISSING_CATEGORY_IDS",
          }),
        );
      }

      if (categoryIds.length > 100) {
        return next(
          ErrorHandler.validation(
            "Cannot perform bulk action on more than 100 categories at once",
            {
              field: "categoryIds",
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
        const result = await categoryService.bulkAction(
          categoryIds,
          action,
          currentUser!._id.toString(),
        );

        loggerHelpers.business("category_admin_bulk_action_completed", {
          currentUserId: currentUser?._id?.toString(),
          action,
          categoryCount: categoryIds.length,
          success: result.success,
          failed: result.failed,
          ip: req.ip,
        });

        res.status(200).json({
          success: true,
          message: `Bulk action completed. ${result.success} successful, ${result.failed} failed.`,
          data: {
            action,
            total: categoryIds.length,
            success: result.success,
            failed: result.failed,
            errors: result.errors,
            completedAt: new Date(),
          },
        });
      } catch (error) {
        loggerHelpers.system("category_admin_bulk_action_error", {
          currentUserId: currentUser?._id?.toString(),
          action,
          categoryCount: categoryIds.length,
          error: (error as Error).message,
          ip: req.ip,
        });
        return next(new ErrorHandler(500, "Failed to perform bulk action"));
      }
    },
  ),

  /**
   * Search categories for autocomplete/dropdown
   * @route GET /admin/categories/search
   * @access Admin with categories.canView permission
   */
  searchCategories: CatchAsyncErrors(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const currentUser = req.user;
      const query = (req.query.q as string) || "";
      const limit = Math.min(
        50,
        Math.max(1, parseInt(req.query.limit as string) || 20),
      );
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const includeDeleted = req.query.includeDeleted === "true";

      loggerHelpers.business("category_search_attempt", {
        currentUserId: currentUser?._id?.toString(),
        query: query.substring(0, 50), // Log truncated query for privacy
        page,
        limit,
        includeDeleted,
        ip: req.ip,
      });

      try {
        const result = await categoryService.searchCategories(query, {
          limit,
          page,
          includeDeleted,
        });

        loggerHelpers.business("category_search_completed", {
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
              ? `Found ${result.results.length} categories`
              : "No categories found",
          data: result,
        });
      } catch (error) {
        loggerHelpers.system("category_search_error", {
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
   * Get category statistics for admin dashboard
   * @route GET /admin/categories/statistics
   * @access Admin with categories.canView permission
   */
  getCategoryStatistics: CatchAsyncErrors(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const currentUser = req.user;

      // Log statistics view attempt
      loggerHelpers.business("category_admin_statistics_view_attempt", {
        currentUserId: currentUser?._id?.toString(),
        ip: req.ip,
      });

      try {
        const statistics = await categoryService.getCategoryStatistics();

        loggerHelpers.business("category_admin_statistics_viewed", {
          currentUserId: currentUser?._id?.toString(),
          totalCategories: statistics.totalCategories,
          ip: req.ip,
        });

        res.status(200).json({
          success: true,
          message: "Category statistics retrieved successfully",
          data: statistics,
        });
      } catch (error) {
        loggerHelpers.system("category_admin_statistics_error", {
          currentUserId: currentUser?._id?.toString(),
          error: (error as Error).message,
          ip: req.ip,
        });
        return next(new ErrorHandler(500, "Failed to get category statistics"));
      }
    },
  ),

  /**
   * Move category to different parent or change order
   * @route PUT /admin/categories/:id/move
   * @access Admin with categories.canEdit permission
   */
  moveCategory: CatchAsyncErrors(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const { id } = req.params;
      const { newParentId, newOrder } = req.body;
      const currentUser = req.user;

      // Log category move attempt
      loggerHelpers.business("category_admin_move_attempt", {
        currentUserId: currentUser?._id?.toString(),
        categoryId: id,
        newParentId,
        newOrder,
        ip: req.ip,
      });

      if (!id) {
        return next(ErrorHandler.validation("Category ID is required"));
      }

      if (newParentId === undefined && newOrder === undefined) {
        return next(
          ErrorHandler.validation(
            "Either newParentId or newOrder must be provided",
            {
              code: "MISSING_MOVE_PARAMETERS",
            },
          ),
        );
      }

      if (newOrder !== undefined && (newOrder < 0 || newOrder > 9999)) {
        return next(
          ErrorHandler.validation("Order must be between 0-9999", {
            field: "newOrder",
            min: 0,
            max: 9999,
          }),
        );
      }

      try {
        const movedCategory = await categoryService.moveCategory(
          id,
          newParentId,
          newOrder,
        );

        if (!movedCategory) {
          return next(ErrorHandler.notFound("Category not found"));
        }

        loggerHelpers.business("category_admin_moved", {
          currentUserId: currentUser?._id?.toString(),
          categoryId: id,
          categoryName: movedCategory.name,
          newParentId,
          newOrder,
          newLevel: movedCategory.level,
          ip: req.ip,
        });

        res.status(200).json({
          success: true,
          message: "Category moved successfully",
          data: {
            categoryId: id,
            newParentId,
            newOrder,
            movedAt: new Date(),
            category: movedCategory,
          },
        });
      } catch (error) {
        if (
          (error as Error).message.includes("circular reference") ||
          (error as Error).message.includes("descendant")
        ) {
          return next(
            ErrorHandler.validation(
              "Cannot move category to its own descendant",
              {
                field: "newParentId",
                value: newParentId,
              },
            ),
          );
        }

        if ((error as Error).message.includes("not found")) {
          return next(
            ErrorHandler.validation("New parent category not found", {
              field: "newParentId",
              value: newParentId,
            }),
          );
        }

        loggerHelpers.system("category_admin_move_error", {
          currentUserId: currentUser?._id?.toString(),
          categoryId: id,
          newParentId,
          newOrder,
          error: (error as Error).message,
          ip: req.ip,
        });
        return next(new ErrorHandler(500, "Failed to move category"));
      }
    },
  ),

  // ================================
  // PUBLIC CATEGORY APIS (No Auth Required)
  // ================================

  /**
   * Search categories for public use (infinite scroll, autocomplete)
   * @route GET /categories/search
   * @access Public
   */
  searchCategoriesPublic: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const query = (req.query.q as string) || "";
      const limit = Math.min(
        50,
        Math.max(1, parseInt(req.query.limit as string) || 20),
      );
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const activeOnly = req.query.activeOnly !== "false"; // Default true

      try {
        const result = await categoryService.searchCategories(query, {
          limit,
          page,
          includeDeleted: false, // Never include deleted for public
        });

        // Filter only active categories if requested
        let filteredResults = result.results;
        if (activeOnly) {
          filteredResults = result.results.filter((cat: any) => cat.isActive);
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
              ? `Found ${filteredResults.length} categories`
              : "No categories found",
          data: {
            results: filteredResults,
            pagination: adjustedPagination,
            query: result.query,
          },
        });
      } catch (error) {
        return next(new ErrorHandler(500, "Failed to search categories"));
      }
    },
  ),

  /**
   * Get all categories for public use with pagination
   * @route GET /categories
   * @access Public
   */
  getAllCategoriesPublic: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(
          50,
          Math.max(1, parseInt(req.query.limit as string) || 20),
        );
        const search = ((req.query.search as string) || "").trim();
        const parent = (req.query.parent as string) || "all";
        const level = req.query.level
          ? parseInt(req.query.level as string)
          : null;

        const filters = {
          page,
          limit,
          search,
          status: "active" as const, // Only active categories for public
          featured: "all" as const,
          parent,
          level,
          isDeleted: false,
          sortBy: "order" as const,
          sortOrder: "asc" as const,
        };

        const result = await categoryService.getAllCategoriesAdmin(filters);

        res.status(200).json({
          success: true,
          message: "Categories retrieved successfully",
          data: {
            ...result,
            hasMore: result.currentPage < result.totalPages, // For infinite scroll
          },
        });
      } catch (error) {
        return next(new ErrorHandler(500, "Failed to get categories"));
      }
    },
  ),

  /**
   * Get category hierarchy for public navigation
   * @route GET /categories/hierarchy
   * @access Public
   */
  getCategoryHierarchyPublic: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const hierarchy = await categoryService.getCategoryHierarchyAdmin();

        // Filter only active categories for public use
        const filterActiveCategories = (categories: any[]): any[] => {
          return categories
            .filter((cat) => cat.isActive && !cat.isDeleted)
            .map((cat) => ({
              ...cat,
              children: cat.children
                ? filterActiveCategories(cat.children)
                : [],
            }));
        };

        const publicHierarchy = filterActiveCategories(hierarchy);

        res.status(200).json({
          success: true,
          message: "Category hierarchy retrieved successfully",
          data: publicHierarchy,
        });
      } catch (error) {
        return next(new ErrorHandler(500, "Failed to get category hierarchy"));
      }
    },
  ),

  /**
   * Get category by slug for public viewing
   * @route GET /categories/:slug
   * @access Public
   */
  getCategoryBySlugPublic: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const { slug } = req.params;

      if (!slug) {
        return next(ErrorHandler.validation("Category slug is required"));
      }

      try {
        // Find category by slug, only active and not deleted
        const category = await categoryService.getCategoryBySlug(slug);

        if (!category || !category.isActive || category.isDeleted) {
          return next(ErrorHandler.notFound("Category not found"));
        }

        res.status(200).json({
          success: true,
          message: "Category retrieved successfully",
          data: category,
        });
      } catch (error) {
        return next(new ErrorHandler(500, "Failed to get category"));
      }
    },
  ),
};

export default categoryController;
