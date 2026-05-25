/**
 * User Controller Unit Tests
 *
 * Tests the getAllUsers and getUser controller functions directly,
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
} = require("../../src/controllers/user.controller");
const User = require("../../src/models/User");
const db = require("../helpers/db");

// ─── Test Helpers ─────────────────────────────────────────────────────────────

/**
 * Creates a mock Express req object.
 * Accepts both body and params to match real Express request shape.
 */
const mockReq = ({ body = {}, params = {}, user = {} } = {}) => ({
  body,
  params,
  user,
});

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
  it("should return 200 and the authenticated user's data without password", async () => {
    const user = await User.create({
      email: "user@example.com",
      password: "hashedpassword",
      firstName: "Jane",
      lastName: "Doe",
    });

    const req = mockReq({ user: { _id: user._id } });
    const res = mockRes();

    await getUser(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const [returnedUser] = res.json.mock.calls[0];
    expect(returnedUser.email).toBe("user@example.com");
    // Password must be stripped by .select("-password")
    expect(returnedUser.password).toBeUndefined();
  });

  it("should return 404 if the user no longer exists in the DB", async () => {
    const { Types } = require("mongoose");
    const req = mockReq({ user: { _id: new Types.ObjectId() } });
    const res = mockRes();

    await getUser(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
  });

  it("should return 500 on database error", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(User, "findById").mockImplementation(() => {
      throw new Error("Database error");
    });

    const { Types } = require("mongoose");
    const req = mockReq({ user: { _id: new Types.ObjectId() } });
    const res = mockRes();

    await getUser(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Server error" });
  });
});
