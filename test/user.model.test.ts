import { describe, expect, test } from "bun:test";
import { UserModel } from "../src/models/user.model";
import { createTestDb } from "./helpers";

describe("UserModel", () => {
  test("create → findPublic tanpa bocor password_hash", async () => {
    const db = createTestDb();
    const users = new UserModel(db);

    const id = await users.create("admin", "rahasia123", "Admin Dider");
    const pub = users.findPublic(id) as Record<string, unknown> | null;

    expect(pub?.username).toBe("admin");
    expect(pub?.full_name).toBe("Admin Dider");
    expect(pub?.password_hash).toBeUndefined();
  });

  test("verifyPassword: benar → userId, salah/unknown → null", async () => {
    const db = createTestDb();
    const users = new UserModel(db);

    await users.create("admin", "rahasia123");

    expect(await users.verifyPassword("admin", "rahasia123")).toBeTruthy();
    expect(await users.verifyPassword("admin", "salah")).toBeNull();
    expect(await users.verifyPassword("ngasal", "rahasia123")).toBeNull();
  });

  test("username duplikat ditolak (UNIQUE)", async () => {
    const db = createTestDb();
    const users = new UserModel(db);

    await users.create("admin", "rahasia123");
    let threw = false;
    try {
      await users.create("admin", "rahasia123");
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  test("findPublic null untuk id tidak dikenal", () => {
    const db = createTestDb();
    const users = new UserModel(db);
    expect(users.findPublic("id-ngasal")).toBeNull();
  });
});