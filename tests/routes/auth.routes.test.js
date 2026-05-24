/**
 * Auth Routes Integration Tests
 *
 * Tests the full HTTP request/response cycle for the auth endpoints.
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
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = require("../../src/index");
const User = require("../../src/models/User");
const db = require("../helpers/db");

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

// ─── POST /api/auth/register ──────────────────────────────────────────────────

describe("POST /api/auth/register", () => {
  it("should return 400 when required fields are missing", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "test@example.com" }); // missing password, firstName, lastName

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message", "Missing required fields");
  });

  it("should return 409 when user already exists", async () => {
    await User.create({
      email: "existing@example.com",
      password: await bcrypt.hash("password123", 10),
      firstName: "Test",
      lastName: "User",
    });

    const res = await request(app).post("/api/auth/register").send({
      email: "existing@example.com",
      password: "password123",
      firstName: "Test",
      lastName: "User",
    });

    expect(res.statusCode).toBe(409);
    expect(res.body).toHaveProperty("message", "User already exists");
  });

  it("should return 201 and register a new user successfully", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "newuser@example.com",
      password: "securePassword1!",
      firstName: "John",
      lastName: "Doe",
    });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("message", "User registered successfully");

    // Confirm the user was persisted to the database
    const savedUser = await User.findOne({ email: "newuser@example.com" });
    expect(savedUser).not.toBeNull();

    // Confirm the password was stored as a hash, not plain text
    const isHashed = await bcrypt.compare(
      "securePassword1!",
      savedUser.password,
    );
    expect(isHashed).toBe(true);
  });
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

describe("POST /api/auth/login", () => {
  it("should return 400 when required fields are missing", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@example.com" }); // missing password

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message", "Missing required fields");
  });

  it("should return 404 when user is not found", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "ghost@example.com", password: "password" });

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("message", "User not found");
  });

  it("should return 401 when password is incorrect", async () => {
    await User.create({
      email: "user@example.com",
      password: await bcrypt.hash("correctPassword", 10),
      firstName: "Jane",
      lastName: "Doe",
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "user@example.com", password: "wrongPassword" });

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("message", "Invalid credentials");
  });

  it("should return 201 with a valid JWT token on successful login", async () => {
    await User.create({
      email: "user@example.com",
      password: await bcrypt.hash("correctPassword", 10),
      firstName: "Jane",
      lastName: "Doe",
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "user@example.com", password: "correctPassword" });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("token");

    // Verify the returned token is a legitimate, decodable JWT
    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded).toHaveProperty("userId");
  });

  it("should not expose the user password in the login response", async () => {
    await User.create({
      email: "user@example.com",
      password: await bcrypt.hash("correctPassword", 10),
      firstName: "Jane",
      lastName: "Doe",
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "user@example.com", password: "correctPassword" });

    expect(res.body).not.toHaveProperty("password");
  });
});
