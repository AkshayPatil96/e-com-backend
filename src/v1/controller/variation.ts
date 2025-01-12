import { NextFunction, Request, Response } from "express";
import { CatchAsyncErrors } from "../../middleware/catchAsyncErrors";
import { IVariation } from "../../@types/variation.type";
import {
  createVariations,
  updateVariationsService,
} from "../services/variation.service";

const variationController = {
  addVariations: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const {
        productId,
        variations,
      }: { productId: string; variations: IVariation[] } = req.body;

      const createdVariations = await createVariations(productId, variations); // Call service to create variations

      return res.status(201).json({
        success: true,
        message: "Variations created successfully",
        data: createdVariations,
      });
    },
  ),

  updateVariation: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const { productId } = req.params;
      const variations = req.body; // Assuming variations are passed as an array

      const updatedVariations = await updateVariationsService(
        productId,
        variations,
      );

      return res.status(200).json({
        success: true,
        message: "Variations updated successfully",
        data: updatedVariations,
      });
    },
  ),
};

export default variationController;
