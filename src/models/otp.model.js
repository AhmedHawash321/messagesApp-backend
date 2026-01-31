import {Schema} from 'mongoose';
import mongoose from "mongoose";

const otpSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        index: true
    },
    otp: {
        type: String,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true,
        // TTL index - auto-deletes document when expiresAt time is reached
    },
    purpose: {
        type: String,
        enum: ['signup', 'password-reset', 'login'],
        default: 'signup'
    },
    attempts: {
        type: Number,
        default: 0
    }
}, {timestamps: true});

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OTP = mongoose.model('OTP', otpSchema);

export default OTP;