import { NextFunction, Request, Response } from "express";
import { CatchAsyncErrors } from "../../middleware/catchAsyncErrors";
import { IProduct } from "../../@types/product.type";
import { IVariation } from "../../@types/variation.type";
import {
  createProductService,
  updateProductService,
} from "../services/product.service";

const productController = {
  addProduct: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const {
        product,
        variations,
      }: { product: IProduct; variations: IVariation[] } = req.body;

      const result = await createProductService(product, variations);

      return res.status(201).json({
        success: true,
        message: "Product created successfully",
        data: result,
      });
    },
  ),

  updateProduct: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const { productId } = req.params;
      const updateData = req.body;

      const updatedProduct = await updateProductService(productId, updateData);

      return res.status(200).json({
        success: true,
        message: "Product updated successfully",
        data: updatedProduct,
      });
    },
  ),
};

export default productController;
