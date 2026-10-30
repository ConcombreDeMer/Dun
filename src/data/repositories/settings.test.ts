import type { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { settings } from "../schema";
import { expectDataError } from "../testing/expectDataError";
import { createTestDatabase } from "../testing/testDatabase";
import {
  idSequence,
  T0,
  testRepositoryOptions,
  type TestRepositoryOptions,
} from "../testing/testClock";
import { createSettingsRepository, type SettingsRepository } from "./settings";

let options: TestRepositoryOptions;
let repo: SettingsRepository;

beforeEach(() => {
  options = testRepositoryOptions(createTestDatabase());
  repo = createSettingsRepository({ ...options, newId: idSequence("setting") });
});

const allRows = () => options.db.select().from(settings).all();

const listed = () =>
  repo
    .list()
    .all()
    .map((s) => [s.key, s.value]);

describe("set", () => {
  it("creates the setting, with the injected clock and id", () => {
    repo.set("theme", "dark");

    expect(repo.get("theme").get()).toEqual({
      id: "setting-1",
      createdAt: T0,
      updatedAt: T0,
      deletedAt: null,
      key: "theme",
      value: "dark",
    });
  });

  it("replaces the value in the same row", () => {
    repo.set("theme", "dark");
    const at = options.advance();

    repo.set("theme", "light");

    expect(allRows()).toEqual([
      {
        id: "setting-1",
        createdAt: T0,
        updatedAt: at,
        deletedAt: null,
        key: "theme",
        value: "light",
      },
    ]);
  });

  it("reuses the row of a removed key: same id and created_at", () => {
    repo.set("theme", "dark");
    repo.remove("theme");
    const at = options.advance(2);

    repo.set("theme", "light");

    expect(allRows()).toEqual([
      {
        id: "setting-1",
        createdAt: T0,
        updatedAt: at,
        deletedAt: null,
        key: "theme",
        value: "light",
      },
    ]);
  });

  it("refuses null and undefined at the type level", () => {
    /* Checked by `tsc` only: this function is never called. */
    const misuse = () => {
      // @ts-expect-error The column is NOT NULL.
      repo.set("k", null);
      // @ts-expect-error The column is NOT NULL.
      repo.set("k", undefined);
    };

    expect(typeof misuse).toBe("function");
  });

  it("reads a JSON value back as it was written", () => {
    const value = { weekStart: 1, hidden: ["stats"], compact: true };

    repo.set("display", value);

    expect(repo.get("display").get()?.value).toEqual(value);
  });
});

describe("reads", () => {
  beforeEach(() => {
    repo.set("theme", "dark");
    repo.set("language", "fr");
    repo.set("haptics", false);
  });

  it("list returns the settings by key", () => {
    expect(listed()).toEqual([
      ["haptics", false],
      ["language", "fr"],
      ["theme", "dark"],
    ]);
  });

  it("get returns undefined for a missing key", () => {
    expect(repo.get("missing").get()).toBeUndefined();
  });

  it("a removed setting appears in no read", () => {
    repo.remove("theme");

    expect(listed()).toEqual([
      ["haptics", false],
      ["language", "fr"],
    ]);
    expect(repo.get("theme").get()).toBeUndefined();
  });

  it("the reads are queries accepted by useLiveQuery", () => {
    /* Checked by `tsc` only: this function is never called. */
    const subscribe = (live: typeof useLiveQuery) => [
      live(repo.list()),
      live(repo.get("theme")),
    ];

    expect(typeof subscribe).toBe("function");
  });
});

describe("remove", () => {
  it("soft-deletes the setting, keeping the row", () => {
    repo.set("theme", "dark");
    const at = options.advance();

    repo.remove("theme");

    expect(allRows()).toEqual([
      expect.objectContaining({
        id: "setting-1",
        createdAt: T0,
        updatedAt: at,
        deletedAt: at,
      }),
    ]);
  });

  it("refuses a missing or already removed key", () => {
    repo.set("theme", "dark");
    repo.remove("theme");

    expectDataError(() => repo.remove("theme"), "not_found");
    expectDataError(() => repo.remove("missing"), "not_found");
  });
});
