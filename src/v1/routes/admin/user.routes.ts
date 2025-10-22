import { Router } from "express";
import { authorizeRoles, isAuthenticated } from "../../../middleware/auth";
import userController from "../../controller/user/user.controller";

const router = Router();

router.use(isAuthenticated);

router.get(
  "/search",
  authorizeRoles("admin", "superadmin"),
  userController.searchUsers,
);

router.get(
  "/:id",
  authorizeRoles("admin", "superadmin"),
  userController.getUserByIdAdmin,
);

export default router;
