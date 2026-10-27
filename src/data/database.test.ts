import type { openLocalDatabase as OpenLocalDatabase } from "./database";

/*
 * expo-sqlite is a native module: it is mocked, as is the Drizzle driver.
 * These tests check the opening options, the PRAGMAs and the reuse of the
 * opened database.
 */
const mockSqlite = { execSync: jest.fn(), closeSync: jest.fn() };
const mockOpenDatabaseSync = jest.fn();
const mockDrizzle = jest.fn();

jest.mock("expo-sqlite", () => ({
  openDatabaseSync: (...args: unknown[]) => mockOpenDatabaseSync(...args),
}));

jest.mock("drizzle-orm/expo-sqlite", () => ({
  drizzle: (...args: unknown[]) => mockDrizzle(...args),
}));

/**
 * A fresh copy of the module, without the database opened by another test.
 * `requireActual` loads the real module (not mocked) in the isolated registry.
 */
function loadOpenLocalDatabase(): typeof OpenLocalDatabase {
  let open: typeof OpenLocalDatabase | undefined;

  jest.isolateModules(() => {
    open =
      jest.requireActual<typeof import("./database")>(
        "./database",
      ).openLocalDatabase;
  });

  return open as typeof OpenLocalDatabase;
}

describe("openLocalDatabase", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSqlite.execSync.mockImplementation(() => {});
    mockOpenDatabaseSync.mockReturnValue(mockSqlite);
    mockDrizzle.mockImplementation(() => ({ name: "drizzle database" }));
  });

  it("does not open anything when the module is imported", () => {
    loadOpenLocalDatabase();

    expect(mockOpenDatabaseSync).not.toHaveBeenCalled();
  });

  it("opens dun.db, enables foreign keys and WAL, in snake_case", () => {
    const database = loadOpenLocalDatabase()();

    expect(mockOpenDatabaseSync).toHaveBeenCalledWith("dun.db", {
      enableChangeListener: true,
    });
    expect(mockSqlite.execSync).toHaveBeenNthCalledWith(
      1,
      "PRAGMA foreign_keys = ON;",
    );
    expect(mockSqlite.execSync).toHaveBeenNthCalledWith(
      2,
      "PRAGMA journal_mode = WAL;",
    );
    expect(mockDrizzle).toHaveBeenCalledWith(
      mockSqlite,
      expect.objectContaining({ casing: "snake_case" }),
    );
    expect(database).toEqual({ name: "drizzle database" });
  });

  it("opens the database once and reuses it", () => {
    const open = loadOpenLocalDatabase();

    expect(open()).toBe(open());
    expect(mockOpenDatabaseSync).toHaveBeenCalledTimes(1);
  });

  it("throws when the file cannot be opened, and tries again next time", () => {
    const failure = new Error("disk full");
    mockOpenDatabaseSync.mockImplementationOnce(() => {
      throw failure;
    });
    const open = loadOpenLocalDatabase();

    expect(() => open()).toThrow(failure);
    expect(open()).toEqual({ name: "drizzle database" });
    expect(mockOpenDatabaseSync).toHaveBeenCalledTimes(2);
  });

  it("closes the file and throws when a PRAGMA fails", () => {
    const failure = new Error("database disk image is malformed");
    mockSqlite.execSync.mockImplementation(() => {
      throw failure;
    });

    const open = loadOpenLocalDatabase();

    expect(() => open()).toThrow(failure);
    expect(mockSqlite.closeSync).toHaveBeenCalledTimes(1);
    expect(mockDrizzle).not.toHaveBeenCalled();
  });
});
