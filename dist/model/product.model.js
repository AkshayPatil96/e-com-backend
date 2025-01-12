"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
/**
 * Product schema definition with fields and their validation.
 * Each field has a defined data type and certain constraints.
 */
const productSchema = new mongoose_1.Schema({
    name: { type: String, required: true }, // Product name
    description: { type: String, required: true }, // Product description
    category: {
        type: String,
        enum: [
            "clothing",
            "electronics",
            "books",
            "shoes",
            "accessories",
            "home & garden",
            "beauty & health",
        ],
        required: true,
    }, // Product category
    subcategory: {
        type: String,
        enum: ["shirts", "pants", "laptops", "keyboards", "footwear", "skincare"],
    }, // Optional product subcategory
    variations: [
        {
            // Product variations for size, color, etc.
            color: { type: String, required: true }, // Product color
            size: { type: String }, // Optional product size
            sku: { type: String, required: true, unique: true }, // Unique SKU for this variation
            price: { type: Number, required: true }, // Price for this variation
            quantity: { type: Number, required: true }, // Available stock quantity
        },
    ],
    images: [{ type: String, required: true }], // Product images
    createdAt: { type: Date, default: Date.now }, // Creation timestamp
    updatedAt: { type: Date, default: Date.now }, // Update timestamp
    isFeatured: { type: Boolean, default: false }, // Featured product flag
    isActive: { type: Boolean, default: true }, // Active product flag
});
/**
 * Product model for interacting with the product collection in MongoDB.
 * It allows CRUD operations on product documents.
 */
const Product = mongoose_1.default.model("Product", productSchema);
exports.default = Product;
