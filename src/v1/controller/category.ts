import { NextFunction, Request, Response } from "express";
import { CatchAsyncErrors } from "../../middleware/catchAsyncErrors";
import {
  addCategoryService,
  allCategoriesByLevel,
  CategoryBySlug,
  deleteCategoryService,
  getAllCategoriesNested,
  getAllCategoriesService,
  getAllParentCategories,
  getCategoryWithNestedSubcategoriesService,
  restoreCategoryService,
  searchCategoriesByName,
  softDeleteCategoryService,
  subcategoriesBySlugAndLevel,
  updateCategoryService,
} from "../services/category.service";
import ErrorHandler from "../../utils/ErrorHandler";

const categoryController = {
  addCategory: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      let { name } = req.body;
      if (!name) return next(new ErrorHandler(400, "Name is required"));

      let payload = { ...req.body };
      delete payload.ansestors;
      delete payload.path;
      delete payload.slug;
      const data = await addCategoryService(payload);

      return res.status(201).json({
        success: true,
        message: "Category added successfully",
        data,
      });
    },
  ),

  updateCategory: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const { id } = req.params;

      const updatedCategory = await updateCategoryService(
        { _id: id, isDeleted: false },
        req.body,
      );

      if (!updatedCategory) {
        return next(new ErrorHandler(404, "Category not found"));
      }

      return res.status(200).json({
        success: true,
        message: "Category updated successfully",
        data: updatedCategory,
      });
    },
  ),

  softDeleteCategory: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const { id } = req.params;

      let category = await softDeleteCategoryService(id);

      if (!category) {
        return next(new ErrorHandler(404, "Category not found"));
      }

      return res.status(200).json({
        success: true,
        message: "Category deleted successfully",
        data: category,
      });
    },
  ),

  restoreCategory: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const { id } = req.params;

      let category = await restoreCategoryService(id);

      if (!category) return next(new ErrorHandler(404, "Category not found"));

      return res.status(200).json({
        success: true,
        message: "Category restored successfully",
        data: category,
      });
    },
  ),

  deleteCategory: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const { id } = req.params;

      let category = await deleteCategoryService(id);

      if (!category) return next(new ErrorHandler(404, "Category not found"));

      return res.status(200).json({
        success: true,
        message: "Category deleted permanently",
        data: category,
      });
    },
  ),

  getCategoryWithSubcategories: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const { slug } = req.params;

      // Fetch the category along with subcategories using the service function
      const category = await getCategoryWithNestedSubcategoriesService(slug);

      if (!category) {
        return next(new ErrorHandler(404, "Category not found"));
      }

      return res.status(200).json({
        success: true,
        message: "Category and subcategories fetched successfully",
        data: category,
      });
    },
  ),

  getAllParentCategories: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const categories = await getAllParentCategories();

      // If no categories found
      if (!categories || categories.length === 0) {
        return next(new ErrorHandler(404, "No parent categories found"));
      }

      // Respond with the fetched categories
      return res.status(200).json({
        success: true,
        message: "Parent categories fetched successfully",
        data: categories,
      });
    },
  ),

  getCategoriesNested: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const categories = await getAllCategoriesNested();

      if (!categories) {
        return next(new ErrorHandler(404, "No categories found"));
      }

      res.status(200).json({
        success: true,
        message: "Categories fetched successfully",
        data: categories,
      });
    },
  ),

  getCategoryBySlug: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const { slug } = req.params;

      const category = await CategoryBySlug(slug);

      if (!category) {
        return next(new ErrorHandler(404, "Category not found"));
      }

      return res.status(200).json({
        success: true,
        message: "Category fetched successfully",
        data: category,
      });
    },
  ),

  getSubcategoriesBySlugAndLevel: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const { slug, level } = req.params;

      const category = await subcategoriesBySlugAndLevel(slug, parseInt(level));

      if (!category) {
        return next(new ErrorHandler(404, "Category not found"));
      }

      return res.status(200).json({
        success: true,
        message: "Subcategories fetched successfully",
        data: category,
      });
    },
  ),

  getAllCategoriesByLevel: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const { level } = req.params;

      const categories = await allCategoriesByLevel(parseInt(level, 10));

      if (!categories) {
        return next(new ErrorHandler(404, "No categories found"));
      }

      return res.status(200).json({
        success: true,
        message: "Categories fetched successfully",
        data: categories,
      });
    },
  ),

  getCategoriesBySearch: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const { name } = req.query;
      console.log("name: ", name);

      // if (!name || typeof name !== "string") {
      //   return next(new ErrorHandler(400, "Invalid search query"));
      // }

      // const categories = await searchCategoriesByName(name);

      // if (!categories) {
      //   return next(new ErrorHandler(404, "No categories found"));
      // }

      return res.status(200).json({
        success: true,
        message: "Categories fetched successfully",
        // data: categories,
      });
    },
  ),

  getAllCategories: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      let filter = {
        isDeleted: false,
      } as any;

      if (req.query.isFeatured) filter = { ...filter, isFeatured: true };

      let populate = [{ path: "ancestors" }] as any;

      const categories = await getAllCategoriesService(filter, {}, populate);

      if (!categories)
        return next(new ErrorHandler(404, "No categories found"));

      return res.status(200).json({
        success: true,
        message: "Categories fetched successfully",
        data: categories,
      });
    },
  ),
};

export default categoryController;
