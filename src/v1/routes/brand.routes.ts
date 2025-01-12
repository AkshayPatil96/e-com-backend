import { Router } from "express";
import { authorizeRoles, isAuthenticated } from "../../middleware/auth";
import brandController from "../controller/brand";

const router = Router();

router.post(
  "/",
  isAuthenticated,
  authorizeRoles("admin", "superadmin"),
  brandController.addBrand,
);
router.put(
  "/:id",
  isAuthenticated,
  authorizeRoles("admin", "superadmin"),
  brandController.updateBrand,
);
router.get("/", brandController.getBrands);
router.get("/:slug", brandController.getBrand);
router.delete(
  "/soft-delete/:id",
  isAuthenticated,
  authorizeRoles("admin", "superadmin"),
  brandController.softDeleteBrand,
);
router.put(
  "/restore/:id",
  isAuthenticated,
  authorizeRoles("admin", "superadmin"),
  brandController.restoreBrand,
);
router.delete(
  "/:id",
  isAuthenticated,
  authorizeRoles("admin", "superadmin"),
  brandController.deleteBrand,
);

export default router;
