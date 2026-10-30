import { eq } from "drizzle-orm";
import type { useLiveQuery } from "drizzle-orm/expo-sqlite";
import type { DayRecord } from "../../domain/dayRecord";
import { dayRecords } from "../schema";
import { expectDataError } from "../testing/expectDataError";
import { createTestDatabase } from "../testing/testDatabase";
import {
  idSequence,
  T0,
  testRepositoryOptions,
  type TestRepositoryOptions,
} from "../testing/testClock";
import {
  createDayRecordRepository,
  type DayRecordRepository,
} from "./dayRecords";

/* October 2026. */
const TUE_27 = "2026-10-27";
const WED_28 = "2026-10-28";
const THU_29 = "2026-10-29";

const success: DayRecord = {
  key: WED_28,
  status: "success",
  tasks: [
    {
      id: "task-1",
      name: "Courses",
      done: true,
      tags: [
        { name: "Maison", color: "#00ff00" },
        { name: "Sport", color: "#ff0000" },
      ],
    },
    { id: "task-2", name: "Lettre", done: true, tags: [] },
  ],
};

const empty = (key: string): DayRecord => ({ key, status: "empty", tasks: [] });

let options: TestRepositoryOptions;
let repo: DayRecordRepository;

beforeEach(() => {
  options = testRepositoryOptions(createTestDatabase());
  repo = createDayRecordRepository({ ...options, newId: idSequence("day") });
});

const keys = (rows: readonly { key: string }[]) => rows.map((r) => r.key);

/** Soft-deletes the record of `key` by hand, as a sync could. */
function deleteByHand(key: string): Date {
  const at = options.advance();
  options.db
    .update(dayRecords)
    .set({ deletedAt: at, updatedAt: at })
    .where(eq(dayRecords.key, key))
    .run();
  return at;
}

describe("record", () => {
  it("records several days, with the injected clock and ids", () => {
    repo.record([empty(TUE_27), success]);

    expect(repo.list().all()).toEqual([
      {
        id: "day-1",
        createdAt: T0,
        updatedAt: T0,
        deletedAt: null,
        ...empty(TUE_27),
      },
      {
        id: "day-2",
        createdAt: T0,
        updatedAt: T0,
        deletedAt: null,
        ...success,
      },
    ]);
  });

  it("reads the snapshot of the tasks back as it was recorded", () => {
    repo.record([success]);

    expect(repo.get(WED_28).get()?.tasks).toEqual(success.tasks);
  });

  it("refuses a day already recorded, and writes none of the batch", () => {
    repo.record([success]);

    expectDataError(
      () => repo.record([empty(TUE_27), { ...success, status: "failed" }]),
      "already_recorded",
    );
    expect(repo.list().all()).toEqual([
      expect.objectContaining({ key: WED_28, status: "success" }),
    ]);
  });

  it("refuses an invalid key, and writes none of the batch", () => {
    expect(() => repo.record([empty(TUE_27), empty("2026-10-32")])).toThrow(
      /^dayRecords\.record: invalid date key/,
    );
    expect(() => repo.record([empty("27/10/2026")])).toThrow(RangeError);
    expect(options.db.select().from(dayRecords).all()).toEqual([]);
  });

  it("refuses the same day twice in a batch", () => {
    expectDataError(
      () => repo.record([empty(TUE_27), empty(TUE_27)]),
      "already_recorded",
    );
    expect(repo.list().all()).toEqual([]);
  });

  it("reuses the row of a deleted day: same id and created_at", () => {
    repo.record([success]);
    deleteByHand(WED_28);
    const at = options.advance();

    repo.record([{ key: WED_28, status: "rest", tasks: [] }]);

    expect(options.db.select().from(dayRecords).all()).toEqual([
      {
        id: "day-1",
        createdAt: T0,
        updatedAt: at,
        deletedAt: null,
        key: WED_28,
        status: "rest",
        tasks: [],
      },
    ]);
  });

  it("does nothing for an empty batch", () => {
    repo.record([]);

    expect(repo.list().all()).toEqual([]);
  });
});

describe("reads", () => {
  beforeEach(() => {
    repo.record([empty(TUE_27), success, empty(THU_29)]);
  });

  it("list returns the records by day", () => {
    expect(keys(repo.list().all())).toEqual([TUE_27, WED_28, THU_29]);
  });

  it("listRange returns the records between both keys included", () => {
    expect(keys(repo.listRange(WED_28, THU_29).all())).toEqual([
      WED_28,
      THU_29,
    ]);
    expect(keys(repo.listRange(TUE_27, TUE_27).all())).toEqual([TUE_27]);
  });

  it("get returns the record of the day, or undefined", () => {
    expect(repo.get(WED_28).get()).toEqual(
      expect.objectContaining({ id: "day-2", ...success }),
    );
    expect(repo.get("2026-10-30").get()).toBeUndefined();
  });

  it("lastKey returns the latest recorded day", () => {
    expect(repo.lastKey().get()).toEqual({ key: THU_29 });
  });

  it("a deleted record appears in no read", () => {
    deleteByHand(THU_29);
    deleteByHand(WED_28);

    expect(keys(repo.list().all())).toEqual([TUE_27]);
    expect(keys(repo.listRange(WED_28, THU_29).all())).toEqual([]);
    expect(repo.get(WED_28).get()).toBeUndefined();
    expect(repo.lastKey().get()).toEqual({ key: TUE_27 });
  });

  it("the reads are queries accepted by useLiveQuery", () => {
    /* Checked by `tsc` only: this function is never called. */
    const subscribe = (live: typeof useLiveQuery) => [
      live(repo.list()),
      live(repo.listRange(TUE_27, THU_29)),
      live(repo.get(WED_28)),
      live(repo.lastKey()),
    ];

    expect(typeof subscribe).toBe("function");
  });
});

describe("lastKey", () => {
  it("is undefined while no day is recorded", () => {
    expect(repo.lastKey().get()).toBeUndefined();

    repo.record([empty(TUE_27)]);

    expect(repo.lastKey().get()).toEqual({ key: TUE_27 });
  });
});
