const User = require("../users/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const register = async ({ email, password, firstName, lastName }) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    const err = new Error("User already exists");
    err.statusCode = 409;
    throw err;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = new User({ email, password: hashedPassword, firstName, lastName });
  await newUser.save();
};

const login = async ({ email, password }) => {
  const user = await User.findOne({ email });
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    const err = new Error("Invalid credentials");
    err.statusCode = 401;
    throw err;
  }

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
  return token;
};

module.exports = { register, login };
