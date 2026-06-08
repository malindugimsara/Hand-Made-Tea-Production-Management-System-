import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

// 1. Check if the user is logged in (Valid Token)
export const verifyToken = (req, res, next) => {
  try {
    const header = req.header("Authorization");

    // If no token is provided at all, block them
    if (!header) {
      return res.status(401).json({ message: "Access Denied. No token provided." });
    }

    const token = header.replace("Bearer ", "");
    
    // Note: Make sure process.env.JWT_KEY matches your .env file exactly
    const decoded = jwt.verify(token, process.env.JWT_KEY);

    req.user = decoded; // Attaches { id, role } to the request
    next(); // Move to the next step
  } catch (err) {
    return res.status(403).json({ message: "Invalid or expired token." });
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