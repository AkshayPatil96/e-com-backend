import { Router } from "express";
import productController from "../controller/product";

const router = Router();

router.post("/", productController.addProduct);
router.put("/:id", productController.updateProduct);

export default router;
