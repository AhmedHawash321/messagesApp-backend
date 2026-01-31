import express from "express";
import { signup, login } from "../controllers/auth.controller.js";
import * as authController from "../controllers/auth.controller.js";
import { validateJoi } from "../middleware/joiValidation.middleware.js";
import { forgetPasswordSchema, sendOtpSchema } from "../models/auth.schema.js";


const router = express.Router();

router.post('/signup', signup);

router.post('/login', login);

router.get('/activate/:token', authController.activate);

router.post('/verify', validateJoi(sendOtpSchema), authController.sendOtp);

router.post('/forget-password', validateJoi(forgetPasswordSchema), authController.forgetPassword);

router.post('/reset-password', authController.resetPassword);

router.post('/refresh-token', authController.refreshToken);

export default router;