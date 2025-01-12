"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../controller/auth"));
const auth_2 = require("../../middleware/auth");
const router = express_1.default.Router();
router.post("/register", auth_1.default.signup);
router.post("/activate-user", auth_1.default.activateUserAccount);
router.post("/login", auth_1.default.loginUser);
router.get("/logout", auth_2.isAuthenticated, auth_1.default.logoutUser);
router.get("/user", auth_2.isAuthenticated, auth_1.default.getUser);
exports.default = router;
