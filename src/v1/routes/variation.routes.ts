import { Router } from "express";
import variationController from "../controller/variation";

const router = Router();

router.post("/", variationController.addVariations);
router.put("/:id", variationController.updateVariation);

export default router;
