/// <reference types="node" />

import { randomBytes } from "node:crypto";
import { newId, uuidV7 } from "./ids";

/*
 * Hermes has no `crypto.getRandomValues`: the app takes its random bytes from
 * `expo-crypto`, a native module, replaced here by `node:crypto`.
 */
const mockGetRandomBytes = jest.fn((count: number) =>
  Uint8Array.from(randomBytes(count)),
);

jest.mock("expo-crypto", () => ({
  getRandomBytes: (count: number) => mockGetRandomBytes(count),
}));

const UUID_V7 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const NOW = Date.parse("2026-10-29T08:00:00.000Z");

/** The timestamp held by the first 48 bits (12 hexadecimal characters). */
function timestampOf(id: string): number {
  return parseInt(id.replace(/-/g, "").slice(0, 12), 16);
}

describe("uuidV7", () => {
  it("writes version 7 and variant 10, in lowercase 8-4-4-4-12", () => {
    const id = uuidV7(NOW, new Uint8Array(10).fill(0xff));

    expect(id).toMatch(UUID_V7);
    expect(id[14]).toBe("7");
    expect(id[19]).toBe("b");
  });

  it("keeps the version and the variant with random bytes set to 0", () => {
    const id = uuidV7(NOW, new Uint8Array(10));

    expect(id).toBe(
      `${NOW.toString(16)
        .padStart(12, "0")
        .replace(/^(.{8})/, "$1-")}-7000-8000-000000000000`,
    );
  });

  it("puts the random bytes after the version and the variant", () => {
    const random = Uint8Array.from([
      0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0x10, 0x32,
    ]);

    expect(uuidV7(0, random)).toBe("00000000-0000-7123-8567-89abcdef1032");
  });

  it.each([0, 1, NOW, 2 ** 48 - 1])(
    "can read the timestamp %d back from the first 12 hexadecimal characters",
    (timeMs) => {
      expect(timestampOf(uuidV7(timeMs, new Uint8Array(10)))).toBe(timeMs);
    },
  );

  it("gives two different ids in the same millisecond", () => {
    const first = uuidV7(NOW, Uint8Array.from(randomBytes(10)));
    const second = uuidV7(NOW, Uint8Array.from(randomBytes(10)));

    expect(first).not.toBe(second);
    expect(timestampOf(first)).toBe(timestampOf(second));
  });

  it.each([9, 11, 0])("refuses %d random bytes", (count) => {
    expect(() => uuidV7(NOW, new Uint8Array(count))).toThrow(RangeError);
  });

  it.each([-1, 2 ** 48, 1.5, Number.NaN])(
    "refuses the timestamp %d",
    (timeMs) => {
      expect(() => uuidV7(timeMs, new Uint8Array(10))).toThrow(RangeError);
    },
  );
});

describe("newId", () => {
  beforeEach(() => {
    mockGetRandomBytes.mockClear();
  });

  it("takes 10 random bytes from expo-crypto and the current time", () => {
    jest.spyOn(Date, "now").mockReturnValue(NOW);

    const id = newId();

    expect(id).toMatch(UUID_V7);
    expect(timestampOf(id)).toBe(NOW);
    expect(mockGetRandomBytes).toHaveBeenCalledWith(10);
    jest.restoreAllMocks();
  });

  it("gives a different id at each call", () => {
    const ids = new Set(Array.from({ length: 100 }, () => newId()));

    expect(ids.size).toBe(100);
  });
});
