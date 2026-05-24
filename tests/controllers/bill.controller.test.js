/**
 * Bill Controller Unit Tests
 *
 * Tests the getAllBills, getBill, and getBillByUser controller functions directly,
 * mocking the HTTP request/response objects with no real HTTP layer involved.
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
const { getBill, addBill, getAllUserBills } = require("../../src/controllers/bill.controller");
const User = require("../../src/models/User");
const Bill = require("../../src/models/Bill");
const db = require("../helpers/db");

// ─── Test Helpers ─────────────────────────────────────────────────────────────

/**
 * Creates a mock Express req object.
 * Accepts both body and params to match real Express request shape.
 */
const mockReq = ({ body = {}, params = {} } = {}) => ({ body, params });

/**
 * Creates a mock Express res object that captures status and JSON responses.
 */
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

beforeAll(async () => {
  await db.connect();
});

afterEach(async () => {
  // Clear DB rows and restore any spied-on functions after every test
  await db.clearDatabase();
  jest.restoreAllMocks();
});

afterAll(async () => {
  await db.disconnect();
});

// ─── getAllUserBills ──────────────────────────────────────────────────────────────

describe("getAllUserBills", () => {
  it("should return 200 and an empty array when user has no bills", async () => {
    const user = await User.create({
      email: "test@example.com",
      password: "password123",
      firstName: "Test",
      lastName: "User",
    });
    const req = mockReq({ params: { userId: user._id.toString() } });
    const res = mockRes();

    await getAllUserBills(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  it("should return 200 and all bills for a user", async () => {
    const user = await User.create({
      email: "test@example.com",
      password: "password123",
      firstName: "Test",
      lastName: "User",
    });

    await Bill.create([
      {
        user: user._id,
        name: "Test Bill 1",
        amount: 100,
        dueDate: new Date("2026-06-15"),
        isRecurring: false,
        recurrence: "monthly",
        isPaid: false,
      },
      {
        user: user._id,
        name: "Test Bill 2",
        amount: 200,
        dueDate: new Date("2026-06-15"),
        isRecurring: true,
        recurrence: "monthly",
        isPaid: false,
      },
    ]);

    const req = mockReq({ params: { userId: user._id.toString() } });
    const res = mockRes();

    await getAllUserBills(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Test Bill 1",
          amount: 100,
          dueDate: expect.any(Date),
          isRecurring: false,
          recurrence: "monthly",
          isPaid: false,
        }),
        expect.objectContaining({
          name: "Test Bill 2",
          amount: 200,
          dueDate: expect.any(Date),
          isRecurring: true,
          recurrence: "monthly",
          isPaid: false,
        }),
      ]),
    );
  });

  it("should return 404 if user is not found", async () => {
    const mongoose = require("mongoose");
    const req = mockReq({ params: { userId: new mongoose.Types.ObjectId().toString() } });
    const res = mockRes();

    await getAllUserBills(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
  });
});

// ─── getBill ────────────────────────────────────────────────────────────────

describe("getBill", () => {
  it("should return 200 and the bill when found by id", async () => {
    const user = await User.create({
      email: "test@example.com",
      password: "password123",
      firstName: "Test",
      lastName: "User",
    });
    const bill = await Bill.create({
      user: user._id,
      name: "Electric",
      amount: 75,
      dueDate: new Date("2026-06-01"),
      isRecurring: true,
      recurrence: "monthly",
      isPaid: false,
    });

    const req = mockReq({ params: { id: bill._id.toString() } });
    const res = mockRes();

    await getBill(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Electric",
        amount: 75,
        isRecurring: true,
        recurrence: "monthly",
        isPaid: false,
      }),
    );
  });

  it("should return 404 if the bill is not found", async () => {
    const mongoose = require("mongoose");
    const req = mockReq({
      params: { id: new mongoose.Types.ObjectId().toString() },
    });
    const res = mockRes();

    await getBill(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Bill not found" });
  });

  it("should return 500 on a server error", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(Bill, "findById").mockImplementation(() => {
      throw new Error("Database error");
    });

    const req = mockReq({ params: { id: "someid" } });
    const res = mockRes();

    await getBill(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Server error" });
  });
});

// ─── addBill ───────────────────────────────────────────────────────────────

describe("addBill", () => {
  it("should return 201 and the created bill on success", async () => {
    const user = await User.create({
      email: "test@example.com",
      password: "password123",
      firstName: "Test",
      lastName: "User",
    });

    const req = mockReq({
      body: {
        email: user.email,
        name: "Internet",
        amount: 50,
        dueDate: new Date("2026-06-10"),
        isRecurring: true,
        recurrence: "monthly",
        isPaid: false,
      },
    });
    const res = mockRes();

    await addBill(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Internet",
        amount: 50,
        isRecurring: true,
        recurrence: "monthly",
        isPaid: false,
      }),
    );
  });

  it("should return 400 if required fields are missing", async () => {
    const req = mockReq({
      body: { email: "test@example.com" }, // missing name, amount, dueDate
    });
    const res = mockRes();

    await addBill(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Missing required fields",
    });
  });

  it("should return 404 if the user is not found", async () => {
    const req = mockReq({
      body: {
        email: "ghost@example.com",
        name: "Rent",
        amount: 1200,
        dueDate: new Date("2026-06-01"),
      },
    });
    const res = mockRes();

    await addBill(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
  });

  it("should return 500 on a server error", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(Bill, "create").mockImplementation(() => {
      throw new Error("Database error");
    });

    const user = await User.create({
      email: "test@example.com",
      password: "password123",
      firstName: "Test",
      lastName: "User",
    });

    const req = mockReq({
      body: {
        email: user.email,
        name: "Gas",
        amount: 30,
        dueDate: new Date("2026-06-01"),
      },
    });
    const res = mockRes();

    await addBill(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Server error" });
  });
});
