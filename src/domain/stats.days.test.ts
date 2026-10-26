import type { DayRecord } from "./dayRecord";
import type { DayTask } from "./dayStatus";
import { period, type DateRange } from "./period";
import type { RestPeriod } from "./rest";
import {
  DEFAULT_STATS_PREFERENCES,
  periodStats,
  type PeriodStatsInput,
  type StatsPreferences,
} from "./stats";

/* Statistics of a period: future days, rest days and empty days. */

/*
 * Scenario: the week of Monday 12 October 2026. The open day is Thursday the
 * 15th; Monday the 12th to Wednesday the 14th are closed.
 */
const MON_12 = "2026-10-12";
const TUE_13 = "2026-10-13";
const WED_14 = "2026-10-14";
const THU_15 = "2026-10-15";
const FRI_16 = "2026-10-16";
const SAT_17 = "2026-10-17";

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

describe("Jours futurs : includeFutureDays est désactivée par défaut.", () => {
  it("par défaut, les jours futurs sont exclus", () => {
    const result = stats();
    expect(result.planned).toBe(7);
    expect(result.countedDays).toBe(4);
  });

  it("activée, elle fait compter les tâches prévues des jours futurs, comme la journée ouverte", () => {
    /* Friday adds 1 task; Saturday and Sunday are empty. */
    expect(stats({}, { includeFutureDays: true })).toMatchObject({
      planned: 8,
      done: 4,
      countedDays: 7,
      perfectDays: 1,
      longestStreak: 1,
    });
    expect(
      stats({}, { includeFutureDays: true, includeEmptyDays: false }),
    ).toMatchObject({ planned: 8, countedDays: 4 });
  });

  it("un jour futur fait n'est ni une journée parfaite ni un jour de série", () => {
    const records = [record(MON_12, true), record(TUE_13, true)];
    const tasks = [...tasksOf(FRI_16, true), ...tasksOf(SAT_17, true)];
    const result = stats({ records, tasks }, { includeFutureDays: true });
    expect(result.done).toBe(4);
    expect(result.perfectDays).toBe(2);
    expect(result.longestStreak).toBe(2);
  });

  it("le jour futur et la journée ouverte se règlent séparément", () => {
    expect(
      stats({}, { includeToday: false, includeFutureDays: true }),
    ).toMatchObject({ planned: 6, done: 3, countedDays: 6 });
  });
});

describe("Le Repos activé pendant une journée ouverte rend cette journée entière neutre pour l'objectif et les statistiques.", () => {
  const records = [
    record(MON_12, true, true),
    rest(TUE_13, true, false),
    record(WED_14, true),
  ];
  const restPeriods: RestPeriod[] = [{ startKey: OPEN, endKey: FRI_16 }];

  it("par défaut, une journée de Repos enregistrée, ouverte ou future ne compte nulle part", () => {
    const result = stats(
      { records, restPeriods },
      { includeFutureDays: true, includeEmptyDays: false },
    );
    /* Only Monday and Wednesday count: Tuesday, Thursday and Friday rest. */
    expect(result).toEqual({
      planned: 3,
      done: 3,
      completion: 1,
      charge: 3 / 2,
      countedDays: 2,
      perfectDays: 2,
      longestStreak: 2,
    });
  });

  it("un Repos sans tâche ne compte pas comme une journée vide", () => {
    const result = stats({
      records: [rest(MON_12)],
      tasks: [],
      restPeriods,
    });
    expect(result.countedDays).toBe(0);
    expect(result.charge).toBeNull();
  });
});

describe("Dans les statistiques, une préférence désactivée par défaut permet d'inclure les tâches des journées de Repos ; elles ne comptent jamais pour la série ni pour les journées parfaites.", () => {
  const restPeriods: RestPeriod[] = [{ startKey: OPEN, endKey: FRI_16 }];

  it("la préférence est désactivée par défaut", () => {
    expect(DEFAULT_STATS_PREFERENCES.includeRestDays).toBe(false);
  });

  it("activée, les tâches d'un Repos enregistré comptent dans les tâches prévues, faites, la complétion et la charge", () => {
    const records = [record(MON_12, true, true), rest(TUE_13, true, false)];
    const off = stats({ records, tasks: [] }, { includeEmptyDays: false });
    const on = stats(
      { records, tasks: [] },
      { includeEmptyDays: false, includeRestDays: true },
    );
    expect(off).toMatchObject({ planned: 2, done: 2, countedDays: 1 });
    expect(on).toMatchObject({ planned: 4, done: 3, countedDays: 2 });
    expect(on.completion).toBe(3 / 4);
    expect(on.charge).toBe(2);
  });

  it("activée, les tâches d'une journée ouverte ou future en Repos comptent aussi", () => {
    const result = stats(
      { records: [], restPeriods },
      {
        includeFutureDays: true,
        includeEmptyDays: false,
        includeRestDays: true,
      },
    );
    expect(result).toMatchObject({ planned: 3, done: 1, countedDays: 2 });
  });

  it("une journée de Repos entièrement faite n'est jamais une journée parfaite", () => {
    const records = [rest(MON_12, true, true), rest(TUE_13, true)];
    const result = stats({ records, tasks: [] }, { includeRestDays: true });
    expect(result.done).toBe(3);
    expect(result.perfectDays).toBe(0);
    expect(result.longestStreak).toBe(0);
  });

  it("le Repos reste neutre pour la série : il ne la prolonge pas et ne la rompt pas", () => {
    const records = [
      record(MON_12, true),
      rest(TUE_13, true, false),
      record(WED_14, true),
    ];
    for (const includeRestDays of [false, true]) {
      expect(stats({ records }, { includeRestDays }).longestStreak).toBe(2);
    }
  });

  it("activée, un Repos sans tâche compte dans la charge avec 0 tâche", () => {
    const result = stats(
      { records: [record(MON_12, true, true), rest(TUE_13)], tasks: [] },
      { includeEmptyDays: false, includeRestDays: true },
    );
    expect(result).toMatchObject({ planned: 2, countedDays: 2, charge: 1 });
  });
});

describe("Journée vide (close, hors Repos, sans tâche) : elle compte dans la charge, avec 0 tâche.", () => {
  const range: DateRange = { startKey: MON_12, endKey: TUE_13 };
  const records = [record(MON_12, true, true), record(TUE_13)];

  it("par défaut, elle entre dans la charge avec 0 tâche", () => {
    expect(stats({ range, records })).toMatchObject({
      planned: 2,
      countedDays: 2,
      charge: 1,
    });
  });

  it("avec includeEmptyDays désactivée, elle sort de la charge", () => {
    expect(
      stats({ range, records }, { includeEmptyDays: false }),
    ).toMatchObject({ planned: 2, countedDays: 1, charge: 2 });
  });
});
