/**
 * Bill Service Unit Tests
 *
 * Tests all bill service functions in isolation.
 * Uses an in-memory MongoDB instance — never touches the real database.
 */
const {
  describe,
  it,
  expect,
  beforeAll,
  afterEach,
  afterAll,
} = require("@jest/globals");
const {
  getBill,
  getAllUserBills,
  addBill,
  updateBill,
  deleteBill,
} = require("../../src/modules/bills/bill.service");
const User = require("../../src/modules/users/User");
const Bill = require("../../src/modules/bills/Bill");
const db = require("../helpers/db");

// ─── Helpers ──────────────────────────────────────────────────────────────────

const createUser = () =>
  User.create({ email: "test@example.com", password: "hash", firstName: "Test", lastName: "User" });

const monthlyBillData = (overrides = {}) => ({
  name: "Electric",
  amount: 75,
  recurrence: "monthly",
  recurringDayOfMonth: 15,
  ...overrides,
});

const yearlyBillData = (overrides = {}) => ({
  name: "Insurance",
  amount: 600,
  recurrence: "yearly",
  yearlyDueMonth: 3,
  yearlyDueDay: 15,
  ...overrides,
});

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

beforeAll(async () => {
  await db.connect();
});

afterEach(async () => {
  await db.clearDatabase();
  jest.restoreAllMocks();
});

afterAll(async () => {
  await db.disconnect();
});

// ─── getBill ──────────────────────────────────────────────────────────────────

describe("getBill", () => {
  it("should return the bill when found by id", async () => {
    const user = await createUser();
    const bill = await Bill.create({ user: user._id, ...monthlyBillData() });

    const result = await getBill(bill._id.toString());

    expect(result.name).toBe("Electric");
    expect(result.amount).toBe(75);
  });

  it("should throw 404 if the bill does not exist", async () => {
    const { Types } = require("mongoose");
    const err = await getBill(new Types.ObjectId().toString()).catch((e) => e);

    expect(err).toBeInstanceOf(Error);
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("Bill not found");
  });
});

// ─── getAllUserBills ──────────────────────────────────────────────────────────

describe("getAllUserBills", () => {
  it("should return an empty array when the user has no bills", async () => {
    const user = await createUser();
    const result = await getAllUserBills(user._id.toString());
    expect(result).toEqual([]);
  });

  it("should return all bills belonging to the user", async () => {
    const user = await createUser();
    await Bill.create([
      { user: user._id, ...monthlyBillData({ name: "Rent", recurringDayOfMonth: 1 }) },
      { user: user._id, ...monthlyBillData({ name: "Internet", recurringDayOfMonth: 5 }) },
    ]);

    const result = await getAllUserBills(user._id.toString());

    expect(result).toHaveLength(2);
    expect(result.map((b) => b.name)).toEqual(expect.arrayContaining(["Rent", "Internet"]));
  });

  it("should sort monthly bills by recurringDayOfMonth ascending", async () => {
    const user = await createUser();
    await Bill.create([
      { user: user._id, ...monthlyBillData({ name: "Late", recurringDayOfMonth: 28 }) },
      { user: user._id, ...monthlyBillData({ name: "Early", recurringDayOfMonth: 1 }) },
      { user: user._id, ...monthlyBillData({ name: "Mid", recurringDayOfMonth: 15 }) },
    ]);

    const result = await getAllUserBills(user._id.toString());
    const days = result.map((b) => b.recurringDayOfMonth);

    expect(days).toEqual([1, 15, 28]);
  });

  it("should sort yearly bills by yearlyDueMonth then yearlyDueDay ascending", async () => {
    const user = await createUser();
    await Bill.create([
      { user: user._id, ...yearlyBillData({ name: "C", yearlyDueMonth: 12, yearlyDueDay: 1 }) },
      { user: user._id, ...yearlyBillData({ name: "A", yearlyDueMonth: 1, yearlyDueDay: 5 }) },
      { user: user._id, ...yearlyBillData({ name: "B", yearlyDueMonth: 6, yearlyDueDay: 10 }) },
    ]);

    const result = await getAllUserBills(user._id.toString());
    expect(result.map((b) => b.name)).toEqual(["A", "B", "C"]);
  });

  it("should throw 404 if the user does not exist", async () => {
    const { Types } = require("mongoose");
    const err = await getAllUserBills(new Types.ObjectId().toString()).catch((e) => e);

    expect(err).toBeInstanceOf(Error);
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("User not found");
  });
});

