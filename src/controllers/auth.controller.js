import User from "../models/user.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sendEmail } from "../utils/sendEmail.js";
import { generateTemplateHtml } from "../utils/templateHtml.js";

export const signup = async (req, res) => {
    const { name, email, password, confirmPassword, gender } = req.body;
    try {

        if (!name || !email || !password || !confirmPassword || !gender) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match" });
        }

        const hashPassword = await bcrypt.hash(password, 10);

        // Create user with isActivated: false
        const user = await User.create({ 
            name, 
            email, 
            password: hashPassword, 
            gender,
            isActivated: false
        });

        const token = jwt.sign(
            { 
                id: user._id, 
                email: user.email 
            }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1d' }
        );

        const link = `http://localhost:3000/api/auth/activate/${token}`
        
        const emailSent = await sendEmail(email, 'Welcome to Social App', generateTemplateHtml(name, link));

        res.status(201).json({
            message: 'User created successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                gender: user.gender,
                isActivated: user.isActivated
            },
            activationLink: link,
            activationToken: token
        });
        
    } catch (error) {
        console.log("Error in signup controller", error.message);
        res.status(500).json({ message: error.message });
    }
};

export const login = async (req, res) => {
	const { email, password } = req.body;

	try {
		const user = await User.findOne({ email });
		if (!user) {
			return res.status(404).json({ message: "User not found, please sign up again" });
		}

		if (!user.isActivated) {
            return res.status(400).json({ 
                message: "Please activate your account first. Check your email for activation link." 
            });
        }

		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) {
			return res.status(400).json({ message: "Invalid credentials" });
		}

		const token = jwt.sign({id: user._id}, process.env.JWT_SECRET, { expiresIn: '1d' });

		res.status(200).json({ message: "Logged in successfully", token });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
}

export const activate = async (req, res) => {
    try {
        const { token } = req.params;
        
        if (!token) {
            return res.status(400).json({
                success: false,
                message: "Activation token is required"
            });
        }

        // Verify the JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Find user by email from token
        const user = await User.findOne(decoded.email);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Check if already activated
        if (user.isActivated) {
            return res.status(200).json({
                success: true,
                message: "Account is already activated"
            });
        }

        // Activate the user - set isActivated to true
        user.isActivated = true;
        await user.save();

        console.log('User activated:', user.email, 'isActivated:', user.isActivated);

        res.status(200).json({
            success: true,
            message: "Account activated successfully! You can now login."
        });
        
    } catch (error) {
        console.error('Activation error:', error.message);
        
        if (error.name === 'TokenExpiredError') {
            return res.status(400).json({
                success: false,
                message: "Activation link has expired"
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(400).json({
                success: false,
                message: "Invalid activation token"
            });
        }
        
        res.status(500).json({
            success: false,
            message: "Server error during activation"
        });
    }
}