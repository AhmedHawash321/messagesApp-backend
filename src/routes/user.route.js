import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import * as userController from "../controllers/user.controller.js";

const userRouter = Router();

userRouter.get('/profile', authMiddleware, userController.profile)

export default userRouter;
