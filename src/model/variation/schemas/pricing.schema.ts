import { Schema } from "mongoose";

/**
 * Enhanced pricing schema for variations with business logic
 */
export interface IVariationPricing {
  basePrice: number; // Base price of the variation
  salePrice?: number; // Sale/discounted price (if on sale)
  costPrice?: number; // Cost price for profit calculations
  msrp?: number; // Manufacturer's Suggested Retail Price
  margin?: number; // Profit margin percentage
  currency: string; // Currency code (e.g., 'USD', 'EUR')
  taxRate?: number; // Tax rate percentage
  isOnSale: boolean; // Whether variation is on sale
  saleStartDate?: Date; // Sale start date
  saleEndDate?: Date; // Sale end date
  minOrderQuantity: number; // Minimum order quantity
  maxOrderQuantity?: number; // Maximum order quantity per order
  bulkPricing?: {
    quantity: number;
    price: number;
    discountPercentage?: number;
  }[]; // Bulk pricing tiers
}

export const VariationPricingSchema = new Schema<IVariationPricing>(
  {
    basePrice: {
      type: Number,
      required: true,
      min: [0, "Base price cannot be negative"],
      validate: {
        validator: function (value: number) {
          return value > 0;
        },
        message: "Base price must be greater than 0",
      },
    },
    salePrice: {
      type: Number,
      min: [0, "Sale price cannot be negative"],
      validate: {
        validator: function (this: IVariationPricing, value: number) {
          return !value || value <= this.basePrice;
        },
        message: "Sale price cannot be greater than base price",
      },
    },
    costPrice: {
      type: Number,
      min: [0, "Cost price cannot be negative"],
    },
    msrp: {
      type: Number,
      min: [0, "MSRP cannot be negative"],
    },
    margin: {
      type: Number,
      min: [0, "Margin cannot be negative"],
      max: [100, "Margin cannot exceed 100%"],
    },
    currency: {
      type: String,
      required: true,
      default: "USD",
      enum: ["USD", "EUR", "GBP", "JPY", "INR", "CAD", "AUD"], // Add more as needed
      uppercase: true,
    },
    taxRate: {
      type: Number,
      min: [0, "Tax rate cannot be negative"],
      max: [100, "Tax rate cannot exceed 100%"],
      default: 0,
    },
    isOnSale: {
      type: Boolean,
      default: false,
    },
    saleStartDate: {
      type: Date,
      validate: {
        validator: function (this: IVariationPricing, value: Date) {
          return !this.isOnSale || !!value;
        },
        message: "Sale start date is required when item is on sale",
      },
    },
    saleEndDate: {
      type: Date,
      validate: {
        validator: function (this: IVariationPricing, value: Date) {
          return !this.saleStartDate || !value || value > this.saleStartDate;
        },
        message: "Sale end date must be after sale start date",
      },
    },
    minOrderQuantity: {
      type: Number,
      required: true,
      default: 1,
      min: [1, "Minimum order quantity must be at least 1"],
    },
    maxOrderQuantity: {
      type: Number,
      min: [1, "Maximum order quantity must be at least 1"],
      validate: {
        validator: function (this: IVariationPricing, value: number) {
          return !value || value >= this.minOrderQuantity;
        },
        message:
          "Maximum order quantity must be greater than or equal to minimum order quantity",
      },
    },
    bulkPricing: [
      {
        quantity: {
          type: Number,
          required: true,
          min: [1, "Bulk pricing quantity must be at least 1"],
        },
        price: {
          type: Number,
          required: true,
          min: [0, "Bulk price cannot be negative"],
        },
        discountPercentage: {
          type: Number,
          min: [0, "Discount percentage cannot be negative"],
          max: [100, "Discount percentage cannot exceed 100%"],
        },
      },
    ],
  },
  { _id: false },
);
