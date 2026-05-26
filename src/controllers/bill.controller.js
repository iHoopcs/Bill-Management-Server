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
 * Returns all bills for a specific user, sorted by dueDate ascending.
 */
const getAllUserBills = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const bills = await Bill.find({ user: req.params.userId }).lean();

    // Sort by the relevant due-day field for each recurrence type:
    //   monthly → recurringDayOfMonth (1–31)
    //   yearly  → yearlyDueMonth (1–12) as primary, yearlyDueDay (1–31) as secondary
    bills.sort((a, b) => {
      const keyA =
        a.recurrence === "monthly"
          ? a.recurringDayOfMonth
          : a.yearlyDueMonth * 100 + a.yearlyDueDay;
      const keyB =
        b.recurrence === "monthly"
          ? b.recurringDayOfMonth
          : b.yearlyDueMonth * 100 + b.yearlyDueDay;
      return keyA - keyB;
    });

    res.status(200).json(bills);
  } catch (error) {
    console.error("Error fetching bills:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /api/bills/month/:userId?year=YYYY&month=M
 * Returns all one-time bills due within a given month (1-indexed month).
 * Used to populate the monthly calendar view.
 */
const getBillsByMonth = async (req, res) => {
  try {
    const { year, month } = req.query;

    if (!year || !month)
      return res
        .status(400)
        .json({ message: "Query params 'year' and 'month' are required" });

    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999); // last ms of last day

    const bills = await Bill.find({
      user: req.params.userId,
      dueDate: { $gte: startOfMonth, $lte: endOfMonth },
    }).sort({ dueDate: 1 });

    res.status(200).json(bills);
  } catch (error) {
    console.error("Error fetching bills by month:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /api/bills/recurring/:userId?recurrence=monthly|yearly
 * Returns bills for a user filtered by recurrence type.
 * Used by the frontend to project due dates across the full year calendar.
 * Omit the query param to return all bills regardless of recurrence type.
 */
const getRecurringBills = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const filter = { user: req.params.userId };
    if (req.query.recurrence) filter.recurrence = req.query.recurrence;

    const bills = await Bill.find(filter).lean();

    bills.sort((a, b) => {
      const keyA =
        a.recurrence === "monthly"
          ? a.recurringDayOfMonth
          : a.yearlyDueMonth * 100 + a.yearlyDueDay;
      const keyB =
        b.recurrence === "monthly"
          ? b.recurringDayOfMonth
          : b.yearlyDueMonth * 100 + b.yearlyDueDay;
      return keyA - keyB;
    });

    res.status(200).json(bills);
  } catch (error) {
    console.error("Error fetching recurring bills:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * POST /api/bills/add
 * Creates a new bill for the authenticated user (user taken from req.user).
 */
const addBill = async (req, res) => {
  try {
    const {
      name,
      amount,
      recurrence,
      recurringDayOfMonth,
      yearlyDueMonth,
      yearlyDueDay,
      recurrenceEndDate,
      reminderDays,
      isPaid,
      notes,
    } = req.body;

    if (!name || !amount || !recurrence)
      return res.status(400).json({ message: "Missing required fields" });

    if (!["monthly", "yearly"].includes(recurrence))
      return res
        .status(400)
        .json({ message: "recurrence must be 'monthly' or 'yearly'" });

    // Validate amount
    const parsedAmount = Number(amount);
    if (
      isNaN(parsedAmount) ||
      !Number.isFinite(parsedAmount) ||
      parsedAmount < 0
    )
      return res.status(400).json({ message: "Amount must be a number" });

    // Monthly-specific validation
    if (recurrence === "monthly") {
      const day = Number(recurringDayOfMonth);
      if (!recurringDayOfMonth || isNaN(day) || day < 1 || day > 31)
        return res.status(400).json({
          message:
            "recurringDayOfMonth (1–31) is required for monthly recurring bills",
        });
    }

    // Yearly-specific validation
    if (recurrence === "yearly") {
      const month = Number(yearlyDueMonth);
      const day = Number(yearlyDueDay);
      if (!yearlyDueMonth || isNaN(month) || month < 1 || month > 12)
        return res.status(400).json({
          message:
            "yearlyDueMonth (1–12) is required for yearly recurring bills",
        });
      if (!yearlyDueDay || isNaN(day) || day < 1 || day > 31)
        return res.status(400).json({
          message: "yearlyDueDay (1–31) is required for yearly recurring bills",
        });
    }

    const bill = await Bill.create({
      user: req.user._id,
      name,
      amount: parsedAmount,
      recurrence,
      // Only persist the fields relevant to the chosen recurrence type
      recurringDayOfMonth:
        recurrence === "monthly" ? Number(recurringDayOfMonth) : null,
      yearlyDueMonth: recurrence === "yearly" ? Number(yearlyDueMonth) : null,
      yearlyDueDay: recurrence === "yearly" ? Number(yearlyDueDay) : null,
      recurrenceEndDate: recurrenceEndDate ?? null,
      reminderDays: reminderDays ?? 3,
      isPaid: isPaid ?? false,
      notes: notes ?? null,
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
 * Validates recurringDayOfMonth when switching to monthly recurrence.
 */
const updateBill = async (req, res) => {
  try {
    const { recurrence, recurringDayOfMonth, yearlyDueMonth, yearlyDueDay } =
      req.body;

    if (recurrence === "monthly") {
      const day = Number(recurringDayOfMonth);
      if (!recurringDayOfMonth || isNaN(day) || day < 1 || day > 31)
        return res.status(400).json({
          message:
            "recurringDayOfMonth (1–31) is required for monthly recurring bills",
        });
      // Clear yearly fields when switching to monthly
      req.body.yearlyDueMonth = null;
      req.body.yearlyDueDay = null;
    }

    if (recurrence === "yearly") {
      const month = Number(yearlyDueMonth);
      const day = Number(yearlyDueDay);
      if (!yearlyDueMonth || isNaN(month) || month < 1 || month > 12)
        return res.status(400).json({
          message:
            "yearlyDueMonth (1–12) is required for yearly recurring bills",
        });
      if (!yearlyDueDay || isNaN(day) || day < 1 || day > 31)
        return res.status(400).json({
          message: "yearlyDueDay (1–31) is required for yearly recurring bills",
        });
      // Clear monthly fields when switching to yearly
      req.body.recurringDayOfMonth = null;
    }

    const bill = await Bill.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
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

module.exports = {
  getBill,
  addBill,
  getAllUserBills,
  getBillsByMonth,
  getRecurringBills,
  updateBill,
  deleteBill,
};
