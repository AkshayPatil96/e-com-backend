import { Router } from "express";
import categoryController from "../controller/category";
import { authorizeRoles, isAuthenticated } from "../../middleware/auth";

const router = Router();

//! Global routes here
router.get(
  "/:slug/subcategories",
  categoryController.getCategoryWithSubcategories,
);
// GET /category/electronics/subcategories
router.get("/parents", categoryController.getAllParentCategories);
// GET /category/parents
router.get("/nested", categoryController.getCategoriesNested);
// GET /category/nested
router.get("/:slug", categoryController.getCategoryBySlug);
// GET /category/electronics
router.get(
  "/:slug/subcategories/:level",
  categoryController.getSubcategoriesBySlugAndLevel,
);
// GET /category/electronics/subcategories/2
router.get("/level/:level", categoryController.getAllCategoriesByLevel);
// GET /category/level/2
router.get("/searching", categoryController.getCategoriesBySearch);
// GET /category/search?name=electr

router.get("/", categoryController.getAllCategories);

//! Admin routes here
router.post(
  "/",
  isAuthenticated,
  authorizeRoles("admin", "superadmin"),
  categoryController.addCategory,
);
// POST /category
router.put(
  "/:id",
  isAuthenticated,
  authorizeRoles("admin", "superadmin"),
  categoryController.updateCategory,
);
// PUT /category/1
router.delete(
  "/soft-delete/:id",
  isAuthenticated,
  authorizeRoles("admin", "superadmin"),
  categoryController.softDeleteCategory,
);
// DELETE /category/soft-delete/1
router.put(
  "/restore/:id",
  isAuthenticated,
  authorizeRoles("admin", "superadmin"),
  categoryController.restoreCategory,
);
// PUT /category/restore/1
router.delete(
  "/:id",
  isAuthenticated,
  authorizeRoles("admin", "superadmin"),
  categoryController.deleteCategory,
);
// DELETE /category/1

export default router;
