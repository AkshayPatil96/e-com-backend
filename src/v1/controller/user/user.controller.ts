import { NextFunction, Request, Response } from "express";
import { CatchAsyncErrors } from "../../../middleware/catchAsyncErrors";
import ErrorHandler from "../../../utils/ErrorHandler";
import { loggerHelpers } from "../../../utils/logger";
import userService from "../../services/user/user.service";

const userController = {
  /**
   * Search users for autocomplete/dropdown
   * @route GET /admin/users/search
   * @access Admin with users.canView permission
   */
  searchUsers: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const currentUser = req.user;
      const q = req.query.q as string;
      const excludeExistingSellers =
        req.query.excludeExistingSellers === "true";
      const limit = Math.min(
        50,
        Math.max(10, parseInt(req.query.limit as string) || 20),
      );
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const includeDeleted = req.query.includeDeleted === "true";

      loggerHelpers.business("user_admin_search_attempt", {
        currentUserId: currentUser?._id?.toString(),
        query: q.substring(0, 50),
        limit,
        page,
        includeDeleted,
        ip: req.ip,
      });

      try {
        const result = await userService.searchUsers(q, {
          limit,
          page,
          includeDeleted,
          excludeExistingSellers,
        });

        loggerHelpers.business("category_search_completed", {
          currentUserId: currentUser?._id?.toString(),
          query: q.substring(0, 50),
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
        loggerHelpers.system("user_admin_search_error", {
          currentUserId: currentUser?._id?.toString(),
          query: q.substring(0, 50),
          page,
          error: (error as Error).message,
          ip: req.ip,
        });
        next(error);
      }
    },
  ),

  /**
   * Get single user by ID for admin
   * @route GET /admin/users/:id
   * @access Admin with users.canView permission
   */
  getUserByIdAdmin: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const { id } = req.params;
      const currentUser = req.user;

      loggerHelpers.business("user_admin_get_attempt", {
        currentUserId: currentUser?._id?.toString(),
        targetUserId: id,
        ip: req.ip,
      });

      if (!id) {
        return next(ErrorHandler.validation("User ID is required"));
      }

      try {
        const user = await userService.getUserByIdAdmin(id);

        if (!user) {
          return next(ErrorHandler.notFound("User not found"));
        }

        loggerHelpers.business("user_admin_get_completed", {
          currentUserId: currentUser?._id?.toString(),
          targetUserId: id,
          name: user.name,
          email: user.email,
          ip: req.ip,
        });

        res.status(200).json({
          success: true,
          message: "User details fetched successfully",
          data: user,
        });
      } catch (error) {
        loggerHelpers.system("user_admin_get_error", {
          currentUserId: currentUser?._id?.toString(),
          targetUserId: id,
          error: (error as Error).message,
          ip: req.ip,
        });
        next(error);
      }
    },
  ),
};

export default userController;
