// src/controllers/sellerController.ts
import { NextFunction, Request, Response } from "express";
import {
  createSellerService,
  deleteSellerService,
  getAllSellersService,
  getSellerByIdService,
  restoreSellerService,
  softDeleteSellerService,
  updateSellerService,
} from "../services/seller.service";
import { CatchAsyncErrors } from "../../middleware/catchAsyncErrors";
import ErrorHandler from "../../utils/ErrorHandler";

const sellerController = {
  createSeller: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const sellerData = req.body;
      const newSeller = await createSellerService(sellerData);
      res.status(201).json({
        success: true,
        message: "Seller created successfully",
        data: newSeller,
      });
    },
  ),

  updateSeller: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const sellerId = req.params.id;
      const updateData = req.body;

      const updatedSeller = await updateSellerService(sellerId, updateData);

      if (!updatedSeller) {
        return res.status(404).json({ message: "Seller not found" });
      }

      res.status(200).json({
        success: true,
        message: "Seller updated successfully",
        data: updatedSeller,
      });
    },
  ),

  getSellerBySlug: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const { slug } = req.params;
      const seller = await getSellerByIdService(slug);

      if (!seller) {
        return res.status(404).json({ message: "Seller not found" });
      }

      res.status(200).json({
        success: true,
        message: "Seller retrieved successfully",
        data: seller,
      });
    },
  ),

  getAllSellers: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const sellers = await getAllSellersService({
        status: "active",
        isDeleted: false,
      });

      res.status(200).json({
        success: true,
        message: "Sellers retrieved successfully",
        data: sellers,
      });
    },
  ),

  softDeleteSeller: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const sellerId = req.params.id;
      const seller = await softDeleteSellerService(sellerId);

      if (!seller) return next(new ErrorHandler(404, "Seller not found"));

      res.status(200).json({
        success: true,
        message: "Seller soft-deleted successfully",
        data: seller,
      });
    },
  ),

  restoreSeller: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const sellerId = req.params.id;
      const seller = await restoreSellerService(sellerId);

      if (!seller) return next(new ErrorHandler(404, "Seller not found"));

      res.status(200).json({
        success: true,
        message: "Seller restored successfully",
        data: seller,
      });
    },
  ),

  deleteSeller: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const sellerId = req.params.id;
      const seller = await deleteSellerService(sellerId);

      if (!seller) return next(new ErrorHandler(404, "Seller not found"));

      res.status(200).json({
        success: true,
        message: "Seller deleted successfully",
        data: seller,
      });
    },
  ),
};

export default sellerController;
