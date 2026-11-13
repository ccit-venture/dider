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

  test("create default kategori 'latest', views 0", () => {
    const db = createTestDb();
    const projects = new ProjectModel(db);

    const id = projects.create("Majalah", "uploads/a.pdf");
    const p = projects.findById(id)!;
    expect(p.kategori).toBe("latest");
    expect(p.views).toBe(0);
  });

  test("listShelf('popular') urut dari views terbanyak", () => {
    const db = createTestDb();
    const projects = new ProjectModel(db);

    const a = projects.create("A", "uploads/a.pdf");
    const b = projects.create("B", "uploads/b.pdf");
    projects.incrementViews(b);
    projects.incrementViews(b);
    projects.incrementViews(a);

    expect(projects.listShelf("popular").map((p) => p.id)).toEqual([b, a]);
  });

  test("listShelf('latest') urut dari terbaru", () => {
    const db = createTestDb();
    const projects = new ProjectModel(db);

    const a = projects.create("A", "uploads/a.pdf");
    const b = projects.create("B", "uploads/b.pdf");
    db.query("UPDATE projects SET updated_at = datetime('now','-1 day') WHERE id = ?").run(a);

    expect(projects.listShelf("latest").map((p) => p.id)).toEqual([b, a]);
  });

  test("incrementViews menambah hitungan tampil", () => {
    const db = createTestDb();
    const projects = new ProjectModel(db);

    const id = projects.create("Majalah", "uploads/a.pdf");
    projects.incrementViews(id);
    projects.incrementViews(id);
    expect(projects.findById(id)!.views).toBe(2);
  });

  test("create menyimpan uploader_id & list join nama uploader", async () => {
    const db = createTestDb();
    const projects = new ProjectModel(db);
    const { UserModel } = await import("../src/models/user.model");
    const userId = await new UserModel(db).create("admin", "rahasia123", "Admin Dider");

    const id = projects.create("Majalah", "uploads/a.pdf", undefined, userId);
    const p = projects.findById(id)!;
    expect(p.uploader_id).toBe(userId);
    expect(p.uploader).toBe("Admin Dider");

    expect(projects.list()[0].uploader).toBe("Admin Dider");
  });

  test("uploader null (data lama) → uploader tetap null, tidak error", () => {
    const db = createTestDb();
    const projects = new ProjectModel(db);

    const id = projects.create("Majalah", "uploads/a.pdf");
    const p = projects.findById(id)!;
    expect(p.uploader_id).toBeNull();
    expect(p.uploader).toBeNull();
  });
});