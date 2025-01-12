import express from "express";
import userController from "../controller/user";
import { isAuthenticated } from "../../middleware/auth";

const router = express.Router();

router.get("/me", isAuthenticated, userController.myProfile);
router.put("/update", isAuthenticated, userController.updateProfile);
router.get("/all", isAuthenticated, userController.getAllUsers);
router.delete("/:id", isAuthenticated, userController.deleteUser);

export default router;
