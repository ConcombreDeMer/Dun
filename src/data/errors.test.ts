import { DataError, isUniqueViolation } from "./errors";

describe("DataError", () => {
  it("carries its code", () => {
    const error = new DataError("not_found", "Task not found (task-1)");

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("DataError");
    expect(error.code).toBe("not_found");
    expect(error.message).toBe("Task not found (task-1)");
  });
});

describe("isUniqueViolation", () => {
  const unique = new Error("UNIQUE constraint failed: tags.name");

  it("recognizes the unique index error of the column", () => {
    expect(isUniqueViolation(unique, "tags.name")).toBe(true);
  });

  it("recognizes it with a driver prefix or in a cause", () => {
    expect(
      isUniqueViolation(
        new Error("Error code 19: UNIQUE constraint failed: tags.name"),
        "tags.name",
      ),
    ).toBe(true);
    expect(
      isUniqueViolation(
        new Error("Failed query", { cause: unique }),
        "tags.name",
      ),
    ).toBe(true);
  });

  it("recognizes an error from another realm", () => {
    expect(
      isUniqueViolation(
        { message: "UNIQUE constraint failed: tags.name" },
        "tags.name",
      ),
    ).toBe(true);
  });

  it.each([
    ["another column", new Error("UNIQUE constraint failed: settings.key")],
    ["another constraint", new Error("NOT NULL constraint failed: tags.name")],
    ["a message that is not a string", { message: 19 }],
    ["a string", "UNIQUE constraint failed: tags.name"],
    ["undefined", undefined],
    ["null", null],
  ])("ignores %s", (_, error) => {
    expect(isUniqueViolation(error, "tags.name")).toBe(false);
  });
});
