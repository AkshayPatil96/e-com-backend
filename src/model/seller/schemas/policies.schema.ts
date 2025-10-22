import { Schema } from "mongoose";
import { ISellerPolicies } from "../../../@types/seller.type";

/**
 * Seller policies schema
 */
export const SellerPoliciesSchema = new Schema<ISellerPolicies>(
  {
    returnPolicy: {
      acceptReturns: { type: Boolean, default: false },
      returnWindow: { type: Number, default: 30 }, // days
      returnConditions: { type: String, trim: true },
    },
    shippingPolicy: {
      processingTime: { type: Number, default: 1 }, // days
      shippingMethods: [{ type: String, trim: true }],
      freeShippingThreshold: { type: Number, min: 0 },
    },
    exchangePolicy: {
      acceptExchanges: { type: Boolean, default: false },
      exchangeWindow: { type: Number, default: 15 }, // days
    },
  },
  { _id: false },
);
