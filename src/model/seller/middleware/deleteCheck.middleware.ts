import { Types } from "mongoose";
import ErrorHandler from "../../../utils/ErrorHandler";
import Product from "../../product.model";

/**
 * Delete check utility function to verify if seller can be deleted
 */
export const deleteCheck = async (id: string | Types.ObjectId, query: any) => {
  const products = await Product.find({ seller: id, status: "active" });
  if (products.length)
    return query.next(
      new ErrorHandler(400, "Cannot delete seller with active products"),
    );
};
