import { describe, expect, test } from "bun:test";
import { ProjectModel } from "../src/models/project.model";
import { createTestDb } from "./helpers";

describe("ProjectModel", () => {
  test("create → findById (JSON parse halaman)", () => {
    const db = createTestDb();
    const projects = new ProjectModel(db);

    const id = projects.create(
      "Majalah Angkatan",
      { lebar: 794, tinggi: 1123 },
      [{ id: "h1", blok: [{ id: "b1", tipe: "judul", teks: "Halo" }] }]
    );

    const p = projects.findById(id) as { nama: string; halaman: string; ukuran: string };
    expect(p.nama).toBe("Majalah Angkatan");
    expect(JSON.parse(p.halaman)).toHaveLength(1);
    expect(JSON.parse(p.ukuran).lebar).toBe(794);
  });

  test("update mengganti data proyek", () => {
    const db = createTestDb();
    const projects = new ProjectModel(db);

    const id = projects.create("Majalah", { lebar: 794, tinggi: 1123 }, []);
    projects.update(id, "Majalah v2", { lebar: 595, tinggi: 842 }, [{ id: "h1", blok: [] }]);

    const p = projects.findById(id) as { nama: string; halaman: string; ukuran: string };
    expect(p.nama).toBe("Majalah v2");
    expect(JSON.parse(p.ukuran).lebar).toBe(595);
    expect(JSON.parse(p.halaman)).toHaveLength(1);
  });

  test("list mengembalikan ringkasan tanpa payload halaman", () => {
    const db = createTestDb();
    const projects = new ProjectModel(db);

    projects.create("A", {}, [{ id: "h1", blok: [] }]);
    projects.create("B", {}, [{ id: "h1", blok: [] }]);

    const list = projects.list() as Array<{ nama: string; halaman?: unknown }>;
    expect(list).toHaveLength(2);
    expect(list[0].halaman).toBeUndefined();
  });

  test("findById mengembalikan null untuk id tidak ada", () => {
    const db = createTestDb();
    const projects = new ProjectModel(db);
    expect(projects.findById("id-ngasal")).toBeNull();
  });
});
