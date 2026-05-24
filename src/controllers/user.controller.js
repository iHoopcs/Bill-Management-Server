const User = require("../models/User");

/**
 * GET /api/users
 * Returns all users (excluding passwords).
 */
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /api/users/:email
 * Returns a single user by email (excluding password).
 */
const getUser = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email }).select(
      "-password",
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /api/users/:email/bills
 * Returns all bills associated with a user.
 */
const getUserBills = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email })
      .select("-password")
      .populate("bills");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user.bills);
  } catch (error) {
    console.error("Error fetching user bills:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getAllUsers, getUser, getUserBills };
