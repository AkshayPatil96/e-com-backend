import { Schema } from "mongoose";
import { IRecentItem } from "../../../@types/user.type";

/**
 * Recent item schema definition with fields and their validation.
 * Each field has a defined data type and certain constraints.
 */
export const RecentItemSchema = new Schema<IRecentItem>(
  {
    recentlyViewedProducts: {
      type: [{ type: Schema.Types.ObjectId, ref: "Product" }],
      validate: {
        validator: function (v: any[]) {
          return v.length <= 50; // Limit to 50 recent items
        },
        message: "Too many recent items",
      },
    },
    recentlySearchedProducts: {
      type: [{ type: Schema.Types.ObjectId, ref: "Product" }],
      validate: {
        validator: function (v: any[]) {
          return v.length <= 30;
        },
        message: "Too many recent searched products",
      },
    },
    recentCategories: {
      type: [{ type: Schema.Types.ObjectId, ref: "Category" }],
      validate: {
        validator: function (v: any[]) {
          return v.length <= 20;
        },
        message: "Too many recent categories",
      },
    },
    recentBrands: {
      type: [{ type: Schema.Types.ObjectId, ref: "Brand" }],
      validate: {
        validator: function (v: any[]) {
          return v.length <= 20;
        },
        message: "Too many recent brands",
      },
    },
    recentSearches: {
      type: [{ type: String, trim: true }],
      validate: {
        validator: function (v: string[]) {
          return v.length <= 50;
        },
        message: "Too many recent searches",
      },
    },
  },
  { _id: false },
);
