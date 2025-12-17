import mongoose from "mongoose";

export const gender = {
    male: 'male',
    female: 'female'
} 

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        match: [/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Please use a valid email address']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters long']
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    isActivated: {
        type: Boolean,
        default: false
    },
    gender: {
        type: String,
        enum: Object.values(gender),
        required: true
    },

} , { timestamps: true });

const User = mongoose.model("User", userSchema);

export default User;