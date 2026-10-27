import { renderHook, waitFor } from "@testing-library/react-native";

import { useLocalDatabase } from "./useLocalDatabase";

/*
 * The opening (`database.ts`, tested in `database.test.ts`) and the Drizzle
 * migrator are mocked: these tests check that every error, from opening to
 * migration, reaches `error`. The migrations themselves are tested on SQLite
 * in `schema.test.ts`.
 */
const mockDatabase = { name: "drizzle database" };
const mockOpenLocalDatabase = jest.fn();
const mockMigrate = jest.fn();

jest.mock("./database", () => ({
  openLocalDatabase: () => mockOpenLocalDatabase(),
}));

jest.mock("drizzle-orm/expo-sqlite/migrator", () => ({
  migrate: (...args: unknown[]) => mockMigrate(...args),
}));

describe("useLocalDatabase", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOpenLocalDatabase.mockReturnValue(mockDatabase);
    mockMigrate.mockResolvedValue(undefined);
  });

  it("is not ready before the migrations end", async () => {
    mockMigrate.mockReturnValue(new Promise(() => {}));

    const { result } = await renderHook(() => useLocalDatabase());

    expect(result.current).toEqual({ ready: false, error: undefined });
  });

  it("opens the database, applies the migrations, then is ready", async () => {
    const { result } = await renderHook(() => useLocalDatabase());

    await waitFor(() =>
      expect(result.current).toEqual({ ready: true, error: undefined }),
    );
    expect(mockMigrate).toHaveBeenCalledWith(
      mockDatabase,
      expect.objectContaining({ journal: expect.any(Object) }),
    );
  });

  it("gives the error when the database cannot be opened", async () => {
    const failure = new Error("disk full");
    mockOpenLocalDatabase.mockImplementation(() => {
      throw failure;
    });

    const { result } = await renderHook(() => useLocalDatabase());

    await waitFor(() =>
      expect(result.current).toEqual({ ready: false, error: failure }),
    );
    expect(mockMigrate).not.toHaveBeenCalled();
  });

  it("gives the error when a migration fails", async () => {
    const failure = new Error("migration failed");
    mockMigrate.mockRejectedValue(failure);

    const { result } = await renderHook(() => useLocalDatabase());

    await waitFor(() =>
      expect(result.current).toEqual({ ready: false, error: failure }),
    );
  });

  it("wraps a thrown value that is not an Error", async () => {
    mockMigrate.mockRejectedValue("locked");

    const { result } = await renderHook(() => useLocalDatabase());

    await waitFor(() => expect(result.current.error?.message).toBe("locked"));
    expect(result.current.ready).toBe(false);
  });
});
