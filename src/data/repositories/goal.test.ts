import type { useLiveQuery } from "drizzle-orm/expo-sqlite";
import type { GoalTarget } from "../../domain/goal";
import { goal } from "../schema";
import { createTestDatabase } from "../testing/testDatabase";
import {
  idSequence,
  T0,
  testRepositoryOptions,
  type TestRepositoryOptions,
} from "../testing/testClock";
import { createGoalRepository, type GoalRepository } from "./goal";

const THU_29 = "2026-10-29";
const FRI_30 = "2026-10-30";

let options: TestRepositoryOptions;
let repo: GoalRepository;

beforeEach(() => {
  options = testRepositoryOptions(createTestDatabase());
  repo = createGoalRepository({ ...options, newId: idSequence("goal") });
});

const allRows = () => options.db.select().from(goal).all();

/** Inserts an active goal by hand, as a sync could. */
function insertByHand(id: string, target: GoalTarget, updatedAt: Date) {
  options.db
    .insert(goal)
    .values({
      id,
      createdAt: T0,
      updatedAt,
      target,
      confirmedKey: THU_29,
    })
    .run();
}

describe("set", () => {
  it("creates the goal first, with the injected clock and id", () => {
    const row = repo.set({ target: 3, confirmedKey: THU_29 });

    expect(row).toEqual({
      id: "goal-1",
      createdAt: T0,
      updatedAt: T0,
      deletedAt: null,
      target: 3,
      confirmedKey: THU_29,
    });
    expect(repo.get().get()).toEqual(row);
  });

  it("then updates the same row", () => {
    repo.set({ target: 3, confirmedKey: THU_29 });
    const at = options.advance();

    const row = repo.set({ target: 7, confirmedKey: FRI_30 });

    expect(row).toEqual({
      id: "goal-1",
      createdAt: T0,
      updatedAt: at,
      deletedAt: null,
      target: 7,
      confirmedKey: FRI_30,
    });
    expect(allRows()).toEqual([row]);
  });

  it("creates a new goal when the active one is deleted", () => {
    repo.set({ target: 3, confirmedKey: THU_29 });
    options.db.update(goal).set({ deletedAt: options.advance() }).run();

    const row = repo.set({ target: 1, confirmedKey: FRI_30 });

    expect(row.id).toBe("goal-2");
    expect(allRows()).toHaveLength(2);
  });

  it("updates the most recent goal when two are active", () => {
    insertByHand("goal-a", 1, options.advance());
    insertByHand("goal-b", 2, T0);

    repo.set({ target: 14, confirmedKey: FRI_30 });

    expect(allRows()).toEqual([
      expect.objectContaining({ id: "goal-a", target: 14 }),
      expect.objectContaining({ id: "goal-b", target: 2 }),
    ]);
  });

  it("refuses an invalid confirmed key, and writes nothing", () => {
    expect(() => repo.set({ target: 3, confirmedKey: "2026-02-30" })).toThrow(
      /^goal\.set: invalid date key/,
    );
    expect(() => repo.set({ target: 3, confirmedKey: "demain" })).toThrow(
      RangeError,
    );
    expect(allRows()).toEqual([]);
  });

  it("refuses an invalid confirmed key for an existing goal", () => {
    const row = repo.set({ target: 3, confirmedKey: THU_29 });
    options.advance();

    expect(() => repo.set({ target: 7, confirmedKey: "" })).toThrow(RangeError);
    expect(allRows()).toEqual([row]);
  });

  it("is refused by the database for a target out of the list", () => {
    expect(() =>
      repo.set({ target: 5 as GoalTarget, confirmedKey: THU_29 }),
    ).toThrow(/CHECK constraint failed/);
    expect(allRows()).toEqual([]);
  });
});

describe("get", () => {
  it("is undefined while there is no goal", () => {
    expect(repo.get().get()).toBeUndefined();
  });

  it("ignores a deleted goal", () => {
    repo.set({ target: 3, confirmedKey: THU_29 });
    options.db.update(goal).set({ deletedAt: options.advance() }).run();

    expect(repo.get().get()).toBeUndefined();
  });

  it("returns the most recently updated goal when two are active", () => {
    insertByHand("goal-a", 1, options.advance());
    insertByHand("goal-b", 2, T0);

    expect(repo.get().get()).toEqual(
      expect.objectContaining({ id: "goal-a", target: 1 }),
    );
  });

  it("orders by id when updated_at is the same", () => {
    insertByHand("goal-a", 1, T0);
    insertByHand("goal-b", 2, T0);

    expect(repo.get().get()).toEqual(
      expect.objectContaining({ id: "goal-b", target: 2 }),
    );
  });

  it("is a query accepted by useLiveQuery", () => {
    /* Checked by `tsc` only: this function is never called. */
    const subscribe = (live: typeof useLiveQuery) => live(repo.get());

    expect(typeof subscribe).toBe("function");
  });
});
