"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const common_model_1 = require("./schema/common.model");
const categorySchema = new mongoose_1.Schema({
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true }, // Unique slug for the category
    parent: { type: mongoose_1.Schema.Types.ObjectId, ref: "Category" }, // Reference to parent category
    description: { type: String }, // Category description
    images: [{ type: String }], // Category images
    banner: { type: String }, // Category banner image
    metadata: common_model_1.metaDataSchema, // Common metadata fields
});
const Category = (0, mongoose_1.model)("Category", categorySchema);
exports.default = Category;
