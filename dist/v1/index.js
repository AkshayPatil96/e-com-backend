"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const v1Router = (0, express_1.Router)();
v1Router.get("/", (req, res) => {
    res.send("Hello from v1 routes of e-com API");
});
v1Router.use("/auth", auth_routes_1.default);
v1Router.use("/user", user_routes_1.default);
exports.default = v1Router;
