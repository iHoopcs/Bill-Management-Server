const User = require("./User");

const getAllUsers = async () => {
  return User.find().select("-password");
};

const getUserById = async (userId) => {
  const user = await User.findById(userId).select("-password");
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }
  return user;
};

module.exports = { getAllUsers, getUserById };
