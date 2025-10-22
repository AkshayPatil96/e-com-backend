import { Schema } from "mongoose";
import { ICategory } from "../../../@types/category.type";

/**
 * Pre-update middleware for category
 */
export function preUpdateMiddleware(schema: Schema<ICategory>) {
  schema.pre(["findOneAndUpdate", "updateOne", "updateMany"], function () {
    // Update the updatedAt timestamp
    this.set({ updatedAt: new Date() });
  });
}
