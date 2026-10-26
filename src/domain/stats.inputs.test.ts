import { addDays } from "./date";
import type { DayRecord } from "./dayRecord";
import type { DayTask } from "./dayStatus";
import { period, periodBuckets, type DateRange } from "./period";
import type { RestPeriod } from "./rest";
import {
  DEFAULT_STATS_PREFERENCES,
  periodStats,
  type PeriodStatsInput,
  type StatsPreferences,
} from "./stats";

/*
 * Statistics of a period: what is left out, the slices of `periodBuckets`,
 * the arguments and the invalid inputs.
 */

/*
 * Scenario: the week of Monday 12 October 2026. The open day is Thursday the
 * 15th; Monday the 12th to Wednesday the 14th are closed.
 */
const SUN_11 = "2026-10-11";
const MON_12 = "2026-10-12";
const TUE_13 = "2026-10-13";
const WED_14 = "2026-10-14";
const THU_15 = "2026-10-15";
const FRI_16 = "2026-10-16";
const SAT_17 = "2026-10-17";
const SUN_18 = "2026-10-18";

const OPEN = THU_15;

const WEEK = period("week", MON_12);

/* A closed day, recorded with one task per `done` value. */
function record(key: string, ...done: boolean[]): DayRecord {
  const status =
    done.length === 0 ? "empty" : done.every(Boolean) ? "success" : "failed";
  return {
    key,
    status,
    tasks: done.map((value, index) => ({
      id: `${key}-${index}`,
      name: "Tâche",
      done: value,
      tags: [],
    })),
  };
}

/* The current tasks of the day `key`, one per `done` value. */
function tasksOf(key: string | null, ...done: boolean[]): DayTask[] {
  return done.map((value) => ({ date: key, done: value }));
}

/*
 * Monday: a success with 2 tasks. Tuesday: 1 task done out of 3. Wednesday:
 * empty. Thursday (open): 1 task done out of 2. Friday: 1 task planned.
 */
const RECORDS = [
  record(MON_12, true, true),
  record(TUE_13, true, false, false),
  record(WED_14),
];

const TASKS = [...tasksOf(THU_15, true, false), ...tasksOf(FRI_16, false)];

function stats(
  input: Partial<PeriodStatsInput> = {},
  preferences: Partial<StatsPreferences> = {},
) {
  return periodStats(
    {
      range: WEEK,
      records: RECORDS,
      tasks: TASKS,
      restPeriods: [],
      openKey: OPEN,
      ...input,
    },
    { ...DEFAULT_STATS_PREFERENCES, ...preferences },
  );
}

describe("Ce qui est ignoré", () => {
  const range: DateRange = { startKey: MON_12, endKey: WED_14 };

  it("une journée close sans enregistrement est ignorée partout et reste neutre pour la série", () => {
    const records = [record(MON_12, true), record(WED_14, true)];
    expect(stats({ range, records })).toEqual({
      planned: 2,
      done: 2,
      completion: 1,
      charge: 1,
      countedDays: 2,
      perfectDays: 2,
      longestStreak: 2,
    });
  });

  it("les enregistrements hors de la période sont ignorés", () => {
    const records = [
      record("2026-10-05", true),
      record(SUN_11, true, false),
      record(MON_12, true),
    ];
    expect(stats({ range, records })).toMatchObject({
      planned: 1,
      countedDays: 1,
      perfectDays: 1,
    });
  });

  it("les tâches de la Box sont ignorées", () => {
    const tasks = [...TASKS, ...tasksOf(null, true, false, false)];
    expect(stats({ tasks }, { includeFutureDays: true })).toEqual(
      stats({}, { includeFutureDays: true }),
    );
  });
});

describe("Avec les tranches de periodBuckets", () => {
  it("les tranches d'une semaine additionnent les tâches de la semaine", () => {
    const preferences = { includeFutureDays: true };
    const total = stats({}, preferences);
    const slices = periodBuckets(WEEK).map((range) =>
      stats({ range }, preferences),
    );
    expect(slices).toHaveLength(7);
    const sum = (field: "planned" | "done" | "countedDays" | "perfectDays") =>
      slices.reduce((value, slice) => value + slice[field], 0);
    expect(sum("planned")).toBe(total.planned);
    expect(sum("done")).toBe(total.done);
    expect(sum("countedDays")).toBe(total.countedDays);
    expect(sum("perfectDays")).toBe(total.perfectDays);
  });

  it("une tranche d'un jour donne la journée seule", () => {
    expect(stats({ range: { startKey: TUE_13, endKey: TUE_13 } })).toEqual({
      planned: 3,
      done: 1,
      completion: 1 / 3,
      charge: 3,
      countedDays: 1,
      perfectDays: 0,
      longestStreak: 0,
    });
  });

  it("une année entière, à cheval sur la journée ouverte", () => {
    const result = stats(
      { range: period("year", OPEN) },
      { includeFutureDays: true, includeEmptyDays: false },
    );
    expect(result).toMatchObject({ planned: 8, done: 4, countedDays: 4 });
  });
});

