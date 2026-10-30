import type { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { reminders } from "../schema";
import { createTestDatabase } from "../testing/testDatabase";
import {
  idSequence,
  T0,
  testRepositoryOptions,
  type TestRepositoryOptions,
} from "../testing/testClock";
import {
  createReminderRepository,
  type ReminderRepository,
  type ReminderValues,
} from "./reminders";

const morning: ReminderValues = {
  enabled: true,
  hour: 8,
  minute: 30,
  weekdays: [1, 2, 3, 4, 5],
  repeatEnabled: false,
  repeatCount: 1,
  repeatDelayMinutes: 15,
};

const evening: ReminderValues = {
  enabled: false,
  hour: 21,
  minute: 0,
  weekdays: [6, 7],
  repeatEnabled: true,
  repeatCount: 3,
  repeatDelayMinutes: 240,
};

let options: TestRepositoryOptions;
let repo: ReminderRepository;

beforeEach(() => {
  options = testRepositoryOptions(createTestDatabase());
  repo = createReminderRepository({ ...options, newId: idSequence("rem") });
});

const allRows = () => options.db.select().from(reminders).all();

/** Inserts an active reminder by hand, as a sync could. */
function insertByHand(id: string, values: ReminderValues, updatedAt: Date) {
  options.db
    .insert(reminders)
    .values({ id, createdAt: T0, updatedAt, ...values })
    .run();
}

describe("set", () => {
  it("creates the reminder first, with the injected clock and id", () => {
    const row = repo.set(morning);

    expect(row).toEqual({
      id: "rem-1",
      createdAt: T0,
      updatedAt: T0,
      deletedAt: null,
      ...morning,
    });
    expect(repo.get().get()).toEqual(row);
  });

  it("then updates the same row", () => {
    repo.set(morning);
    const at = options.advance();

    const row = repo.set(evening);

    expect(row).toEqual({
      id: "rem-1",
      createdAt: T0,
      updatedAt: at,
      deletedAt: null,
      ...evening,
    });
    expect(allRows()).toEqual([row]);
  });

  it("keeps only the business columns of the values", () => {
    const row = repo.set({
      ...morning,
      id: "forced",
      deletedAt: T0,
    } as ReminderValues);

    expect(row).toEqual(expect.objectContaining({ id: "rem-1" }));
    expect(repo.get().get()).toEqual(row);
  });

  it("updates the most recent reminder when two are active", () => {
    insertByHand("rem-a", morning, options.advance());
    insertByHand("rem-b", morning, T0);

    repo.set(evening);

    expect(allRows()).toEqual([
      expect.objectContaining({ id: "rem-a", hour: 21 }),
      expect.objectContaining({ id: "rem-b", hour: 8 }),
    ]);
  });

  it.each([
    ["an hour", { hour: 24 }],
    ["a minute", { minute: -1 }],
    ["a repeat count", { repeatCount: 4 }],
    ["a repeat delay", { repeatDelayMinutes: 10 }],
  ])("is refused by the database for %s out of bounds", (_, changes) => {
    expect(() => repo.set({ ...morning, ...changes })).toThrow(
      /CHECK constraint failed/,
    );
    expect(allRows()).toEqual([]);
  });
});

describe("get", () => {
  it("is undefined while there is no reminder", () => {
    expect(repo.get().get()).toBeUndefined();
  });

  it("ignores a deleted reminder", () => {
    repo.set(morning);
    options.db.update(reminders).set({ deletedAt: options.advance() }).run();

    expect(repo.get().get()).toBeUndefined();
  });

  it("returns the most recently updated reminder when two are active", () => {
    insertByHand("rem-a", morning, T0);
    insertByHand("rem-b", evening, options.advance());

    expect(repo.get().get()).toEqual(
      expect.objectContaining({ id: "rem-b", hour: 21 }),
    );
  });

  it("orders by id when updated_at is the same", () => {
    insertByHand("rem-a", evening, T0);
    insertByHand("rem-b", morning, T0);

    expect(repo.get().get()).toEqual(
      expect.objectContaining({ id: "rem-b", hour: 8 }),
    );
  });

  it("is a query accepted by useLiveQuery", () => {
    /* Checked by `tsc` only: this function is never called. */
    const subscribe = (live: typeof useLiveQuery) => live(repo.get());

    expect(typeof subscribe).toBe("function");
  });
});
