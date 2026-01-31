import User from "../models/user.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sendEmail } from "../utils/sendEmail.js";
import { generateTemplateHtml } from "../utils/templateHtml.js";
import OTP from "../models/otp.model.js";
import Randomstring from "randomstring";

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
      isActivated: false,
    });

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    const link = `http://localhost:3000/api/auth/activate/${token}`;

    const emailSent = await sendEmail(
      email,
      "Welcome to Social App",
      generateTemplateHtml(name, link),
    );

    if (!emailSent) {
      // Optional: Delete the user if email fails
      await User.findByIdAndDelete(user._id);

      return res.status(500).json({
        success: false,
        message: "Failed to send activation email. Please try again.",
      });
    }

    res.status(201).json({
      message: "User created successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        gender: user.gender,
        isActivated: user.isActivated,
      },
      activationLink: link,
      activationToken: token,
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
      return res
        .status(404)
        .json({ message: "User not found, please sign up again" });
    }

    if (!user.isActivated) {
      return res.status(400).json({
        message:
          "Please activate your account first. Check your email for activation link.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const accessToken = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: "30m",
    });

    const  refreshToken = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_REFRESH_SECRET, {
      expiresIn: "7d",
    });

    res.status(200).json({ message: "Logged in successfully", token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const activate = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Activation token is required",
      });
    }

    // Verify the JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user by email from token
    const user = await User.findOne(decoded.email);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if already activated
    if (user.isActivated) {
      return res.status(200).json({
        success: true,
        message: "Account is already activated",
      });
    }

    // Activate the user - set isActivated to true
    user.isActivated = true;
    await user.save();

    console.log(
      "User activated:",
      user.email,
      "isActivated:",
      user.isActivated,
    );

    res.status(200).json({
      success: true,
      message: "Account activated successfully! You can now login.",
    });
  } catch (error) {
    console.error("Activation error:", error.message);

    if (error.name === "TokenExpiredError") {
      return res.status(400).json({
        success: false,
        message: "Activation link has expired",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(400).json({
        success: false,
        message: "Invalid activation token",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error during activation",
    });
  }
};

export const forgetPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User with this email does not exist",
      });
    }
    const otp = Randomstring.generate({ length: 6, charset: "numeric" });
    
    await OTP.create({ email: req.body.email, otp });
    const emailSent = await sendEmail(
      req.body.email,
      "Password Reset OTP - Social App",
      `Your OTP for password reset is: ${otp}`
    );
    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP email. Please try again.",
      });
    }

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error during password reset",
    });
  }
}

export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword, confirmNewPassword } = req.body;

    if (!email || !otp || !newPassword || !confirmNewPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User with this email does not exist",
      });
    }

    const otpRecord = await OTP.findOne({ email });
    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "OTP not found or expired",
      });
    }

    if (otpRecord.expiresAt < new Date()) {
      await OTP.deleteOne({ email });
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    if (otpRecord.otp !== otp) {
      // Increment attempts
      otpRecord.attempts += 1;
      await otpRecord.save();

      if (otpRecord.attempts >= 3) {
        await OTP.deleteOne({ email });
        return res.status(400).json({
          success: false,
          message: "Too many failed attempts. OTP invalidated.",
        });
      }

      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    user.password = hashedPassword;
    await user.save();

    await OTP.deleteOne({ email });

    res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });

  } catch (error) {
    console.error("Password reset error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error while resetting password",
    });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });
    } 

    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const user = await User.findById(payload.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const accessToken = createAccessToken({ id: user._id}, process.env.JWT_SECRET, {expiresIn: "30m"});

    res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
    });
    
  } catch (error) { 
    console.error("Refresh token error:", error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token"
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: "Refresh token expired"
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Server error while refreshing token"
    });
  }
};

export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ 
        success: false,
        message: "User already exists. Please login." 
      });
    }

    // Generate OTP
    const otp = Randomstring.generate({ 
      length: 6, 
      charset: "numeric" 
    });

    // Set expiration (10 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // Delete any existing OTP first
    await OTP.deleteOne({ email });
    
    // Create OTP with expiration
    await OTP.create({ 
      email, 
      otp, 
      expiresAt 
    });

    // Create email content
    const subject = "Your OTP Code - Social App";
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Your Verification Code</h2>
        <p>Use this OTP to verify your email:</p>
        <div style="background: #f4f4f4; padding: 15px; text-align: center; 
                    font-size: 24px; letter-spacing: 5px; margin: 20px 0; 
                    font-weight: bold; border-radius: 5px;">
          ${otp}
        </div>
        <p><strong>Expires in 10 minutes</strong></p>
        <p>If you didn't request this, please ignore this email.</p>
      </div>
    `;

    // Send email
    const emailSent = await sendEmail(email, subject, html);

    if (!emailSent) {
      // Clean up if email fails
      await OTP.deleteOne({ email });
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP email. Please try again."
      });
    }

    res.status(200).json({
      success: true,
      message: "OTP sent successfully to your email",
      expiresIn: "10 minutes"
    });
    
  } catch (error) {
    console.error("OTP generation error:", error.message);
    
    // Clean up on error
    await OTP.deleteOne({ email }).catch(() => {});
    
    res.status(500).json({
      success: false,
      message: "Server error while sending OTP"
    });
  }
}; // ← Make sure this closing brace exists