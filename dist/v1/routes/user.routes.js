"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
// import userController from "../controller/auth";
const router = express_1.default.Router();
// router.post("/new", userController.signup);
// router.get("/:username", userController.getUser);
exports.default = router;
