import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export default function authjwt(req, res, next) {
  try {
    const header = req.header("Authorization");

    if (header) {
      const token = header.replace("Bearer ", "");
      const decoded = jwt.verify(token, process.env.JWT_KEY);

      req.user = decoded; // <-- correctly attaches user
    }
  } catch (err) {
    req.user = null; // invalid/expired token
  }

  next();
}
