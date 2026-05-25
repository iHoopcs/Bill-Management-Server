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
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    const bills = await Bill.find({ user: req.params.userId });
    res.status(200).json(bills);
  } catch (error) {
    console.error("Error fetching bills:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * POST /api/bills/add
 * Creates a new bill for the authenticated user (user taken from req.user).
 */
const addBill = async (req, res) => {
  try {
    const { name, amount, dueDate, isRecurring, recurrence, isPaid } = req.body;

    // Validate amount is a number and is non-negative
    const parsedAmount = Number(amount);

    if (isNaN(parsedAmount))
      return res.status(400).json({ message: "Amount must be a number" });
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0)
      return res.status(400).json({ message: "Invalid amount" });

    if (!name || !amount || !dueDate)
      return res.status(400).json({ message: "Missing required fields" });

    const bill = await Bill.create({
      user: req.user._id,
      name,
      amount: parsedAmount,
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

/**
 * PUT /api/bills/update/:id
 * Updates an existing bill by ID.
 */
const updateBill = async (req, res) => {
  try {
    const bill = await Bill.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!bill) return res.status(404).json({ message: "Bill not found" });
    res.status(200).json(bill);
  } catch (error) {
    console.error("Error updating bill:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * DELETE /api/bills/delete/:id
 * Deletes a bill by ID.
 */
const deleteBill = async (req, res) => {
  try {
    const bill = await Bill.findByIdAndDelete(req.params.id);
    if (!bill) return res.status(404).json({ message: "Bill not found" });
    res.status(200).json({ message: "Bill deleted successfully" });
  } catch (error) {
    console.error("Error deleting bill:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getBill, addBill, getAllUserBills, updateBill, deleteBill };