describe("Arguments", () => {
  it("periodStats ne modifie pas ses arguments", () => {
    const records = Object.freeze(
      RECORDS.map((day) =>
        Object.freeze({
          ...day,
          tasks: Object.freeze(day.tasks.map((task) => Object.freeze(task))),
        }),
      ),
    );
    const tasks = Object.freeze(TASKS.map((task) => Object.freeze(task)));
    const restPeriods = Object.freeze([
      Object.freeze({ startKey: FRI_16, endKey: FRI_16 }),
    ]);
    const range = Object.freeze({ ...WEEK });
    const preferences = Object.freeze({
      ...DEFAULT_STATS_PREFERENCES,
      includeFutureDays: true,
    });
    const input = Object.freeze({
      range,
      records,
      tasks,
      restPeriods,
      openKey: OPEN,
    });
    expect(periodStats(input, preferences).planned).toBe(7);
    expect(records).toEqual(RECORDS);
    expect(tasks).toEqual(TASKS);
    expect(range).toEqual(WEEK);
  });
});

describe("Entrées invalides", () => {
  it("refuse une clé invalide dans la période ou pour la journée ouverte", () => {
    expect(() =>
      stats({ range: { startKey: "2026-02-30", endKey: SUN_18 } }),
    ).toThrow(/^periodStats: invalid date key \(2026-02-30\)/);
    expect(() =>
      stats({ range: { startKey: MON_12, endKey: "18/10/2026" } }),
    ).toThrow(/^periodStats: invalid date key/);
    expect(() => stats({ openKey: "2026-10-32" })).toThrow(
      /^periodStats: invalid date key/,
    );
  });

  it("refuse une période qui finit avant de commencer", () => {
    expect(() =>
      stats({ range: { startKey: SUN_18, endKey: MON_12 } }),
    ).toThrow(/^periodStats: range ends before it starts/);
  });

  it("refuse une clé d'enregistrement invalide", () => {
    expect(() => stats({ records: [record("2026-13-01", true)] })).toThrow(
      /^periodStats: invalid date key/,
    );
  });

  it("refuse deux enregistrements de la même date", () => {
    expect(() =>
      stats({ records: [record(MON_12, true), record(MON_12, false)] }),
    ).toThrow(/^periodStats: duplicate record \(2026-10-12\)/);
  });

  it("refuse un enregistrement de la journée ouverte ou d'un jour futur", () => {
    expect(() => stats({ records: [record(OPEN, true)] })).toThrow(
      /^periodStats: the record is not closed/,
    );
    expect(() => stats({ records: [record(SAT_17, true)] })).toThrow(
      /^periodStats: the record is not closed/,
    );
  });

  it("refuse un statut enregistré qui n'est pas celui d'une journée close", () => {
    for (const status of ["provisional", "done", ""]) {
      const invalid = { ...record(MON_12, true), status } as DayRecord;
      expect(() => stats({ records: [invalid] })).toThrow(
        /^periodStats: invalid record status/,
      );
    }
  });

  it("refuse un Repos invalide quand la journée ouverte est lue", () => {
    const restPeriods: RestPeriod[] = [{ startKey: FRI_16, endKey: OPEN }];
    expect(() => stats({ restPeriods })).toThrow(RangeError);
  });

  it("accepte une période sur les derniers jours du calendrier", () => {
    const last = "9999-12-31";
    expect(
      periodStats({
        range: { startKey: addDays(last, -1), endKey: last },
        records: [record(addDays(last, -1), true)],
        tasks: tasksOf(last, false),
        restPeriods: [],
        openKey: last,
      }),
    ).toMatchObject({ planned: 2, done: 1, perfectDays: 1 });
  });
});
