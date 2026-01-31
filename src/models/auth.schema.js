import joi from 'joi';
import { gender } from '../models/user.model.js';
import e from 'express';

export const authSchema = joi.object({
    email: joi.string().email().required(),
    password: joi.string().min(6).required(),
    age: joi.number().integer().min(0).optional(),
    gender: joi.string().valid(...Object.values(gender)).required(),
    confirmPassword: joi.any().valid(joi.ref('password')).required().messages({'any.only': 'Passwords do not match'}),
    name: joi.string().min(2).max(50).required(),
    otp: joi.string().length(10)
}).required();

export const sendOtpSchema = joi.object({
    email: joi.string().email().required()
}).required();

export const forgetPasswordSchema = joi.object({
    email: joi.string().email().required(),
    otp: joi.string().length(10).required(),
    newPassword: joi.string().min(6).required(),
    confirmNewPassword: joi.any().valid(joi.ref('newPassword')).required().messages({'any.only': 'Passwords do not match'})
})