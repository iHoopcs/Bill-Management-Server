/**
 * User Service Unit Tests
 *
 * Tests getAllUsers and getUserById business logic in isolation.
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
const { getAllUsers, getUserById } = require("../../src/modules/users/user.service");
const User = require("../../src/modules/users/User");
const db = require("../helpers/db");

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

// ─── getAllUsers ──────────────────────────────────────────────────────────────

describe("getAllUsers", () => {
  it("should return an empty array when no users exist", async () => {
    const result = await getAllUsers();
    expect(result).toEqual([]);
  });

  it("should return all users without passwords", async () => {
    await User.create([
      { email: "a@example.com", password: "hash1", firstName: "A", lastName: "One" },
      { email: "b@example.com", password: "hash2", firstName: "B", lastName: "Two" },
    ]);

    const result = await getAllUsers();

    expect(result).toHaveLength(2);
    result.forEach((u) => {
      expect(u.password).toBeUndefined();
    });
  });

  it("should include expected fields on each user", async () => {
    await User.create({ email: "a@example.com", password: "hash", firstName: "Alice", lastName: "Smith" });

    const [user] = await getAllUsers();

    expect(user.email).toBe("a@example.com");
    expect(user.firstName).toBe("Alice");
    expect(user.lastName).toBe("Smith");
  });
});

// ─── getUserById ──────────────────────────────────────────────────────────────

describe("getUserById", () => {
  it("should return the user without password when found", async () => {
    const created = await User.create({
      email: "user@example.com",
      password: "hashed",
      firstName: "Jane",
      lastName: "Doe",
    });

    const result = await getUserById(created._id);

    expect(result.email).toBe("user@example.com");
    expect(result.password).toBeUndefined();
  });

  it("should throw 404 if the user does not exist", async () => {
    const { Types } = require("mongoose");
    const err = await getUserById(new Types.ObjectId()).catch((e) => e);

    expect(err).toBeInstanceOf(Error);
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("User not found");
  });
});
