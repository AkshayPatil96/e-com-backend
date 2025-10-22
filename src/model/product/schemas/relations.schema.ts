import mongoose, { Schema } from "mongoose";
import { IProductRelations } from "../../../@types/product.type";

/**
 * Product Relations Schema
 */
export const ProductRelationsSchema = new Schema<IProductRelations>(
  {
    relatedProducts: [
      {
        type: Schema.Types.ObjectId,
        ref: "Product",
        validate: {
          validator: function (products: mongoose.Types.ObjectId[]) {
            return products.length <= 10;
          },
          message: "Cannot have more than 10 related products",
        },
      },
    ],
    crossSells: [
      {
        type: Schema.Types.ObjectId,
        ref: "Product",
        validate: {
          validator: function (products: mongoose.Types.ObjectId[]) {
            return products.length <= 5;
          },
          message: "Cannot have more than 5 cross-sell products",
        },
      },
    ],
    upSells: [
      {
        type: Schema.Types.ObjectId,
        ref: "Product",
        validate: {
          validator: function (products: mongoose.Types.ObjectId[]) {
            return products.length <= 5;
          },
          message: "Cannot have more than 5 up-sell products",
        },
      },
    ],
    bundles: [
      {
        type: Schema.Types.ObjectId,
        ref: "Product",
        validate: {
          validator: function (products: mongoose.Types.ObjectId[]) {
            return products.length <= 3;
          },
          message: "Cannot have more than 3 bundle products",
        },
      },
    ],
  },
  { _id: false },
);
