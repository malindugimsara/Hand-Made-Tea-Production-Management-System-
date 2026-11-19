import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/User.js";
dotenv.config();

// 1. Check if the user is logged in (Valid Token & Non-Revoked Session)
export const verifyToken = async (req, res, next) => {
  // If req.user is already verified by previous middleware in chain, pass through
  if (req.user && req.user.id && req.user.role) {
    return next();
  }

  try {
    const header = req.header("Authorization");
    const queryToken = req.query?.token;

    // If no token is provided at all, block them
    if (!header && !queryToken) {
      return res.status(401).json({ message: "Access Denied. No token provided." });
    }

    const token = header ? header.replace("Bearer ", "") : queryToken;
    
    // Note: Make sure process.env.JWT_KEY matches your .env file exactly
    const decoded = jwt.verify(token, process.env.JWT_KEY);

    // Verify that the user still exists in database
    const user = await User.findById(decoded.id).select('username role allowedPaths allowedPages tokenVersion');
    if (!user) {
      return res.status(401).json({ message: "User account no longer exists. Access denied." });
    }

    // Invalidate token if tokenVersion does not match (due to logout, role update, password change)
    const currentVersion = user.tokenVersion || 0;
    const tokenVersion = decoded.tokenVersion || 0;
    if (currentVersion !== tokenVersion) {
      return res.status(401).json({ message: "Session has been invalidated or expired. Please log in again." });
    }

    // Attach latest, real-time user info from database to req.user
    req.user = {
      id: user._id.toString(),
      role: user.role,
      name: user.username || decoded.name,
      allowedPaths: user.allowedPaths || [],
      allowedPages: user.allowedPages || []
    };

    next(); // Move to the next step
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};

// 2. Check if the user has the correct Role
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    // If the token didn't contain a role, block them
    if (!req.user || !req.user.role) {
      return res.status(403).json({ message: "Access Denied. Role information missing." });
    }

    // If role is Developer, grant full access to any route
    if (req.user.role === 'Developer') {
      return next();
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

// 3. Check if the user has permission to access the specific section (BFLA Protection)
export const authorizeSection = (...allowed) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.role) {
        return res.status(403).json({ message: "Access Denied. Role information missing." });
      }

      // Developer and Admin roles have universal access across all sections
      if (req.user.role === 'Admin' || req.user.role === 'Developer') {
        return next();
      }

      let allowedPaths = req.user.allowedPaths;

      // Fallback: If allowedPaths is missing or not an array, fetch from DB
      if (!Array.isArray(allowedPaths) || allowedPaths.length === 0) {
        const userId = req.user.id || req.user._id;
        if (userId) {
          const dbUser = await User.findById(userId).select('allowedPaths role');
          if (dbUser) {
            allowedPaths = dbUser.allowedPaths || [];
            req.user.allowedPaths = allowedPaths;
          }
        }
      }

      const userPaths = (allowedPaths || []).map(p => String(p).toLowerCase().trim());

      // Support passing { read: [...], write: [...] } or multiple section strings
      let requiredSections = [];
      if (allowed.length === 1 && typeof allowed[0] === 'object' && !Array.isArray(allowed[0])) {
        const isRead = req.method === 'GET' || req.method === 'HEAD';
        requiredSections = isRead ? (allowed[0].read || []) : (allowed[0].write || []);
      } else {
        requiredSections = allowed.flat();
      }

      const hasAccess = requiredSections.some(sec => 
        userPaths.includes(String(sec).toLowerCase().trim())
      );

      if (!hasAccess) {
        return res.status(403).json({ 
          message: `Access Denied. You do not have permission to access the [${requiredSections.join(', ')}] section.` 
        });
      }

      next();
    } catch (error) {
      console.error("Section Authorization Error:", error);
      return res.status(500).json({ message: "Internal server error during section authorization." });
    }
  };
};