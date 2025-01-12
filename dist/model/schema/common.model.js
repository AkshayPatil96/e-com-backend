"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metaDataSchema = void 0;
const mongoose_1 = require("mongoose");
exports.metaDataSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    slug: { type: String, required: true },
    description: { type: String },
    keywords: { type: String },
    images: [{ type: String }],
});
