import { describe, expect, test } from "bun:test";
import { ProjectModel } from "../src/models/project.model";
import { createTestDb } from "./helpers";

describe("ProjectModel", () => {
  test("create → findById", () => {
    const db = createTestDb();
    const projects = new ProjectModel(db);

    const id = projects.create("Majalah Angkatan", "uploads/a.pdf");

    const p = projects.findById(id);
    expect(p?.nama).toBe("Majalah Angkatan");
    expect(p?.pdf_path).toBe("uploads/a.pdf");
  });

  test("list mengembalikan ringkasan dokumen", () => {
    const db = createTestDb();
    const projects = new ProjectModel(db);

    projects.create("A", "uploads/a.pdf");
    projects.create("B", "uploads/b.pdf");

    const list = projects.list();
    expect(list).toHaveLength(2);
    const namaList = list.map((p) => p.nama).sort();
    expect(namaList).toEqual(["A", "B"]);
    expect(list.every((p) => p.pdf_path.startsWith("uploads/"))).toBe(true);
  });

  test("findById mengembalikan null untuk id tidak ada", () => {
    const db = createTestDb();
    const projects = new ProjectModel(db);
    expect(projects.findById("id-ngasal")).toBeNull();
  });

  test("delete menghapus dokumen", () => {
    const db = createTestDb();
    const projects = new ProjectModel(db);

    const id = projects.create("Majalah", "uploads/a.pdf");
    projects.delete(id);

    expect(projects.findById(id)).toBeNull();
  });

  test("softDelete: hilang dari list, muncul di listTrashed, restore mengembalikan", () => {
    const db = createTestDb();
    const projects = new ProjectModel(db);

    const id = projects.create("Majalah", "uploads/a.pdf");
    projects.softDelete(id);

    expect(projects.list()).toHaveLength(0);
    expect(projects.listTrashed().map((p) => p.id)).toEqual([id]);
    expect(projects.findById(id)?.deleted_at).toBeTruthy();

    projects.restore(id);
    expect(projects.list().map((p) => p.id)).toEqual([id]);
    expect(projects.listTrashed()).toHaveLength(0);
    expect(projects.findById(id)?.deleted_at).toBeNull();
  });

  test("softDelete dua kali tidak mengubah deleted_at", () => {
    const db = createTestDb();
    const projects = new ProjectModel(db);

    const id = projects.create("Majalah", "uploads/a.pdf");
    projects.softDelete(id);
    const first = projects.findById(id)!.deleted_at;

    projects.softDelete(id);
    expect(projects.findById(id)!.deleted_at).toBe(first);
  });
});