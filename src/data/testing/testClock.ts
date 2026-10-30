/*
 * Fixed clock and predictable ids for the repository tests.
 */

import type { LocalDatabase } from "../database";
import type { RepositoryOptions } from "../repositories/repository";

export const T0 = new Date("2026-10-29T08:00:00.000Z");

/** Ids `<prefix>-1`, `<prefix>-2`… */
export function idSequence(prefix: string): () => string {
  let count = 0;
  return () => {
    count += 1;
    return `${prefix}-${count}`;
  };
}

export type TestRepositoryOptions = Required<RepositoryOptions> & {
  /** Moves the clock forward by `minutes`, and returns the new time. */
  advance(minutes?: number): Date;
};

/**
 * Options for a repository on `db`: the clock starts at `T0` and only moves
 * with `advance`; ids are `id-1`, `id-2`… (see `idSequence`).
 */
export function testRepositoryOptions(
  db: LocalDatabase,
): TestRepositoryOptions {
  let time = T0.getTime();

  return {
    db,
    now: () => new Date(time),
    newId: idSequence("id"),
    advance(minutes = 1) {
      time += minutes * 60_000;
      return new Date(time);
    },
  };
}
