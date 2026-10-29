/*
 * Row identifiers: UUID version 7 (RFC 9562), generated on the device.
 *
 * A UUID v7 starts with the creation time in milliseconds, so identifiers
 * created on several devices do not collide and stay roughly sorted by time.
 * No rule sorts by `id`, though: the order of a list goes through
 * `order_key`.
 */

import { getRandomBytes } from "expo-crypto";

/** Number of random bytes `uuidV7` takes: 74 of their 80 bits are used. */
export const UUID_V7_RANDOM_BYTES = 10;

/** Largest timestamp a UUID v7 can hold: 48 bits of milliseconds. */
const MAX_TIME_MS = 2 ** 48 - 1;

function hex(bytes: Uint8Array, start: number, end: number): string {
  let text = "";
  for (let index = start; index < end; index += 1) {
    text += bytes[index].toString(16).padStart(2, "0");
  }
  return text;
}

/**
 * A UUID v7 built from `timeMs` (milliseconds since the Unix epoch) and 10
 * random bytes, written `8-4-4-4-12` in lowercase:
 * - 48 bits of timestamp;
 * - the version `7`;
 * - the variant `10`;
 * - 74 random bits.
 *
 * Throws a `RangeError` if `timeMs` is not an integer between 0 and 2^48 - 1,
 * or if `random` does not hold exactly 10 bytes.
 */
export function uuidV7(timeMs: number, random: Uint8Array): string {
  if (!Number.isInteger(timeMs) || timeMs < 0 || timeMs > MAX_TIME_MS) {
    throw new RangeError(`uuidV7: timestamp out of range (${timeMs})`);
  }
  if (random.length !== UUID_V7_RANDOM_BYTES) {
    throw new RangeError(
      `uuidV7: expected ${UUID_V7_RANDOM_BYTES} random bytes (${random.length})`,
    );
  }

  const bytes = new Uint8Array(16);
  let time = timeMs;
  for (let index = 5; index >= 0; index -= 1) {
    bytes[index] = time % 256;
    time = Math.floor(time / 256);
  }
  /* Version 7, then 12 random bits (rand_a). */
  bytes[6] = 0x70 | (random[0] & 0x0f);
  bytes[7] = random[1];
  /* Variant `10`, then 62 random bits (rand_b). */
  bytes[8] = 0x80 | (random[2] & 0x3f);
  bytes.set(random.subarray(3), 9);

  return [
    hex(bytes, 0, 4),
    hex(bytes, 4, 6),
    hex(bytes, 6, 8),
    hex(bytes, 8, 10),
    hex(bytes, 10, 16),
  ].join("-");
}

/**
 * A new row identifier. The random bytes come from `expo-crypto`: Hermes has
 * no global `crypto.getRandomValues`.
 */
export function newId(): string {
  return uuidV7(Date.now(), getRandomBytes(UUID_V7_RANDOM_BYTES));
}
