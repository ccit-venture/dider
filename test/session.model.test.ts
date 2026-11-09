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

  test("session kedaluwarsa (>7 hari) → findBySid null", () => {
    const db = createTestDb();
    const sessions = new SessionModel(db);

    const sid = sessions.create("user-1");
    db.query("UPDATE sessions SET created_at = datetime('now', '-8 days') WHERE id = ?").run(sid);
    expect(sessions.findBySid(sid)).toBeNull();
  });

  test("create membersihkan session kedaluwarsa", () => {
    const db = createTestDb();
    const sessions = new SessionModel(db);

    const lama = sessions.create("user-1");
    db.query("UPDATE sessions SET created_at = datetime('now', '-8 days') WHERE id = ?").run(lama);
    sessions.create("user-2");

    const sisa = db.query("SELECT id FROM sessions").all() as { id: string }[];
    expect(sisa.map((s) => s.id)).not.toContain(lama);
  });
});
