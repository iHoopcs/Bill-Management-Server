const Bill = require("../models/Bill");
const User = require("../models/User");

/**
 * GET /api/bills/individual/:id
 * Returns a single bill by ID.
 */
const getBill = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ message: "Bill not found" });
    res.status(200).json(bill);
  } catch (error) {
    console.error("Error fetching bill:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /api/bills/all/:userId
 * Returns all bills for a specific user.
 */
const getAllUserBills = async (req, res) => {
  try {
    const bills = await Bill.find({ user: req.params.userId });
    if (bills.length === 0) return res.status(204).json([]);
    res.status(200).json(bills);
  } catch (error) {
    console.error("Error fetching bills:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * POST /api/bills/add
 * Creates a new bill for a user (looked up by email in req.body).
 */
const addBill = async (req, res) => {
  try {
    const { email, name, amount, dueDate, isRecurring, recurrence, isPaid } =
      req.body;

    if (!email || !name || !amount || !dueDate) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const bill = await Bill.create({
      user: user._id,
      name,
      amount,
      dueDate,
      isRecurring,
      recurrence,
      isPaid,
    });

    res.status(201).json(bill);
  } catch (error) {
    console.error("Error creating bill:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getBill, addBill, getAllUserBills };
