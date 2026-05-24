/**
 * User Routes Integration Tests
 *
 * Tests the full HTTP request/response cycle for the user endpoints.
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
});

afterAll(async () => {
  await db.disconnect();
});

// ─── GET /api/users ───────────────────────────────────────────────────────────
describe("GET /api/users", () => {
  it("should return an empty array when no users exist", async () => {
    const res = await request(app).get("/api/users");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("should return all users without passwords", async () => {
    await User.create([
      {
        email: "user1@example.com",
        password: "password1",
        firstName: "User",
        lastName: "One",
      },
      {
        email: "user2@example.com",
        password: "password2",
        firstName: "User",
        lastName: "Two",
      },
    ]);

    const res = await request(app).get("/api/users");

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(2);
    res.body.forEach((user) => {
      expect(user.password).toBeUndefined();
    });
  });

  it("should return 500 if there is a server error", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(User, "find").mockImplementation(() => {
      throw new Error("Database error");
    });

    const res = await request(app).get("/api/users");

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ message: "Server error" });
    console.error.mockRestore();
    User.find.mockRestore();
  });
});

// ─── GET /api/users/:email ──────────────────────────────────────────────────
describe("GET /api/users/:email", () => {
  it("should return a user by email without password", async () => {
    await User.create({
      email: "user1@example.com",
      password: "password1",
      firstName: "User",
      lastName: "One",
    });

    const res = await request(app).get("/api/users/user1@example.com");

    expect(res.statusCode).toBe(200);
    expect(res.body.email).toBe("user1@example.com");
    expect(res.body.password).toBeUndefined();
  });

  it("should return 404 if user is not found", async () => {
    const res = await request(app).get("/api/users/nonexistent@example.com");
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ message: "User not found" });
  });

  it("should return 500 if there is a server error", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(User, "findOne").mockImplementation(() => {
      throw new Error("Database error");
    });

    const res = await request(app).get("/api/users/user1@example.com");

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ message: "Server error" });
    console.error.mockRestore();
    User.findOne.mockRestore();
  });
});

// ─── GET /api/users/:email/bills ─────────────────────────────────────────────
describe("GET /api/users/:email/bills", () => {
  it("should return 200 and bills associated with a user", async () => {
    // User.bills stores ObjectId refs — create Bill docs first
    const [bill1, bill2] = await Bill.create([
      {
        name: "Test Bill 1",
        amount: 100,
        dueDate: new Date(),
        isRecurring: false,
        recurrence: "monthly",
        isPaid: false,
      },
      {
        name: "Test Bill 2",
        amount: 200,
        dueDate: new Date(),
        isRecurring: true,
        recurrence: "weekly",
        isPaid: true,
      },
    ]);
    const user = await User.create({
      email: "user1@example.com",
      password: "password1",
      firstName: "User",
      lastName: "One",
      bills: [bill1._id, bill2._id],
    });
    const res = await request(app).get(`/api/users/${user.email}/bills`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toHaveProperty("name", "Test Bill 1");
    expect(res.body[0]).toHaveProperty("amount", 100);
    expect(res.body[0]).toHaveProperty("isRecurring", false);
    expect(res.body[0]).toHaveProperty("recurrence", "monthly");
    expect(res.body[0]).toHaveProperty("isPaid", false);
    expect(res.body[1]).toHaveProperty("name", "Test Bill 2");
    expect(res.body[1]).toHaveProperty("amount", 200);
    expect(res.body[1]).toHaveProperty("isRecurring", true);
    expect(res.body[1]).toHaveProperty("recurrence", "weekly");
    expect(res.body[1]).toHaveProperty("isPaid", true);
  });

  it("should return 204 and empty array if user has no bills", async () => {
    await User.create({
      email: "user2@example.com",
      password: "password2",
      firstName: "User",
      lastName: "Two",
      bills: [], // Explicitly set bills to an empty array
    });
    const res = await request(app).get("/api/users/user2@example.com/bills");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("should return 404 if user is not found", async () => {
    const res = await request(app).get(
      "/api/users/nonexistent@example.com/bills",
    );
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ message: "User not found" });
  });
});
