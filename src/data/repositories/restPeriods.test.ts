import type { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { restPeriods } from "../schema";
import { expectDataError } from "../testing/expectDataError";
import { createTestDatabase } from "../testing/testDatabase";
import {
  idSequence,
  T0,
  testRepositoryOptions,
  type TestRepositoryOptions,
} from "../testing/testClock";
import {
  createRestPeriodRepository,
  type RestPeriodRepository,
} from "./restPeriods";

/* October and November 2026. */
const MON_26 = "2026-10-26";
const WED_28 = "2026-10-28";
const THU_29 = "2026-10-29";
const FRI_30 = "2026-10-30";
const SUN_01 = "2026-11-01";
const TUE_03 = "2026-11-03";

let options: TestRepositoryOptions;
let repo: RestPeriodRepository;

beforeEach(() => {
  options = testRepositoryOptions(createTestDatabase());
  repo = createRestPeriodRepository({ ...options, newId: idSequence("rest") });
});

const ranges = (rows: readonly { startKey: string; endKey: string }[]) =>
  rows.map((r) => [r.startKey, r.endKey]);

const allRows = () => options.db.select().from(restPeriods).all();

describe("start", () => {
  it("creates the period from the open day, with the injected clock", () => {
    const period = repo.start(THU_29, SUN_01);

    expect(period).toEqual({
      id: "rest-1",
      createdAt: T0,
      updatedAt: T0,
      deletedAt: null,
      startKey: THU_29,
      endKey: SUN_01,
    });
    expect(repo.list().all()).toEqual([period]);
  });

  it("refuses an overlap, and writes nothing", () => {
    repo.start(THU_29, SUN_01);

    expect(() => repo.start(FRI_30, TUE_03)).toThrow(RangeError);
    expect(() => repo.start(THU_29, THU_29)).toThrow(/overlaps/);
    expect(allRows()).toHaveLength(1);
  });

  it("lets the other errors of startRest through", () => {
    expect(() => repo.start(THU_29, WED_28)).toThrow(
      /end key before the open day/,
    );
    expect(() => repo.start("2026-13-01", SUN_01)).toThrow(/invalid date/);
    expect(allRows()).toEqual([]);
  });

  it("accepts a rest after a cancelled one", () => {
    repo.start(THU_29, SUN_01);
    repo.cancel("rest-1", THU_29);

    repo.start(THU_29, FRI_30);

    expect(ranges(repo.list().all())).toEqual([[THU_29, FRI_30]]);
  });
});

describe("list", () => {
  it("returns the periods that are not deleted, by start", () => {
    repo.start(FRI_30, SUN_01);
    repo.start(MON_26, MON_26);
    repo.start(WED_28, WED_28);
    repo.cancel("rest-3", WED_28);

    expect(ranges(repo.list().all())).toEqual([
      [MON_26, MON_26],
      [FRI_30, SUN_01],
    ]);
  });

  it("is a query accepted by useLiveQuery", () => {
    /* Checked by `tsc` only: this function is never called. */
    const subscribe = (live: typeof useLiveQuery) => live(repo.list());

    expect(typeof subscribe).toBe("function");
  });
});

describe("cancel", () => {
  it("soft-deletes a rest started on the open day", () => {
    repo.start(THU_29, SUN_01);
    const at = options.advance();

    repo.cancel("rest-1", THU_29);

    expect(repo.list().all()).toEqual([]);
    expect(allRows()).toEqual([
      expect.objectContaining({
        id: "rest-1",
        endKey: SUN_01,
        deletedAt: at,
        updatedAt: at,
        createdAt: T0,
      }),
    ]);
  });

  it("ends an older rest the day before the open day", () => {
    repo.start(THU_29, SUN_01);
    const at = options.advance();

    repo.cancel("rest-1", SUN_01);

    expect(repo.list().all()).toEqual([
      expect.objectContaining({
        startKey: THU_29,
        endKey: "2026-10-31",
        createdAt: T0,
        updatedAt: at,
      }),
    ]);
  });

  it("lets the error of cancelRest through", () => {
    repo.start(THU_29, FRI_30);

    expect(() => repo.cancel("rest-1", SUN_01)).toThrow(
      /does not cover the open day/,
    );
    expect(ranges(repo.list().all())).toEqual([[THU_29, FRI_30]]);
  });

  it("refuses a missing or deleted period", () => {
    repo.start(THU_29, SUN_01);
    repo.cancel("rest-1", THU_29);

    expectDataError(() => repo.cancel("rest-1", THU_29), "not_found");
    expectDataError(() => repo.cancel("missing", THU_29), "not_found");
  });
});

describe("changeEnd", () => {
  it("sets a later end", () => {
    repo.start(THU_29, FRI_30);
    const at = options.advance();

    repo.changeEnd("rest-1", TUE_03, FRI_30);

    expect(repo.list().all()).toEqual([
      expect.objectContaining({
        startKey: THU_29,
        endKey: TUE_03,
        createdAt: T0,
        updatedAt: at,
      }),
    ]);
  });

  it("sets a sooner end, down to the open day", () => {
    repo.start(THU_29, TUE_03);

    repo.changeEnd("rest-1", FRI_30, FRI_30);

    expect(ranges(repo.list().all())).toEqual([[THU_29, FRI_30]]);
  });

  it("lets the errors of changeRestEnd through", () => {
    repo.start(THU_29, SUN_01);

    expect(() => repo.changeEnd("rest-1", THU_29, FRI_30)).toThrow(
      /end key before the open day/,
    );
    expect(() => repo.changeEnd("rest-1", TUE_03, TUE_03)).toThrow(
      /does not cover the open day/,
    );
    expect(ranges(repo.list().all())).toEqual([[THU_29, SUN_01]]);
  });

  it("refuses a missing or deleted period", () => {
    repo.start(THU_29, SUN_01);
    repo.cancel("rest-1", THU_29);

    expectDataError(
      () => repo.changeEnd("rest-1", SUN_01, THU_29),
      "not_found",
    );
    expectDataError(
      () => repo.changeEnd("missing", SUN_01, THU_29),
      "not_found",
    );
  });
});
