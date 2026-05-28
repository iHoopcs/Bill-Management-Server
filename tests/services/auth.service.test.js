/**
 * Auth Service Unit Tests
 *
 * Tests register and login business logic in isolation.
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
const { register, login } = require("../../src/modules/auth/auth.service");
const User = require("../../src/modules/users/User");
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

// ─── register ─────────────────────────────────────────────────────────────────

describe("register", () => {
  it("should save a new user with a hashed password", async () => {
    await register({
      email: "new@example.com",
      password: "plaintext",
      firstName: "John",
      lastName: "Doe",
    });

    const saved = await User.findOne({ email: "new@example.com" });
    expect(saved).not.toBeNull();
    expect(saved.password).not.toBe("plaintext");
    const isHashed = await bcrypt.compare("plaintext", saved.password);
    expect(isHashed).toBe(true);
  });

  it("should throw 409 if a user with the same email already exists", async () => {
    await User.create({
      email: "existing@example.com",
      password: await bcrypt.hash("pass", 10),
      firstName: "Jane",
      lastName: "Doe",
    });

    const err = await register({
      email: "existing@example.com",
      password: "pass",
      firstName: "Jane",
      lastName: "Doe",
    }).catch((e) => e);

    expect(err).toBeInstanceOf(Error);
    expect(err.statusCode).toBe(409);
    expect(err.message).toBe("User already exists");
  });

  it("should not return anything on success", async () => {
    const result = await register({
      email: "new2@example.com",
      password: "pass",
      firstName: "A",
      lastName: "B",
    });

    expect(result).toBeUndefined();
  });
});

// ─── login ────────────────────────────────────────────────────────────────────

describe("login", () => {
  it("should return a signed JWT on valid credentials", async () => {
    await User.create({
      email: "user@example.com",
      password: await bcrypt.hash("correct", 10),
      firstName: "Jane",
      lastName: "Doe",
    });

    const token = await login({ email: "user@example.com", password: "correct" });

    expect(typeof token).toBe("string");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    expect(decoded).toHaveProperty("userId");
  });

  it("should throw 404 if user is not found", async () => {
    const err = await login({ email: "ghost@example.com", password: "pass" }).catch((e) => e);

    expect(err).toBeInstanceOf(Error);
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("User not found");
  });

  it("should throw 401 if the password is incorrect", async () => {
    await User.create({
      email: "user@example.com",
      password: await bcrypt.hash("correct", 10),
      firstName: "Jane",
      lastName: "Doe",
    });

    const err = await login({ email: "user@example.com", password: "wrong" }).catch((e) => e);

    expect(err).toBeInstanceOf(Error);
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe("Invalid credentials");
  });

  it("should not expose the user password in the returned token payload", async () => {
    await User.create({
      email: "user@example.com",
      password: await bcrypt.hash("correct", 10),
      firstName: "Jane",
      lastName: "Doe",
    });

    const token = await login({ email: "user@example.com", password: "correct" });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    expect(decoded).not.toHaveProperty("password");
  });
});