// ─── addBill ──────────────────────────────────────────────────────────────────

describe("addBill", () => {
  it("should create and return a monthly bill successfully", async () => {
    const user = await createUser();
    const bill = await addBill(user._id, monthlyBillData());

    expect(bill.name).toBe("Electric");
    expect(bill.amount).toBe(75);
    expect(bill.recurrence).toBe("monthly");
    expect(bill.recurringDayOfMonth).toBe(15);
    expect(bill.yearlyDueMonth).toBeNull();
    expect(bill.yearlyDueDay).toBeNull();
  });

  it("should create and return a yearly bill successfully", async () => {
    const user = await createUser();
    const bill = await addBill(user._id, yearlyBillData());

    expect(bill.recurrence).toBe("yearly");
    expect(bill.yearlyDueMonth).toBe(3);
    expect(bill.yearlyDueDay).toBe(15);
    expect(bill.recurringDayOfMonth).toBeNull();
  });

  it("should throw 400 when required fields are missing", async () => {
    const user = await createUser();
    const err = await addBill(user._id, { amount: 50 }).catch((e) => e);

    expect(err.statusCode).toBe(400);
    expect(err.message).toBe("Missing required fields");
  });

  it("should throw 400 for an invalid recurrence type", async () => {
    const user = await createUser();
    const err = await addBill(user._id, { name: "Bill", amount: 10, recurrence: "weekly" }).catch((e) => e);

    expect(err.statusCode).toBe(400);
    expect(err.message).toMatch(/monthly.*yearly/i);
  });

  it("should throw 400 for a non-numeric amount", async () => {
    const user = await createUser();
    const err = await addBill(user._id, { name: "Bill", amount: "abc", recurrence: "monthly" }).catch((e) => e);

    expect(err.statusCode).toBe(400);
    expect(err.message).toBe("Amount must be a number");
  });

  it("should throw 400 for a negative amount", async () => {
    const user = await createUser();
    const err = await addBill(user._id, { name: "Bill", amount: -5, recurrence: "monthly", recurringDayOfMonth: 1 }).catch((e) => e);

    expect(err.statusCode).toBe(400);
    expect(err.message).toBe("Amount must be a number");
  });

  it("should throw 400 when recurringDayOfMonth is missing for monthly bills", async () => {
    const user = await createUser();
    const err = await addBill(user._id, { name: "Bill", amount: 50, recurrence: "monthly" }).catch((e) => e);

    expect(err.statusCode).toBe(400);
    expect(err.message).toMatch(/recurringDayOfMonth/i);
  });

  it("should throw 400 when recurringDayOfMonth is out of range for monthly bills", async () => {
    const user = await createUser();
    const err = await addBill(user._id, { name: "Bill", amount: 50, recurrence: "monthly", recurringDayOfMonth: 32 }).catch((e) => e);

    expect(err.statusCode).toBe(400);
  });

  it("should throw 400 when yearlyDueMonth is missing for yearly bills", async () => {
    const user = await createUser();
    const err = await addBill(user._id, { name: "Bill", amount: 50, recurrence: "yearly", yearlyDueDay: 5 }).catch((e) => e);

    expect(err.statusCode).toBe(400);
    expect(err.message).toMatch(/yearlyDueMonth/i);
  });

  it("should throw 400 when yearlyDueDay is missing for yearly bills", async () => {
    const user = await createUser();
    const err = await addBill(user._id, { name: "Bill", amount: 50, recurrence: "yearly", yearlyDueMonth: 5 }).catch((e) => e);

    expect(err.statusCode).toBe(400);
    expect(err.message).toMatch(/yearlyDueDay/i);
  });

  it("should apply default values for optional fields", async () => {
    const user = await createUser();
    const bill = await addBill(user._id, monthlyBillData());

    expect(bill.reminderDays).toBe(3);
    expect(bill.isPaid).toBe(false);
    expect(bill.notes).toBeNull();
    expect(bill.recurrenceEndDate).toBeNull();
  });
});

// ─── updateBill ───────────────────────────────────────────────────────────────

