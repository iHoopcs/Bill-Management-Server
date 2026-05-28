const authService = require("./auth.service");

const registerUser = async (req, res) => {
  const { email, password, firstName, lastName } = req.body;

  if (!email || !password || !firstName || !lastName)
    return res.status(400).json({ message: "Missing required fields" });

  try {
    await authService.register({ email, password, firstName, lastName });
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : "Server error" });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Missing required fields" });

  try {
    const token = await authService.login({ email, password });
    res.status(201).json({ token });
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : "Server error" });
  }
};

module.exports = {
  registerUser,
  loginUser,
};
