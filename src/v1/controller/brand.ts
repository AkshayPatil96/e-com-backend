import { NextFunction, Request, Response } from "express";
import { CatchAsyncErrors } from "../../middleware/catchAsyncErrors";
import {
  createBrandService,
  deleteBrandService,
  getAllBrands,
  getBrandById,
  restoreBrandService,
  softDeleteBrandService,
  updateBrandService,
} from "../services/brand.service";

const brandController = {
  addBrand: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      let user = req.user;

      const newBrand = await createBrandService({
        ...req.body,
        createdBy: user._id,
        updatedBy: user._id,
      });

      res.status(201).json({
        success: true,
        message: "Brand created successfully",
        data: newBrand,
      });
    },
  ),

  getBrands: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const brands = await getAllBrands();
      res.status(200).json({
        success: true,
        message: "All brands fetched successfully",
        data: brands,
      });
    },
  ),

  getBrand: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      let { slug } = req.params;
      const brand = await getBrandById(slug);

      res.status(200).json({
        success: true,
        message: "Brand fetched successfully",
        data: brand,
      });
    },
  ),

  updateBrand: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const updatedBrand = await updateBrandService(req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: "Brand updated successfully",
        data: updatedBrand,
      });
    },
  ),

  softDeleteBrand: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const deletedBrand = await softDeleteBrandService(req.params.id);
      res.status(200).json({
        success: true,
        message: "Brand deleted successfully",
        data: deletedBrand,
      });
    },
  ),

  restoreBrand: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const restoredBrand = await restoreBrandService(req.params.id);
      res.status(200).json({
        success: true,
        message: "Brand restored successfully",
        data: restoredBrand,
      });
    },
  ),

  deleteBrand: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const deletedBrand = await deleteBrandService(req.params.id);
      res.status(200).json({
        success: true,
        message: "Brand deleted successfully",
        data: deletedBrand,
      });
    },
  ),
};

export default brandController;
