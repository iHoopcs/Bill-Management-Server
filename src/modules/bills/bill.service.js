const Bill = require("./Bill");
const User = require("../users/User");

const getBill = async (id) => {
  const bill = await Bill.findById(id);
  if (!bill) {
    const err = new Error("Bill not found");
    err.statusCode = 404;
    throw err;
  }
  return bill;
};

const getAllUserBills = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  const bills = await Bill.find({ user: userId }).lean();

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

  return bills;
};

const _validateAddBill = ({ name, amount, recurrence, recurringDayOfMonth, yearlyDueMonth, yearlyDueDay }) => {
  if (!name || !amount || !recurrence) {
    const err = new Error("Missing required fields");
    err.statusCode = 400;
    throw err;
  }

  if (!["monthly", "yearly"].includes(recurrence)) {
    const err = new Error("recurrence must be 'monthly' or 'yearly'");
    err.statusCode = 400;
    throw err;
  }

  const parsedAmount = Number(amount);
  if (isNaN(parsedAmount) || !Number.isFinite(parsedAmount) || parsedAmount < 0) {
    const err = new Error("Amount must be a number");
    err.statusCode = 400;
    throw err;
  }

  if (recurrence === "monthly") {
    const day = Number(recurringDayOfMonth);
    if (!recurringDayOfMonth || isNaN(day) || day < 1 || day > 31) {
      const err = new Error("recurringDayOfMonth (1–31) is required for monthly recurring bills");
      err.statusCode = 400;
      throw err;
    }
  }

  if (recurrence === "yearly") {
    const month = Number(yearlyDueMonth);
    const day = Number(yearlyDueDay);
    if (!yearlyDueMonth || isNaN(month) || month < 1 || month > 12) {
      const err = new Error("yearlyDueMonth (1–12) is required for yearly recurring bills");
      err.statusCode = 400;
      throw err;
    }
    if (!yearlyDueDay || isNaN(day) || day < 1 || day > 31) {
      const err = new Error("yearlyDueDay (1–31) is required for yearly recurring bills");
      err.statusCode = 400;
      throw err;
    }
  }

  return parsedAmount;
};

const addBill = async (userId, billData) => {
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
  } = billData;

  const parsedAmount = _validateAddBill({ name, amount, recurrence, recurringDayOfMonth, yearlyDueMonth, yearlyDueDay });

  return Bill.create({
    user: userId,
    name,
    amount: parsedAmount,
    recurrence,
    recurringDayOfMonth: recurrence === "monthly" ? Number(recurringDayOfMonth) : null,
    yearlyDueMonth: recurrence === "yearly" ? Number(yearlyDueMonth) : null,
    yearlyDueDay: recurrence === "yearly" ? Number(yearlyDueDay) : null,
    recurrenceEndDate: recurrenceEndDate ?? null,
    reminderDays: reminderDays ?? 3,
    isPaid: isPaid ?? false,
    notes: notes ?? null,
  });
};

const _validateUpdateBill = (body) => {
  const { recurrence, recurringDayOfMonth, yearlyDueMonth, yearlyDueDay } = body;
  const updated = { ...body };

  if (recurrence === "monthly") {
    const day = Number(recurringDayOfMonth);
    if (!recurringDayOfMonth || isNaN(day) || day < 1 || day > 31) {
      const err = new Error("recurringDayOfMonth (1–31) is required for monthly recurring bills");
      err.statusCode = 400;
      throw err;
    }
    updated.yearlyDueMonth = null;
    updated.yearlyDueDay = null;
  }

  if (recurrence === "yearly") {
    const month = Number(yearlyDueMonth);
    const day = Number(yearlyDueDay);
    if (!yearlyDueMonth || isNaN(month) || month < 1 || month > 12) {
      const err = new Error("yearlyDueMonth (1–12) is required for yearly recurring bills");
      err.statusCode = 400;
      throw err;
    }
    if (!yearlyDueDay || isNaN(day) || day < 1 || day > 31) {
      const err = new Error("yearlyDueDay (1–31) is required for yearly recurring bills");
      err.statusCode = 400;
      throw err;
    }
    updated.recurringDayOfMonth = null;
  }

  return updated;
};

const updateBill = async (id, body) => {
  const updatedBody = _validateUpdateBill(body);
  const bill = await Bill.findByIdAndUpdate(id, updatedBody, {
    new: true,
    runValidators: true,
  });
  if (!bill) {
    const err = new Error("Bill not found");
    err.statusCode = 404;
    throw err;
  }
  return bill;
};

const deleteBill = async (id) => {
  const bill = await Bill.findByIdAndDelete(id);
  if (!bill) {
    const err = new Error("Bill not found");
    err.statusCode = 404;
    throw err;
  }
};

module.exports = { getBill, getAllUserBills, addBill, updateBill, deleteBill };
