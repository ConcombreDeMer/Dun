import { dayStatus, type DayStatus, type DayTask } from "./dayStatus";
import { goalProgress } from "./goal";
import type { RestPeriod } from "./rest";
import { nextStreak, streak, type DatedStatus } from "./streak";

/*
 * Scenario: October 2026. Monday the 12th, Tuesday the 13th, Wednesday the
 * 14th, Thursday the 15th, Friday the 16th, Saturday the 17th, Sunday the 18th.
 */
const MON_12 = "2026-10-12";
const TUE_13 = "2026-10-13";
const WED_14 = "2026-10-14";
const THU_15 = "2026-10-15";
const FRI_16 = "2026-10-16";
const SAT_17 = "2026-10-17";
const SUN_18 = "2026-10-18";

const WEEK = [MON_12, TUE_13, WED_14, THU_15, FRI_16, SAT_17, SUN_18];

/* Consecutive days from Monday the 12th, one status per day. */
function days(...statuses: DayStatus[]): DatedStatus[] {
  return statuses.map((status, index) => ({ key: WEEK[index], status }));
}

describe("L'objectif et les statistiques utilisent la même règle de série.", () => {
  const sequences: DayStatus[][] = [
    ["success", "success", "success"],
    ["success", "rest", "success", "failed", "success"],
    ["success", "empty", "rest", "success", "provisional"],
    ["rest", "rest", "success", "success", "success", "rest", "provisional"],
    ["failed", "success", "success", "empty"],
  ];

  it.each(sequences)(
    "streak et goalProgress donnent la même série (%#)",
    (...statuses) => {
      const list = days(...statuses);
      expect(
        goalProgress({ target: 14, confirmedKey: MON_12 }, list).streak,
      ).toBe(streak(list));
    },
  );
});

describe("Une journée vide hors Repos ou incomplète rompt la série.", () => {
  it("une journée vide remet la série à 0", () => {
    expect(streak(days("success", "success", "empty"))).toBe(0);
  });

  it("une journée incomplète remet la série à 0", () => {
    expect(streak(days("success", "success", "failed"))).toBe(0);
  });

  it("une réussite après la rupture repart à 1", () => {
    expect(streak(days("success", "success", "empty", "success"))).toBe(1);
    expect(streak(days("success", "failed", "success"))).toBe(1);
  });
});

describe("Le Repos activé pendant une journée ouverte rend cette journée entière neutre pour l'objectif et les statistiques.", () => {
  it("réussite, Repos, réussite donnent une série de 2", () => {
    expect(streak(days("success", "rest", "success"))).toBe(2);
  });

  it("un Repos seul ne compte pas", () => {
    expect(streak(days("rest"))).toBe(0);
    expect(streak(days("rest", "rest", "rest"))).toBe(0);
  });

  it("un Repos en fin de liste ne casse pas la série", () => {
    expect(streak(days("success", "success", "rest"))).toBe(2);
  });
});

describe("Seules les journées closes à 100 % comptent pour l'objectif ; une journée en cours à 100 % reste provisoire.", () => {
  it("une journée provisoire en fin de liste ne compte pas et ne casse pas la série", () => {
    expect(streak(days("success", "success", "provisional"))).toBe(2);
    expect(streak(days("provisional"))).toBe(0);
  });
});

describe("nextStreak", () => {
  it("une réussite ajoute un jour", () => {
    expect(nextStreak(0, "success")).toBe(1);
    expect(nextStreak(3, "success")).toBe(4);
  });

  it("le Repos et le provisoire gardent la série", () => {
    expect(nextStreak(3, "rest")).toBe(3);
    expect(nextStreak(3, "provisional")).toBe(3);
    expect(nextStreak(0, "rest")).toBe(0);
  });

  it("une journée vide ou incomplète remet à 0", () => {
    expect(nextStreak(3, "empty")).toBe(0);
    expect(nextStreak(3, "failed")).toBe(0);
  });

  it("refuse une série précédente négative ou non entière", () => {
    expect(() => nextStreak(-1, "success")).toThrow(RangeError);
    expect(() => nextStreak(1.5, "success")).toThrow(RangeError);
    expect(() => nextStreak(Number.NaN, "success")).toThrow(RangeError);
    expect(() => nextStreak(-1, "rest")).toThrow(/^nextStreak: /);
  });
});

describe("streak", () => {
  it("une liste vide donne 0", () => {
    expect(streak([])).toBe(0);
  });

  it("ne modifie pas ses arguments", () => {
    const list = Object.freeze(
      days("success", "rest", "success").map((day) => Object.freeze(day)),
    );
    expect(streak(list)).toBe(2);
    expect(list).toEqual(days("success", "rest", "success"));
  });
});

describe("Entrées invalides", () => {
  it("refuse une clé invalide", () => {
    expect(() => streak([{ key: "2026-02-30", status: "success" }])).toThrow(
      /^streak: invalid date key/,
    );
    expect(() =>
      streak([
        { key: MON_12, status: "success" },
        { key: "13/10/2026", status: "success" },
      ]),
    ).toThrow(RangeError);
  });

  it("refuse un jour manquant", () => {
    expect(() =>
      streak([
        { key: MON_12, status: "success" },
        { key: WED_14, status: "success" },
      ]),
    ).toThrow(/^streak: days are not consecutive/);
  });

  it("refuse des jours dans le désordre", () => {
    expect(() =>
      streak([
        { key: TUE_13, status: "success" },
        { key: MON_12, status: "success" },
      ]),
    ).toThrow(RangeError);
  });

  it("refuse un jour en double", () => {
    expect(() =>
      streak([
        { key: MON_12, status: "success" },
        { key: MON_12, status: "success" },
      ]),
    ).toThrow(RangeError);
  });
});

describe("Avec les statuts calculés par dayStatus", () => {
  it("des tâches et un Repos réels donnent la série attendue", () => {
    /* Open day: Saturday the 17th. */
    const openKey = SAT_17;
    const tasks: DayTask[] = [
      { date: MON_12, done: true },
      { date: TUE_13, done: true },
      { date: TUE_13, done: false },
      { date: WED_14, done: true },
      /* Thursday is a rest day, its unfinished task does not count. */
      { date: THU_15, done: false },
      { date: FRI_16, done: true },
      { date: FRI_16, done: true },
      /* The open day is done, but stays provisional. */
      { date: SAT_17, done: true },
      { date: null, done: false },
    ];
    const rest: RestPeriod[] = [{ startKey: THU_15, endKey: THU_15 }];

    const list: DatedStatus[] = WEEK.slice(0, 6).map((key) => ({
      key,
      status: dayStatus(tasks, rest, key, openKey),
    }));
    expect(list.map((day) => day.status)).toEqual([
      "success",
      "failed",
      "success",
      "rest",
      "success",
      "provisional",
    ]);
    expect(streak(list)).toBe(2);
  });
});
