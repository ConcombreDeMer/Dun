import { orderKeyBetween } from "./orderKeys";

/** Sorted as SQLite's `ORDER BY` does with the default collation. */
function sorted(keys: readonly string[]): string[] {
  return [...keys].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

describe("orderKeyBetween", () => {
  it("gives a first key for an empty list", () => {
    expect(typeof orderKeyBetween(null, null)).toBe("string");
  });

  it("gives a key before the first one", () => {
    const first = orderKeyBetween(null, null);

    expect(orderKeyBetween(null, first) < first).toBe(true);
  });

  it("gives a key after the last one", () => {
    const last = orderKeyBetween(null, null);

    expect(orderKeyBetween(last, null) > last).toBe(true);
  });

  it("gives a key between two neighbors", () => {
    const before = orderKeyBetween(null, null);
    const after = orderKeyBetween(before, null);
    const key = orderKeyBetween(before, after);

    expect(before < key && key < after).toBe(true);
  });

  it("keeps 50 insertions at the head in order", () => {
    const keys = [orderKeyBetween(null, null)];
    for (let index = 0; index < 50; index += 1) {
      keys.unshift(orderKeyBetween(null, keys[0]));
    }

    expect(sorted(keys)).toEqual(keys);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("keeps 50 insertions at the same place in order", () => {
    const first = orderKeyBetween(null, null);
    const last = orderKeyBetween(first, null);
    const keys = [first, last];
    for (let index = 0; index < 50; index += 1) {
      /* Always right after the first key. */
      keys.splice(1, 0, orderKeyBetween(keys[0], keys[1]));
    }

    expect(sorted(keys)).toEqual(keys);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("throws when before >= after", () => {
    const key = orderKeyBetween(null, null);
    const after = orderKeyBetween(key, null);

    expect(() => orderKeyBetween(after, key)).toThrow();
    expect(() => orderKeyBetween(key, key)).toThrow();
  });
});
