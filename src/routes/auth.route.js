import express from "express";
import { signup, login } from "../controllers/auth.controller.js";
import * as authController from "../controllers/auth.controller.js";


const router = express.Router();

router.post('/signup', signup);

router.post('/login', login);

router.get('/activate/:token', authController.activate)

export default router;