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
 * Variation schema definition with fields and their validation.
 */
const variationSchema = new mongoose_1.Schema({
    productId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Product", required: true }, // Reference to the product
    color: { type: String }, // Optional product color
    size: { type: String }, // Optional product size
    sku: { type: String, required: true, unique: true }, // Unique SKU for this variation
    price: { type: Number, required: true }, // Price for this variation
    quantity: { type: Number, required: true }, // Available stock quantity
    storage: { type: String }, // Storage capacity for electronic products
});
/**
 * Variation model for interacting with the variation collection in MongoDB.
 */
const Variation = mongoose_1.default.model("Variation", variationSchema);
exports.default = Variation;
