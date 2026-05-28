/**
 * Auth Controller Unit Tests
 *
 * Tests the registerUser and loginUser controller functions directly,
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
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const {
  registerUser,
  loginUser,
} = require("../../src/modules/auth/auth.controller");
const User = require("../../src/modules/users/User");
const db = require("../helpers/db");

// ─── Test Helpers ─────────────────────────────────────────────────────────────

/**
 * Creates a mock Express req object.
 */
const mockReq = (body = {}) => ({ body });

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
  process.env.JWT_SECRET = "test_jwt_secret";
  await db.connect();
});

afterEach(async () => {
  await db.clearDatabase();
});

afterAll(async () => {
  await db.disconnect();
});

// ─── registerUser ─────────────────────────────────────────────────────────────

describe("registerUser controller", () => {
  it("should return 400 when required fields are missing", async () => {
    const req = mockReq({ email: "test@example.com" }); // missing password, firstName, lastName
    const res = mockRes();

    await registerUser(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Missing required fields",
    });
  });

  it("should return 409 when a user with the same email already exists", async () => {
    // Seed existing user
    await User.create({
      email: "existing@example.com",
      password: await bcrypt.hash("password123", 10),
      firstName: "Test",
      lastName: "User",
    });

    const req = mockReq({
      email: "existing@example.com",
      password: "password123",
      firstName: "Test",
      lastName: "User",
    });
    const res = mockRes();

    await registerUser(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ message: "User already exists" });
  });

  it("should return 201 and save a hashed password on successful registration", async () => {
    const req = mockReq({
      email: "newuser@example.com",
      password: "securePassword1!",
      firstName: "John",
      lastName: "Doe",
    });
    const res = mockRes();

    await registerUser(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: "User registered successfully",
    });

    // Verify the password was hashed and not stored as plain text
    const savedUser = await User.findOne({ email: "newuser@example.com" });
    expect(savedUser).not.toBeNull();
    const isHashed = await bcrypt.compare(
      "securePassword1!",
      savedUser.password,
    );
    expect(isHashed).toBe(true);
  });
});

// ─── loginUser ────────────────────────────────────────────────────────────────

describe("loginUser controller", () => {
  it("should return 400 when required fields are missing", async () => {
    const req = mockReq({ email: "test@example.com" }); // missing password
    const res = mockRes();

    await loginUser(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Missing required fields",
    });
  });

  it("should return 404 when user is not found", async () => {
    const req = mockReq({ email: "ghost@example.com", password: "password" });
    const res = mockRes();

    await loginUser(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
  });

  it("should return 401 when password does not match", async () => {
    await User.create({
      email: "user@example.com",
      password: await bcrypt.hash("correctPassword", 10),
      firstName: "Jane",
      lastName: "Doe",
    });

    const req = mockReq({
      email: "user@example.com",
      password: "wrongPassword",
    });
    const res = mockRes();

    await loginUser(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid credentials" });
  });

  it("should return 201 with a valid JWT token on successful login", async () => {
    await User.create({
      email: "user@example.com",
      password: await bcrypt.hash("correctPassword", 10),
      firstName: "Jane",
      lastName: "Doe",
    });

    const req = mockReq({
      email: "user@example.com",
      password: "correctPassword",
    });
    const res = mockRes();

    await loginUser(req, res);

    expect(res.status).toHaveBeenCalledWith(201);

    // Verify the returned token is a valid JWT signed with JWT_SECRET
    const { token } = res.json.mock.calls[0][0];
    expect(token).toBeDefined();
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    expect(decoded).toHaveProperty("userId");
  });
});
