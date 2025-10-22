"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = void 0;
// Re-export the Product model from the organized structure
var product_1 = require("./product");
Object.defineProperty(exports, "default", { enumerable: true, get: function () { return __importDefault(product_1).default; } });
