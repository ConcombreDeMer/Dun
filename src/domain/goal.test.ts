import { dayStatus, type DayStatus, type DayTask } from "./dayStatus";
import { GOAL_TARGETS, goalProgress, type Goal, type GoalTarget } from "./goal";
import { addDays } from "./date";
import type { DatedStatus } from "./streak";

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

/* Consecutive days from `startKey`, one status per day. */
function days(startKey: string, ...statuses: DayStatus[]): DatedStatus[] {
  return statuses.map((status, index) => ({
    key: addDays(startKey, index),
    status,
  }));
}

describe("Le premier objectif correspond à la cible choisie à l'onboarding : 1, 2, 3, 4, 7 ou 14 journées réussies.", () => {
  it("les cibles proposées sont 1, 2, 3, 4, 7 et 14", () => {
    expect(GOAL_TARGETS).toEqual([1, 2, 3, 4, 7, 14]);
  });

  it.each(GOAL_TARGETS)(
    "un objectif de %i est atteint le jour où la série atteint la cible",
    (target) => {
      const statuses: DayStatus[] = Array.from(
        { length: target + 2 },
        () => "success",
      );
      const list = days(MON_12, ...statuses);
      const progress = goalProgress({ target, confirmedKey: MON_12 }, list);
      expect(progress).toEqual({
        target,
        streak: target + 2,
        achievedKey: addDays(MON_12, target - 1),
      });
    },
  );

  it.each(GOAL_TARGETS)(
    "un objectif de %i n'est pas atteint à une journée près",
    (target) => {
      const statuses: DayStatus[] = Array.from(
        { length: target - 1 },
        () => "success",
      );
      const list = days(MON_12, ...statuses);
      const progress = goalProgress({ target, confirmedKey: MON_12 }, list);
      expect(progress.achievedKey).toBeNull();
      expect(progress.streak).toBe(target - 1);
    },
  );

  it.each([0, 5, 15, -1, 1.5, Number.NaN])("refuse la cible %p", (target) => {
    const goal = { target, confirmedKey: MON_12 } as unknown as Goal;
    expect(() => goalProgress(goal, [])).toThrow(
      /^goalProgress: invalid target/,
    );
  });
});

describe("La journée où l'objectif est confirmé peut compter si elle se clôt à 100 %, même si des tâches ont été faites avant cette confirmation.", () => {
  const goal: Goal = { target: 1, confirmedKey: THU_15 };

  it("un objectif de 1 confirmé le jeudi est atteint le jeudi si le jeudi est réussi", () => {
    const list = days(THU_15, "success");
    expect(goalProgress(goal, list)).toEqual({
      target: 1,
      streak: 1,
      achievedKey: THU_15,
    });
  });

  it("des tâches du jeudi déjà cochées avant la confirmation comptent", () => {
    /* Both tasks were checked on Thursday morning, the goal was confirmed at noon. */
    const tasks: DayTask[] = [
      { date: THU_15, done: true },
      { date: THU_15, done: true },
    ];
    const list: DatedStatus[] = [
      { key: THU_15, status: dayStatus(tasks, [], THU_15, FRI_16) },
    ];
    expect(goalProgress(goal, list).achievedKey).toBe(THU_15);
  });

  it("les jours antérieurs à la confirmation ne comptent pas, même réussis", () => {
    const list = days(MON_12, "success", "success", "success", "failed");
    expect(goalProgress({ target: 1, confirmedKey: THU_15 }, list)).toEqual({
      target: 1,
      streak: 0,
      achievedKey: null,
    });

    const withThursday = days(
      MON_12,
      "success",
      "success",
      "success",
      "empty",
      "success",
    );
    expect(
      goalProgress({ target: 2, confirmedKey: THU_15 }, withThursday),
    ).toEqual({ target: 2, streak: 1, achievedKey: null });
  });

  it("sans jour depuis la confirmation, la série est nulle", () => {
    expect(goalProgress(goal, [])).toEqual({
      target: 1,
      streak: 0,
      achievedKey: null,
    });
    expect(goalProgress(goal, days(MON_12, "success", "success"))).toEqual({
      target: 1,
      streak: 0,
      achievedKey: null,
    });
  });
});

