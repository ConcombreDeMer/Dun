import { eq, sql } from "drizzle-orm";
import { tags } from "../schema";
import { createTestDatabase } from "./testDatabase";

const AT = new Date("2026-10-29T08:00:00.000Z");

const tag = (id: string, name: string) => ({
  id,
  createdAt: AT,
  updatedAt: AT,
  name,
  color: "#ff0000",
});

describe("createTestDatabase", () => {
  it("applies the embedded migrations", () => {
    const db = createTestDatabase();

    expect(db.select().from(tags).all()).toEqual([]);
  });

  it("inserts and reads rows through the expo-sqlite driver", () => {
    const db = createTestDatabase();

    const result = db.insert(tags).values(tag("tag-1", "Sport")).run();

    expect(result.changes).toBe(1);
    expect(db.select().from(tags).all()).toEqual([
      { ...tag("tag-1", "Sport"), deletedAt: null },
    ]);
    expect(
      db
        .select({ name: tags.name })
        .from(tags)
        .where(eq(tags.id, "tag-1"))
        .get(),
    ).toEqual({ name: "Sport" });
    expect(db.get(sql`SELECT count(*) AS total FROM tags`)).toEqual({
      total: 1,
    });
  });

  it("returns the inserted rows with `returning`", () => {
    const db = createTestDatabase();

    expect(
      db.insert(tags).values(tag("tag-1", "Sport")).returning().get(),
    ).toEqual({ ...tag("tag-1", "Sport"), deletedAt: null });
  });

  it("rolls back a transaction that throws", () => {
    const db = createTestDatabase();
    const failure = new Error("stop");

    expect(() =>
      db.transaction((tx) => {
        tx.insert(tags).values(tag("tag-1", "Sport")).run();
        throw failure;
      }),
    ).toThrow(failure);
    expect(db.select().from(tags).all()).toEqual([]);
  });

  it("commits a transaction", () => {
    const db = createTestDatabase();

    db.transaction((tx) => {
      tx.insert(tags).values(tag("tag-1", "Sport")).run();
      tx.insert(tags).values(tag("tag-2", "Travail")).run();
    });

    expect(db.select().from(tags).all()).toHaveLength(2);
  });

  it("enables foreign keys", () => {
    const db = createTestDatabase();

    expect(db.get(sql`PRAGMA foreign_keys`)).toEqual({ foreign_keys: 1 });
  });

  it("gives each call its own database", () => {
    createTestDatabase().insert(tags).values(tag("tag-1", "Sport")).run();

    expect(createTestDatabase().select().from(tags).all()).toEqual([]);
  });
});
