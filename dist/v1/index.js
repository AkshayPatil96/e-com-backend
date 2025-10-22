"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const brand_routes_1 = __importDefault(require("./routes/brand.routes"));
const category_routes_1 = __importDefault(require("./routes/category.routes"));
const product_routes_1 = __importDefault(require("./routes/product.routes"));
const seller_routes_1 = __importDefault(require("./routes/seller.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const variation_routes_1 = __importDefault(require("./routes/variation.routes"));
const v1Router = (0, express_1.Router)();
v1Router.get("/", (req, res) => {
    res.send("Hello from v1 routes of e-com API");
});
v1Router.use("/auth", auth_routes_1.default);
v1Router.use("/user", user_routes_1.default);
v1Router.use("/admin", admin_routes_1.default); // Admin routes now include categories, brands, products for admin panel
v1Router.use("/categories", category_routes_1.default); // Public category routes
v1Router.use("/product", product_routes_1.default); // Public product routes
v1Router.use("/variation", variation_routes_1.default);
v1Router.use("/seller", seller_routes_1.default);
v1Router.use("/brand", brand_routes_1.default); // Public brand routes
exports.default = v1Router;
