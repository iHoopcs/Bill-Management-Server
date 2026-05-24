/**
 * User Controller Unit Tests
 *
 * Tests the getAllUsers, getUser, and getUserBills controller functions directly,
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
const {
  getAllUsers,
  getUser,
  getUserBills,
} = require("../../src/controllers/user.controller");
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

// ─── getAllUsers ──────────────────────────────────────────────────────────────

describe("getAllUsers controller", () => {
  it("should return 200 and all users without passwords", async () => {
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

    const req = mockReq();
    const res = mockRes();

    await getAllUsers(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const [returnedUsers] = res.json.mock.calls[0];
    expect(returnedUsers).toHaveLength(2);
    // Password field must be stripped by .select("-password")
    returnedUsers.forEach((u) => expect(u.password).toBeUndefined());
  });

  it("should return 200 with an empty array if no users exist", async () => {
    const req = mockReq();
    const res = mockRes();

    await getAllUsers(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  it("should return 500 on database error", async () => {
    // Silence the expected console.error so it doesn't pollute test output
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(User, "find").mockImplementation(() => {
      throw new Error("Database error");
    });

    const req = mockReq();
    const res = mockRes();

    await getAllUsers(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Server error" });
  });
});

// ─── getUser ──────────────────────────────────────────────────────────────────

describe("getUser controller", () => {
  it("should return 200 and the user data without password", async () => {
    await User.create({
      email: "user@example.com",
      password: "hashedpassword",
      firstName: "Jane",
      lastName: "Doe",
    });

    // Controller looks up by req.params.email
    const req = mockReq({ params: { email: "user@example.com" } });
    const res = mockRes();

    await getUser(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const [returnedUser] = res.json.mock.calls[0];
    expect(returnedUser.email).toBe("user@example.com");
    // Password must be stripped by .select("-password")
    expect(returnedUser.password).toBeUndefined();
  });

  it("should return 404 if user is not found", async () => {
    const req = mockReq({ params: { email: "ghost@example.com" } });
    const res = mockRes();

    await getUser(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
  });

  it("should return 500 on database error", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(User, "findOne").mockImplementation(() => {
      throw new Error("Database error");
    });

    const req = mockReq({ params: { email: "user@example.com" } });
    const res = mockRes();

    await getUser(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Server error" });
  });
});

// ─── getUserBills ─────────────────────────────────────────────────────────────

describe("getUserBills controller", () => {
  it("should return 200 and the user's populated bills", async () => {
    // Create a bill first, then associate it with the user
    const bill = await Bill.create({
      name: "Internet",
      amount: 65,
      dueDate: new Date("2026-06-15"),
      isRecurring: true,
      recurrence: "monthly",
    });
    const user = await User.create({
      email: "user@example.com",
      password: "hashedpassword",
      firstName: "Jane",
      lastName: "Doe",
      bills: [bill._id],
    });

    const req = mockReq({ params: { email: user.email } });
    const res = mockRes();

    await getUserBills(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const [returnedBills] = res.json.mock.calls[0];
    expect(returnedBills).toHaveLength(1);
    expect(returnedBills[0].name).toBe("Internet");
  });

  it("should return 200 with an empty array if user has no bills", async () => {
    await User.create({
      email: "user@example.com",
      password: "hashedpassword",
      firstName: "Jane",
      lastName: "Doe",
      bills: [],
    });

    const req = mockReq({ params: { email: "user@example.com" } });
    const res = mockRes();

    await getUserBills(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  it("should return 404 if user is not found", async () => {
    const req = mockReq({ params: { email: "ghost@example.com" } });
    const res = mockRes();

    await getUserBills(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
  });

  it("should return 500 on database error", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(User, "findOne").mockImplementation(() => {
      throw new Error("Database error");
    });

    const req = mockReq({ params: { email: "user@example.com" } });
    const res = mockRes();

    await getUserBills(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Server error" });
  });
});
