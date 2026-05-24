/**
 * Bill Routes Integration Tests
 *
 * Tests the full HTTP request/response cycle for the bill endpoints.
 * Uses Supertest to fire real HTTP requests against the Express app
 * and an in-memory MongoDB instance — never touches the real database.
 */
const {
  describe,
  it,
  expect,
  beforeAll,
  afterEach,
  afterAll,
} = require("@jest/globals");
const request = require("supertest");
const User = require("../../src/models/User");
const Bill = require("../../src/models/Bill");
const db = require("../helpers/db");

// Bypass JWT auth — authentication is covered by auth.routes.test.js
jest.mock("../../src/middleware/auth.middleware", () => ({
  protect: (req, res, next) => next(),
  authLimiter: (req, res, next) => next(),
}));

const app = require("../../src/index");

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

beforeAll(async () => {
  process.env.JWT_SECRET = "test_jwt_secret";
  await db.connect();
});

afterEach(async () => {
  await db.clearDatabase();
  jest.restoreAllMocks();
});

afterAll(async () => {
  await db.disconnect();
});

// ─── GET /api/bills/:id ───────────────────────────────────────────────────────

describe("GET /api/bills/:id", () => {
  it("should return 200 and the bill when found", async () => {
    const user = await User.create({
      email: "user1@example.com",
      password: "password1",
      firstName: "User",
      lastName: "One",
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

    const res = await request(app).get(`/api/bills/${bill._id}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("name", "Electric");
    expect(res.body).toHaveProperty("amount", 75);
    expect(res.body).toHaveProperty("isRecurring", true);
    expect(res.body).toHaveProperty("recurrence", "monthly");
    expect(res.body).toHaveProperty("isPaid", false);
  });

  it("should return 404 if the bill is not found", async () => {
    const mongoose = require("mongoose");
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app).get(`/api/bills/${fakeId}`);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ message: "Bill not found" });
  });

  it("should return 500 on a server error", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(Bill, "findById").mockImplementation(() => {
      throw new Error("Database error");
    });

    const res = await request(app).get("/api/bills/someid");

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ message: "Server error" });
  });
});

// ─── POST /api/bills ──────────────────────────────────────────────────────────

describe("POST /api/bills", () => {
  it("should return 201 and the created bill on success", async () => {
    const user = await User.create({
      email: "user1@example.com",
      password: "password1",
      firstName: "User",
      lastName: "One",
    });

    const res = await request(app)
      .post("/api/bills")
      .send({
        email: user.email,
        name: "Internet",
        amount: 50,
        dueDate: new Date("2026-06-10"),
        isRecurring: true,
        recurrence: "monthly",
        isPaid: false,
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("name", "Internet");
    expect(res.body).toHaveProperty("amount", 50);
    expect(res.body).toHaveProperty("isRecurring", true);
    expect(res.body).toHaveProperty("recurrence", "monthly");
    expect(res.body).toHaveProperty("isPaid", false);

    // Confirm it was persisted
    const saved = await Bill.findById(res.body._id);
    expect(saved).not.toBeNull();
    expect(saved.name).toBe("Internet");
  });

  it("should return 400 if required fields are missing", async () => {
    const res = await request(app).post("/api/bills").send({
      email: "user1@example.com", // missing name, amount, dueDate
    });

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ message: "Missing required fields" });
  });

  it("should return 404 if the user is not found", async () => {
    const res = await request(app)
      .post("/api/bills")
      .send({
        email: "ghost@example.com",
        name: "Rent",
        amount: 1200,
        dueDate: new Date("2026-06-01"),
      });

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ message: "User not found" });
  });

  it("should return 500 on a server error", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(Bill, "create").mockImplementation(() => {
      throw new Error("Database error");
    });

    const user = await User.create({
      email: "user1@example.com",
      password: "password1",
      firstName: "User",
      lastName: "One",
    });

    const res = await request(app)
      .post("/api/bills")
      .send({
        email: user.email,
        name: "Gas",
        amount: 30,
        dueDate: new Date("2026-06-01"),
      });

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ message: "Server error" });
  });
});
