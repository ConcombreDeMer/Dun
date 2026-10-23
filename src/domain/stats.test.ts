import { closeDay, type DayRecord } from "./dayRecord";
import type { DayTask } from "./dayStatus";
import { period } from "./period";
import type { RestPeriod } from "./rest";
import {
  DEFAULT_STATS_PREFERENCES,
  periodStats,
  type PeriodStatsInput,
  type StatsPreferences,
} from "./stats";

/*
 * Statistics of a period: completion, charge, open day and preferences.
 * The other rules are in `stats.days.test.ts`, `stats.streak.test.ts` and
 * `stats.inputs.test.ts`.
 */

/*
 * Scenario: the week of Monday 12 October 2026. The open day is Thursday the
 * 15th; Monday the 12th to Wednesday the 14th are closed.
 */
const MON_12 = "2026-10-12";
const TUE_13 = "2026-10-13";
const WED_14 = "2026-10-14";
const THU_15 = "2026-10-15";
const FRI_16 = "2026-10-16";

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

/* Every combination of the four preferences. */
const ALL_PREFERENCES: StatsPreferences[] = Array.from(
  { length: 16 },
  (_, bits) => ({
    includeToday: (bits & 1) !== 0,
    includeFutureDays: (bits & 2) !== 0,
    includeEmptyDays: (bits & 4) !== 0,
    includeRestDays: (bits & 8) !== 0,
  }),
);

describe("Préférences conservées : includeToday, includeFutureDays, includeEmptyDays et includeRestDays.", () => {
  it("par défaut, la journée ouverte et les journées vides comptent, les jours futurs et le Repos non", () => {
    expect(DEFAULT_STATS_PREFERENCES).toEqual({
      includeToday: true,
      includeFutureDays: false,
      includeEmptyDays: true,
      includeRestDays: false,
    });
    expect(Object.isFrozen(DEFAULT_STATS_PREFERENCES)).toBe(true);
  });

  it("sans préférences, periodStats applique les valeurs par défaut", () => {
    const input: PeriodStatsInput = {
      range: WEEK,
      records: RECORDS,
      tasks: TASKS,
      restPeriods: [],
      openKey: OPEN,
    };
    expect(periodStats(input)).toEqual(stats());
  });

  it("elles ne changent jamais la série ni les journées parfaites", () => {
    const records = [
      record(MON_12, true),
      rest(TUE_13, true, true),
      record(WED_14, true),
    ];
    const restPeriods: RestPeriod[] = [{ startKey: FRI_16, endKey: FRI_16 }];
    for (const preferences of ALL_PREFERENCES) {
      const result = stats(
        { records, restPeriods, tasks: tasksOf(THU_15, true) },
        preferences,
      );
      expect(result.perfectDays).toBe(2);
      expect(result.longestStreak).toBe(2);
    }
  });
});

describe("Complétion : un ratio global, tâches faites / tâches prévues sur toute la période.", () => {
  it("additionne toutes les tâches de la période, pas les taux de chaque jour", () => {
    /* 2/2 on Monday, 1/3 on Tuesday, 1/2 on Thursday: 4/7, not 61 %. */
    const result = stats();
    expect(result.planned).toBe(7);
    expect(result.done).toBe(4);
    expect(result.completion).toBe(4 / 7);
  });

  it("vaut null quand rien n'est prévu", () => {
    const result = stats({ records: [record(MON_12)], tasks: [] });
    expect(result.planned).toBe(0);
    expect(result.completion).toBeNull();
  });

  it("vaut 0 quand rien n'est fait et 1 quand tout est fait", () => {
    expect(
      stats({ records: [record(TUE_13, false, false)], tasks: [] }).completion,
    ).toBe(0);
    expect(
      stats({ records: [record(MON_12, true)], tasks: [] }).completion,
    ).toBe(1);
  });
});

