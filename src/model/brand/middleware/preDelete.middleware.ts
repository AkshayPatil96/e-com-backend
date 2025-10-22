import ErrorHandler from "../../../utils/ErrorHandler";
import Category from "../../category.model";
import Product from "../../product.model";

/**
 * Pre-delete middleware to prevent deletion of brands with associated products.
 */
export const preDeleteMiddleware = async function (
  this: any,
  next: (error?: Error) => void,
) {
  const query = this.getQuery();
  const brandId = query._id;

  try {
    // Check for associated active products
    const products = await Product.find({
      brand: brandId,
      isDeleted: false,
    }).exec();

    if (products.length) {
      return next(
        new ErrorHandler(
          400,
          "Cannot delete brand with associated active products",
        ),
      );
    }

    // Remove brand from all categories
    await Category.updateMany(
      { brands: brandId },
      { $pull: { brands: brandId } },
    ).exec();

    next();
  } catch (error) {
    next(error as Error);
  }
};
