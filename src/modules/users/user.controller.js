const userService = require("./user.service");

/**
 * GET /api/users
 * Returns all users (excluding passwords).
 */
const getAllUsers = async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : "Server error" });
  }
};

/**
 * GET /api/users/me
 * Returns the authenticated user's profile (excluding password).
 */
const getUser = async (req, res) => {
  try {
    const user = await userService.getUserById(req.user._id);
    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : "Server error" });
  }
};

module.exports = { getAllUsers, getUser };
