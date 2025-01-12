import express from "express";
import { authorizeRoles, isAuthenticated } from "../../middleware/auth";
import authController from "../controller/auth";

const router = express.Router();

router.post("/register", authController.signup);
router.post("/activate-user", authController.activateUserAccount);
router.post("/login", authController.loginUser);
router.post("/logout", isAuthenticated, authController.logoutUser);
router.get("/refresh-token", authController.updateRefreshToken);
router.post("/forget-password", authController.forgetPassword);
router.post("/reset-password/:resetToken", authController.resetPassword);

export default router;
