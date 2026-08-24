import { describe, expect, test } from "bun:test";
import { createTestApp, jsonHeaders } from "./helpers";

describe("API — health & ping", () => {
  test("GET /api/ping → { pong: true }", async () => {
    const app = createTestApp();
    const res = await app.request("/api/ping");
    expect(await res.json()).toEqual({ pong: true });
  });

  test("GET /health → driver sqlite", async () => {
    const app = createTestApp();
    const res = await app.request("/health");
    expect((await res.json()).driver).toBe("sqlite");
  });
});

describe("API — projects", () => {
  test("POST /api/projects tanpa login → 401", async () => {
    const app = createTestApp();
    const res = await app.request("/api/projects", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ nama: "Majalah", halaman: [] }),
    });
    expect(res.status).toBe(401);
  });

  test("GET /api/projects awal → kosong", async () => {
    const app = createTestApp();
    const res = await app.request("/api/projects");
    expect((await res.json()).projects).toEqual([]);
  });

  test("GET /api/projects/:id tidak ada → 404", async () => {
    const app = createTestApp();
    const res = await app.request("/api/projects/id-ngasal");
    expect(res.status).toBe(404);
  });

  test("PUT /api/projects/:id tanpa login → 401", async () => {
    const app = createTestApp();
    const res = await app.request("/api/projects/id-ngasal", {
      method: "PUT",
      headers: jsonHeaders,
      body: JSON.stringify({ nama: "X" }),
    });
    expect(res.status).toBe(401);
  });
});
