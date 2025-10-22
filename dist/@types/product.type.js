"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductCondition = exports.ProductStatus = void 0;
/**
 * Product status enumeration
 */
var ProductStatus;
(function (ProductStatus) {
    ProductStatus["DRAFT"] = "draft";
    ProductStatus["PENDING"] = "pending";
    ProductStatus["PUBLISHED"] = "published";
    ProductStatus["ARCHIVED"] = "archived";
    ProductStatus["OUT_OF_STOCK"] = "out_of_stock";
})(ProductStatus || (exports.ProductStatus = ProductStatus = {}));
/**
 * Product condition enumeration
 */
var ProductCondition;
(function (ProductCondition) {
    ProductCondition["NEW"] = "new";
    ProductCondition["REFURBISHED"] = "refurbished";
    ProductCondition["USED"] = "used";
})(ProductCondition || (exports.ProductCondition = ProductCondition = {}));
