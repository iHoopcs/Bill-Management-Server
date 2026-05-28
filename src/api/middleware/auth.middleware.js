/**
 * Authentication middleware
 */
const jwt = require("jsonwebtoken");
const User = require("../../modules/users/User");
const rateLimit = require("express-rate-limit");

/**
 * Gatekeeper Middleware
 * Verifies the JWT token from the Authorization header.
 * Attaches the authenticated user to req.user for downstream controllers.
 */
const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Check that the Authorization header exists and is a Bearer token
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Verify the token signature and expiry against the secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch the user from the DB, excluding the password field
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({ message: "Unauthorized: User not found" });
    }

    // Attach user to request object for use in downstream controllers
    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ message: "Unauthorized: Token has expired" });
    }
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};

// Auth endpoint rate limiter - prevent brute force
// Skipped entirely in test environment to avoid 429s during automated tests
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit to 5 login attempts per 15 minutes
  skip: () => process.env.NODE_ENV === "test",
  message: {
    error: "Too many login attempts",
    message: "Too many login attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { protect, authLimiter };
