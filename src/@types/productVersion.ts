import { Types } from "mongoose";
import { IProduct } from "./product.type";

// Interface for the product version document
export interface IProductVersion extends Document {
  productId: Types.ObjectId;
  versionNumber: number;
  versionData: IProduct;
  createdAt: Date;
  updatedBy: Types.ObjectId;
}
