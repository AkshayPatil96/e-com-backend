"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = exports.CategorySchema = void 0;
// Re-export organized category model
var category_1 = require("./category");
Object.defineProperty(exports, "CategorySchema", { enumerable: true, get: function () { return category_1.CategorySchema; } });
Object.defineProperty(exports, "default", { enumerable: true, get: function () { return __importDefault(category_1).default; } });
