"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
/**
 * Seller schema definition with fields and their validation.
 * Each field has a defined data type and certain constraints.
 */
const sellerSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    storeName: { type: String, required: true },
    storeDescription: { type: String },
    categories: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Category" }],
    contactEmail: { type: String, required: true },
    phoneNumber: { type: String },
    address: { type: String },
    status: {
        type: String,
        enum: ["active", "suspended", "pending"],
        default: "pending",
    },
    metadata: {
        type: Map,
        of: String,
    },
    image: {
        url: { type: String },
        publicId: { type: String },
    },
    banner: {
        url: { type: String },
        publicId: { type: String },
    },
    socialLinks: {
        facebook: { type: String },
        twitter: { type: String },
        instagram: { type: String },
        linkedin: { type: String },
    },
});
const Seller = (0, mongoose_1.model)("Seller", sellerSchema);
exports.default = Seller;
