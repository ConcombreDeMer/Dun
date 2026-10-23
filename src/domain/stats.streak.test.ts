import type { DayRecord } from "./dayRecord";
import type { DayTask } from "./dayStatus";
import { period, type DateRange } from "./period";
import {
  DEFAULT_STATS_PREFERENCES,
  periodStats,
  type PeriodStatsInput,
  type StatsPreferences,
} from "./stats";
import { streak } from "./streak";

/* Statistics of a period: the longest streak. */

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

/* A closed rest day, recorded with its tasks. */
function rest(key: string, ...done: boolean[]): DayRecord {
  return { ...record(key, ...done), status: "rest" };
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

describe("Une journée vide hors Repos ou incomplète rompt la série.", () => {
  it("une journée vide rompt la série, que includeEmptyDays soit activée ou non", () => {
    const records = [
      record(MON_12, true),
      record(TUE_13),
      record(WED_14, true),
    ];
    for (const includeEmptyDays of [false, true]) {
      expect(stats({ records }, { includeEmptyDays }).longestStreak).toBe(1);
    }
  });

  it("une journée incomplète rompt la série", () => {
    const records = [
      record(MON_12, true),
      record(TUE_13, true, false),
      record(WED_14, true),
    ];
    expect(stats({ records }).longestStreak).toBe(1);
  });
});

describe("Série d'une période : la plus longue suite de journées réussies à l'intérieur de la période.", () => {
  /*
   * October 2026, open day the 15th: 3 successes, a failure, then 4
   * successes around a rest, an empty day and a last success.
   */
  const october = [
    record("2026-10-01", true),
    record("2026-10-02", true),
    record("2026-10-03", true),
    record("2026-10-04", false),
    record("2026-10-05", true),
    rest("2026-10-06"),
    record("2026-10-07", true),
    record("2026-10-08", true),
    record("2026-10-09", true),
    record("2026-10-10"),
    record("2026-10-11", true),
  ];
  const MONTH = period("month", "2026-10-15");

  it("garde la plus longue suite, pas la dernière", () => {
    expect(
      stats({ range: MONTH, records: october, tasks: [] }).longestStreak,
    ).toBe(4);
  });

  it("ne reporte rien d'avant la période", () => {
    const records = [
      record("2026-10-09", true),
      record("2026-10-10", true),
      record(SUN_11, true),
      record(MON_12, true),
      record(TUE_13, false),
    ];
    expect(stats({ records, tasks: [] }).longestStreak).toBe(1);
    expect(
      stats({
        range: { startKey: "2026-10-09", endKey: SUN_18 },
        records,
        tasks: [],
      }).longestStreak,
    ).toBe(4);
  });

  it("vaut 0 sans journée réussie", () => {
    expect(stats({ records: [record(MON_12, false)] }).longestStreak).toBe(0);
    expect(stats({ records: [] }).longestStreak).toBe(0);
  });
});

describe("L'objectif et les statistiques utilisent la même règle de série.", () => {
  it("sur une série jamais rompue, longestStreak vaut streak()", () => {
    const records = [
      rest("2026-10-01"),
      record("2026-10-02", true),
      record("2026-10-03", true, true),
      rest("2026-10-04", false),
      record("2026-10-05", true),
      rest("2026-10-06"),
      record("2026-10-07", true),
    ];
    const range: DateRange = { startKey: "2026-10-01", endKey: "2026-10-07" };
    const statuses = records.map(({ key, status }) => ({ key, status }));
    expect(stats({ range, records, tasks: [] }).longestStreak).toBe(
      streak(statuses),
    );
    expect(streak(statuses)).toBe(4);
  });
});
