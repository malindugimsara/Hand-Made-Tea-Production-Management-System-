import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

// 1. Check if the user is logged in (Valid Token from Cookie)
export const verifyToken = (req, res, next) => {
    // Header එකෙන් 'Authorization' කියන කොටස ගන්නවා
    const authHeader = req.headers.authorization;

    // ඒක නැත්නම්, හරි 'Bearer ' කියලා පටන් ගන්නේ නැත්නම් එළියට දානවා
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Access Denied. No token provided." });
    }

    // "Bearer <token>" කියන එකෙන් කෑලි දෙකට කඩලා, 2 වෙනි කෑල්ල (token එක) ගන්නවා
    const token = authHeader.split(" ")[1]; 

    try {
        // Token එක හරිද කියලා බලනවා
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        next(); // ඔක්කොම හරි නම් ඉස්සරහට යන්න දෙනවා
    } catch (error) {
        res.status(401).json({ message: "Invalid or Expired Token." });
    }
};

// 2. Check if the user has the correct Role
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    // If the token didn't contain a role, block them
    if (!req.user || !req.user.role) {
      return res.status(403).json({ message: "Access Denied. Role information missing." });
    }

    // If the user's role is NOT in the allowed list, block them
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Your role (${req.user.role}) is not allowed to perform this action.` 
      });
    }

    next(); // User is allowed, proceed to the controller!
  };
};