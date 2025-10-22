"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Variation = exports.default = void 0;
// Re-export the enhanced variation model for backward compatibility
var variation_1 = require("./variation");
Object.defineProperty(exports, "default", { enumerable: true, get: function () { return variation_1.EnhancedVariation; } });
Object.defineProperty(exports, "Variation", { enumerable: true, get: function () { return variation_1.Variation; } });
