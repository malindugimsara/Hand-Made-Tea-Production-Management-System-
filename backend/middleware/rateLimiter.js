import rateLimit from 'express-rate-limit';

/**
 * 🔒 Login Rate Limiter (Brute Force Protection)
 * - Limits failed login attempts per IP address
 * - Window: 15 minutes
 * - Max attempts: 5 failed attempts
 * - Successful logins (HTTP < 400) are not counted against the limit
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit to 5 failed attempts per IP per window
  skipSuccessfulRequests: true, // Only count failed attempts (4xx, 5xx)
  standardHeaders: true, // Return standard `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    message: "Too many failed login attempts from this IP. Please try again after 15 minutes."
  },
  statusCode: 429
});

/**
 * 🌐 General API Rate Limiter
 * - Protects general endpoints from Denial-of-Service (DoS) and excessive spam
 * - Window: 15 minutes
 * - Max requests: 1000 requests per IP
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many requests from this IP. Please try again later."
  },
  statusCode: 429
});
