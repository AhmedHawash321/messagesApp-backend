import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const authMiddleware = async (req, res, next) => {
    const {auth} = req.headers;
        if (!auth || auth.startsWith('Bearer ')) {
            return res.status(401).json({ message: "Unauthorized access" });
        }

        const token = auth.split(' ')[1];

        const { id } = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(id).select('-password'); // in case token expired

        if (!user) {
            return res.status(404).json({ message: "Token Expired" });
        }
        req.user = user;
        next();
}