describe("La première réussite datée et la série courante sont distinctes.", () => {
  const goal: Goal = { target: 2, confirmedKey: TUE_13 };

  it("après un échec, la date d'atteinte reste et la série repart à 0", () => {
    const list = days(TUE_13, "success", "success", "failed");
    expect(goalProgress(goal, list)).toEqual({
      target: 2,
      streak: 0,
      achievedKey: WED_14,
    });
  });

  it("quand la série reprend, la date d'atteinte ne change pas", () => {
    const list = days(
      TUE_13,
      "success",
      "success",
      "failed",
      "success",
      "success",
    );
    expect(goalProgress(goal, list)).toEqual({
      target: 2,
      streak: 2,
      achievedKey: WED_14,
    });
  });

  it("la série peut dépasser la cible", () => {
    const list = days(TUE_13, "success", "success", "success", "success");
    expect(goalProgress(goal, list)).toEqual({
      target: 2,
      streak: 4,
      achievedKey: WED_14,
    });
  });
});

describe("Seules les journées closes à 100 % comptent pour l'objectif ; une journée en cours à 100 % reste provisoire.", () => {
  it("la journée ouverte à 100 % n'atteint pas l'objectif", () => {
    const tasks: DayTask[] = [
      { date: TUE_13, done: true },
      { date: WED_14, done: true },
    ];
    /* Wednesday is the open day. */
    const list: DatedStatus[] = [TUE_13, WED_14].map((key) => ({
      key,
      status: dayStatus(tasks, [], key, WED_14),
    }));
    expect(list[1].status).toBe("provisional");
    expect(goalProgress({ target: 2, confirmedKey: TUE_13 }, list)).toEqual({
      target: 2,
      streak: 1,
      achievedKey: null,
    });
  });
});

describe("Le Repos est neutre pour l'objectif", () => {
  it("un Repos entre deux réussites permet d'atteindre un objectif de 2", () => {
    const list = days(TUE_13, "success", "rest", "success");
    expect(goalProgress({ target: 2, confirmedKey: TUE_13 }, list)).toEqual({
      target: 2,
      streak: 2,
      achievedKey: THU_15,
    });
  });

  it("un Repos le jour de confirmation ne compte pas", () => {
    const list = days(TUE_13, "rest", "success");
    expect(goalProgress({ target: 1, confirmedKey: TUE_13 }, list)).toEqual({
      target: 1,
      streak: 1,
      achievedKey: WED_14,
    });
  });
});

describe("goalProgress ne modifie pas ses arguments", () => {
  it("accepte un objectif et des jours figés", () => {
    const goal: Goal = Object.freeze({
      target: 2 as GoalTarget,
      confirmedKey: TUE_13,
    });
    const list = Object.freeze(
      days(MON_12, "failed", "success", "success").map((day) =>
        Object.freeze(day),
      ),
    );
    expect(goalProgress(goal, list)).toEqual({
      target: 2,
      streak: 2,
      achievedKey: WED_14,
    });
    expect(goal).toEqual({ target: 2, confirmedKey: TUE_13 });
    expect(list).toEqual(days(MON_12, "failed", "success", "success"));
  });
});

describe("Entrées invalides", () => {
  it("refuse une clé de confirmation invalide", () => {
    expect(() =>
      goalProgress({ target: 1, confirmedKey: "2026-02-30" }, []),
    ).toThrow(/^goalProgress: invalid date key/);
  });

  it("refuse une liste qui commence après le jour de confirmation", () => {
    const list = days(WED_14, "success", "success");
    expect(() =>
      goalProgress({ target: 1, confirmedKey: TUE_13 }, list),
    ).toThrow(/^goalProgress: confirmation day missing/);
  });

  it("refuse des jours non consécutifs", () => {
    const goal: Goal = { target: 1, confirmedKey: TUE_13 };
    const missing: DatedStatus[] = [
      { key: TUE_13, status: "success" },
      { key: THU_15, status: "success" },
    ];
    const duplicate: DatedStatus[] = [
      { key: TUE_13, status: "success" },
      { key: TUE_13, status: "success" },
    ];
    const unordered: DatedStatus[] = [
      { key: TUE_13, status: "success" },
      { key: SAT_17, status: "success" },
      { key: FRI_16, status: "success" },
    ];
    expect(() => goalProgress(goal, missing)).toThrow(
      /^goalProgress: days are not consecutive/,
    );
    expect(() => goalProgress(goal, duplicate)).toThrow(RangeError);
    expect(() => goalProgress(goal, unordered)).toThrow(RangeError);
  });

  it("refuse une clé invalide après le jour de confirmation", () => {
    const list: DatedStatus[] = [
      { key: TUE_13, status: "success" },
      { key: "2026-10-32", status: "success" },
    ];
    expect(() =>
      goalProgress({ target: 1, confirmedKey: TUE_13 }, list),
    ).toThrow(/^goalProgress: invalid date key/);
  });
});
