import { isPostpone, moveTask, type MovableTask } from "./postpone";

/*
 * Scenario: October 2026. The open day is Thursday the 15th; Wednesday the
 * 14th is closed.
 */
const TUE_13 = "2026-10-13";
const WED_14 = "2026-10-14";
const THU_15 = "2026-10-15";
const FRI_16 = "2026-10-16";
const SAT_17 = "2026-10-17";

const OPEN = THU_15;

function task(overrides: Partial<MovableTask> = {}): MovableTask {
  return { date: WED_14, done: false, delayCount: 0, ...overrides };
}

describe("Reporter une tâche, c'est déplacer une tâche non faite d'une journée close vers la journée ouverte ou plus tard ; son nombre de reports augmente d'un.", () => {
  it("une tâche non faite du mercredi reportée au jeudi gagne un report", () => {
    expect(isPostpone(task(), THU_15, OPEN)).toBe(true);
    expect(moveTask(task(), THU_15, OPEN)).toEqual({
      date: THU_15,
      done: false,
      delayCount: 1,
    });
  });

  it("une tâche non faite du mercredi reportée au samedi gagne un report", () => {
    expect(isPostpone(task(), SAT_17, OPEN)).toBe(true);
    expect(moveTask(task({ delayCount: 3 }), SAT_17, OPEN)).toEqual({
      date: SAT_17,
      done: false,
      delayCount: 4,
    });
  });

  it("deux reports successifs donnent 2", () => {
    /* Postponed on Thursday to Thursday, then left undone: on Friday, it is
     * postponed again. */
    const once = moveTask(task(), THU_15, THU_15);
    const twice = moveTask(once, FRI_16, FRI_16);
    expect(twice).toEqual({ date: FRI_16, done: false, delayCount: 2 });
  });
});

describe("Changer la date d'une autre tâche n'est pas un report.", () => {
  it("une tâche faite d'une journée close", () => {
    const done = task({ done: true });
    expect(isPostpone(done, THU_15, OPEN)).toBe(false);
    expect(moveTask(done, THU_15, OPEN)).toEqual({
      date: THU_15,
      done: true,
      delayCount: 0,
    });
  });

  it("une tâche de la journée ouverte", () => {
    const today = task({ date: THU_15 });
    expect(isPostpone(today, SAT_17, OPEN)).toBe(false);
    expect(moveTask(today, SAT_17, OPEN).delayCount).toBe(0);
  });

  it("une tâche future", () => {
    const future = task({ date: FRI_16, delayCount: 1 });
    expect(isPostpone(future, SAT_17, OPEN)).toBe(false);
    expect(moveTask(future, SAT_17, OPEN)).toEqual({
      date: SAT_17,
      done: false,
      delayCount: 1,
    });
  });

  it("une tâche de la Box", () => {
    const box = task({ date: null });
    expect(isPostpone(box, THU_15, OPEN)).toBe(false);
    expect(moveTask(box, THU_15, OPEN)).toEqual({
      date: THU_15,
      done: false,
      delayCount: 0,
    });
  });

  it("une cible dans la Box", () => {
    expect(isPostpone(task(), null, OPEN)).toBe(false);
    expect(moveTask(task(), null, OPEN)).toEqual({
      date: null,
      done: false,
      delayCount: 0,
    });
  });

  it("une cible dans une journée close", () => {
    expect(isPostpone(task(), TUE_13, OPEN)).toBe(false);
    expect(moveTask(task(), TUE_13, OPEN)).toEqual({
      date: TUE_13,
      done: false,
      delayCount: 0,
    });
  });
});

describe("moveTask", () => {
  it("conserve les autres champs de la tâche", () => {
    const full = { ...task(), id: "a1", name: "Courir", tags: ["sport"] };
    const moved = moveTask(full, THU_15, OPEN);
    expect(moved).toEqual({
      id: "a1",
      name: "Courir",
      tags: ["sport"],
      date: THU_15,
      done: false,
      delayCount: 1,
    });
    const typed: string = moved.name;
    expect(typed).toBe("Courir");
  });

  it("ne modifie pas ses arguments", () => {
    const frozen = Object.freeze(task());
    const moved = moveTask(frozen, THU_15, OPEN);
    expect(moved).not.toBe(frozen);
    expect(frozen).toEqual(task());
    expect(isPostpone(frozen, THU_15, OPEN)).toBe(true);
  });
});

describe("Entrées invalides", () => {
  it("isPostpone refuse une clé invalide", () => {
    expect(() =>
      isPostpone(task({ date: "2026-02-30" }), THU_15, OPEN),
    ).toThrow(/^isPostpone: invalid date key/);
    expect(() => isPostpone(task(), "15/10/2026", OPEN)).toThrow(RangeError);
    expect(() => isPostpone(task(), THU_15, "2026-13-01")).toThrow(
      /^isPostpone: /,
    );
  });

  it("moveTask refuse une clé invalide", () => {
    expect(() => moveTask(task({ date: "2026-10-32" }), THU_15, OPEN)).toThrow(
      /^moveTask: invalid date key/,
    );
    expect(() => moveTask(task(), "", OPEN)).toThrow(/^moveTask: /);
    expect(() => moveTask(task(), THU_15, "2026-10-1")).toThrow(RangeError);
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "moveTask refuse un nombre de reports de %p",
    (delayCount) => {
      expect(() => moveTask(task({ delayCount }), THU_15, OPEN)).toThrow(
        /^moveTask: delayCount must be a non-negative integer/,
      );
    },
  );
});
