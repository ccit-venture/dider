import { describe, expect, test } from "bun:test";
import { SessionModel } from "../src/models/session.model";
import { createTestDb } from "./helpers";

describe("SessionModel", () => {
  test("create lalu findBySid mengembalikan userId", () => {
    const db = createTestDb();
    const sessions = new SessionModel(db);

    const sid = sessions.create("user-1");
    expect(sessions.findBySid(sid)).toBe("user-1");
  });

  test("findBySid mengembalikan null untuk sid tidak dikenal", () => {
    const db = createTestDb();
    const sessions = new SessionModel(db);

    expect(sessions.findBySid("sid-ngasal")).toBeNull();
  });

  test("delete menghapus session", () => {
    const db = createTestDb();
    const sessions = new SessionModel(db);

    const sid = sessions.create("user-1");
    sessions.delete(sid);
    expect(sessions.findBySid(sid)).toBeNull();
  });
});
