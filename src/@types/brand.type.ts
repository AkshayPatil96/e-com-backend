import { Types } from "mongoose";
import { IImage } from "./common.type";

export interface IBrand extends Document {
  name: string;
  slug: string;
  description?: string;
  logo?: IImage;
  website?: string;
  categories: Types.ObjectId[];
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;

  // methods
  softDelete(): Promise<void>;
  restore(): Promise<void>;
}