describe("updateBill", () => {
  it("should update and return the modified bill", async () => {
    const user = await createUser();
    const bill = await Bill.create({ user: user._id, ...monthlyBillData() });

    const updated = await updateBill(bill._id.toString(), { name: "Updated", amount: 200, isPaid: true });

    expect(updated.name).toBe("Updated");
    expect(updated.amount).toBe(200);
    expect(updated.isPaid).toBe(true);
  });

  it("should persist changes to the database", async () => {
    const user = await createUser();
    const bill = await Bill.create({ user: user._id, ...monthlyBillData() });

    await updateBill(bill._id.toString(), { name: "Persisted", amount: 999 });

    const inDb = await Bill.findById(bill._id);
    expect(inDb.name).toBe("Persisted");
    expect(inDb.amount).toBe(999);
  });

  it("should clear yearly fields when switching to monthly recurrence", async () => {
    const user = await createUser();
    const bill = await Bill.create({ user: user._id, ...yearlyBillData() });

    const updated = await updateBill(bill._id.toString(), {
      recurrence: "monthly",
      recurringDayOfMonth: 10,
    });

    expect(updated.recurringDayOfMonth).toBe(10);
    expect(updated.yearlyDueMonth).toBeNull();
    expect(updated.yearlyDueDay).toBeNull();
  });

  it("should clear monthly fields when switching to yearly recurrence", async () => {
    const user = await createUser();
    const bill = await Bill.create({ user: user._id, ...monthlyBillData() });

    const updated = await updateBill(bill._id.toString(), {
      recurrence: "yearly",
      yearlyDueMonth: 6,
      yearlyDueDay: 20,
    });

    expect(updated.yearlyDueMonth).toBe(6);
    expect(updated.yearlyDueDay).toBe(20);
    expect(updated.recurringDayOfMonth).toBeNull();
  });

  it("should throw 400 when switching to monthly without recurringDayOfMonth", async () => {
    const user = await createUser();
    const bill = await Bill.create({ user: user._id, ...yearlyBillData() });

    const err = await updateBill(bill._id.toString(), { recurrence: "monthly" }).catch((e) => e);

    expect(err.statusCode).toBe(400);
    expect(err.message).toMatch(/recurringDayOfMonth/i);
  });

  it("should throw 400 when switching to yearly without yearlyDueMonth", async () => {
    const user = await createUser();
    const bill = await Bill.create({ user: user._id, ...monthlyBillData() });

    const err = await updateBill(bill._id.toString(), { recurrence: "yearly", yearlyDueDay: 10 }).catch((e) => e);

    expect(err.statusCode).toBe(400);
    expect(err.message).toMatch(/yearlyDueMonth/i);
  });

  it("should throw 400 when switching to yearly without yearlyDueDay", async () => {
    const user = await createUser();
    const bill = await Bill.create({ user: user._id, ...monthlyBillData() });

    const err = await updateBill(bill._id.toString(), { recurrence: "yearly", yearlyDueMonth: 5 }).catch((e) => e);

    expect(err.statusCode).toBe(400);
    expect(err.message).toMatch(/yearlyDueDay/i);
  });

  it("should throw 404 if the bill does not exist", async () => {
    const { Types } = require("mongoose");
    const err = await updateBill(new Types.ObjectId().toString(), { name: "X" }).catch((e) => e);

    expect(err).toBeInstanceOf(Error);
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("Bill not found");
  });
});

// ─── deleteBill ───────────────────────────────────────────────────────────────

describe("deleteBill", () => {
  it("should remove the bill from the database", async () => {
    const user = await createUser();
    const bill = await Bill.create({ user: user._id, ...monthlyBillData() });

    await deleteBill(bill._id.toString());

    const inDb = await Bill.findById(bill._id);
    expect(inDb).toBeNull();
  });

  it("should resolve without a return value on success", async () => {
    const user = await createUser();
    const bill = await Bill.create({ user: user._id, ...monthlyBillData() });

    const result = await deleteBill(bill._id.toString());
    expect(result).toBeUndefined();
  });

  it("should throw 404 if the bill does not exist", async () => {
    const { Types } = require("mongoose");
    const err = await deleteBill(new Types.ObjectId().toString()).catch((e) => e);

    expect(err).toBeInstanceOf(Error);
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("Bill not found");
  });
});