describe("Charge : tâches prévues / journées retenues.", () => {
  it("divise les tâches prévues par les journées retenues", () => {
    /* Monday, Tuesday, Wednesday (empty) and Thursday: 7 tasks over 4 days. */
    const result = stats();
    expect(result.countedDays).toBe(4);
    expect(result.charge).toBe(7 / 4);
  });

  it("vaut null sans journée retenue", () => {
    const result = stats(
      { records: [record(MON_12)], tasks: [] },
      { includeEmptyDays: false },
    );
    expect(result.countedDays).toBe(0);
    expect(result.charge).toBeNull();
  });

  it("donne les nombres bruts, sans arrondi", () => {
    expect(stats({}, { includeToday: false })).toEqual({
      planned: 5,
      done: 3,
      completion: 3 / 5,
      charge: 5 / 3,
      countedDays: 3,
      perfectDays: 1,
      longestStreak: 1,
    });
  });
});

describe("L'objectif, la série et les statistiques s'appuient sur cet enregistrement, qui ne change plus.", () => {
  it("une journée close se lit dans son enregistrement, pas dans les tâches actuelles", () => {
    const closing = [
      { id: "a", date: TUE_13, name: "Courir", done: true, tags: [] },
      { id: "b", date: TUE_13, name: "Lire", done: false, tags: [] },
    ];
    const tuesday = closeDay(closing, [], TUE_13, OPEN);
    const before = stats({ records: [tuesday], tasks: closing });

    /* After midnight, the task is done late and another one is added. */
    const changed: DayTask[] = [
      { date: TUE_13, done: true },
      { date: TUE_13, done: true },
      { date: TUE_13, done: true },
    ];
    const after = stats({ records: [tuesday], tasks: changed });
    expect(after).toEqual(before);
    expect(after.planned).toBe(2);
    expect(after.done).toBe(1);
    expect(after.perfectDays).toBe(0);
  });

  it("les tâches datées d'une journée close sont ignorées, même sans enregistrement", () => {
    expect(
      stats({
        records: [],
        tasks: [...tasksOf(MON_12, true, true), ...tasksOf(OPEN, true)],
      }),
    ).toMatchObject({ planned: 1, done: 1, countedDays: 1 });
  });
});

describe("Journée ouverte : ses tâches actuelles comptent, jamais comme journée parfaite, et elle est neutre pour la série.", () => {
  it("par défaut, elle compte dans les tâches prévues, les tâches faites, la complétion et la charge", () => {
    const without = stats({}, { includeToday: false });
    const result = stats();
    expect(result.planned - without.planned).toBe(2);
    expect(result.done - without.done).toBe(1);
    expect(result.countedDays - without.countedDays).toBe(1);
    expect(result.completion).toBe(4 / 7);
    expect(result.charge).toBe(7 / 4);
  });

  it("avec includeToday désactivée, elle est exclue", () => {
    expect(stats({}, { includeToday: false })).toMatchObject({
      planned: 5,
      done: 3,
      countedDays: 3,
    });
  });

  it("sans tâche, elle compte comme une journée vide", () => {
    expect(stats({ tasks: [] })).toMatchObject({ planned: 5, countedDays: 4 });
    expect(stats({ tasks: [] }, { includeEmptyDays: false })).toMatchObject({
      planned: 5,
      countedDays: 2,
    });
  });
});

describe("Seules les journées closes à 100 % comptent pour l'objectif ; une journée en cours à 100 % reste provisoire.", () => {
  it("une journée ouverte à 100 % n'est pas une journée parfaite", () => {
    const records = [record(MON_12, true), record(TUE_13, true)];
    const open = stats({ records, tasks: tasksOf(OPEN, true, true) });
    expect(open.perfectDays).toBe(2);
    expect(open.done).toBe(4);
  });

  it("une journée ouverte à 100 % ne prolonge pas la série, et une incomplète ne la rompt pas", () => {
    const records = [record(TUE_13, true), record(WED_14, true)];
    expect(stats({ records, tasks: tasksOf(OPEN, true) }).longestStreak).toBe(
      2,
    );
    expect(stats({ records, tasks: tasksOf(OPEN, false) }).longestStreak).toBe(
      2,
    );
  });

  it("les journées parfaites sont les journées closes enregistrées réussies", () => {
    const records = [
      record(MON_12, true),
      record(TUE_13, true, false),
      record(WED_14, true, true, true),
    ];
    expect(stats({ records }).perfectDays).toBe(2);
  });
});
