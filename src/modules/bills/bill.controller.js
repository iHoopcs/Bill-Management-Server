const billService = require("./bill.service");

/**
 * GET /api/bills/individual/:id
 * Returns a single bill by ID.
 */
const getBill = async (req, res) => {
  try {
    const bill = await billService.getBill(req.params.id);
    res.status(200).json(bill);
  } catch (error) {
    console.error("Error fetching bill:", error);
    res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : "Server error" });
  }
};

/**
 * GET /api/bills/all/:userId
 * Returns all bills for a specific user, sorted by dueDate ascending.
 */
const getAllUserBills = async (req, res) => {
  try {
    const bills = await billService.getAllUserBills(req.params.userId);
    res.status(200).json(bills);
  } catch (error) {
    console.error("Error fetching bills:", error);
    res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : "Server error" });
  }
};

/**
 * POST /api/bills/add
 * Creates a new bill for the authenticated user (user taken from req.user).
 */
const addBill = async (req, res) => {
  try {
    const bill = await billService.addBill(req.user._id, req.body);
    res.status(201).json(bill);
  } catch (error) {
    console.error("Error creating bill:", error);
    res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : "Server error" });
  }
};

/**
 * PUT /api/bills/update/:id
 * Updates an existing bill by ID.
 */
const updateBill = async (req, res) => {
  try {
    const bill = await billService.updateBill(req.params.id, req.body);
    res.status(200).json(bill);
  } catch (error) {
    console.error("Error updating bill:", error);
    res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : "Server error" });
  }
};

/**
 * DELETE /api/bills/delete/:id
 * Deletes a bill by ID.
 */
const deleteBill = async (req, res) => {
  try {
    await billService.deleteBill(req.params.id);
    res.status(200).json({ message: "Bill deleted successfully" });
  } catch (error) {
    console.error("Error deleting bill:", error);
    res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : "Server error" });
  }
};

module.exports = {
  getBill,
  addBill,
  getAllUserBills,
  updateBill,
  deleteBill,
};
