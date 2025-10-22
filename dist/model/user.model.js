"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = void 0;
// Re-export the User model from the organized structure
var user_1 = require("./user");
Object.defineProperty(exports, "default", { enumerable: true, get: function () { return __importDefault(user_1).default; } });
