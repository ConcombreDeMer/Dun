import {
  closeDay,
  recordDiffers,
  type ClosingTask,
  type DayRecord,
} from "./dayRecord";
import { moveTask } from "./postpone";
import type { RestPeriod } from "./rest";
import { streak, type DatedStatus } from "./streak";

/*
 * Scenario: October 2026. The open day is Thursday the 15th; Tuesday the 13th
 * and Wednesday the 14th are closed.
 */
const TUE_13 = "2026-10-13";
const WED_14 = "2026-10-14";
const THU_15 = "2026-10-15";
const FRI_16 = "2026-10-16";

const OPEN = THU_15;

const SPORT = { name: "Sport", color: "#2E7D32" };
const WORK = { name: "Travail", color: "#1565C0" };

/* Wednesday: three tasks, one of them not done. */
function wednesday(): ClosingTask[] {
  return [
    { id: "a", date: WED_14, name: "Courir", done: true, tags: [SPORT] },
    {
      id: "b",
      date: WED_14,
      name: "Rapport",
      done: false,
      tags: [WORK, SPORT],
    },
    { id: "c", date: WED_14, name: "Lire", done: true, tags: [] },
  ];
}

/* The tasks of the week around Wednesday: other days and the Box. */
function others(): ClosingTask[] {
  return [
    { id: "t", date: TUE_13, name: "Appeler", done: true, tags: [] },
    { id: "j", date: THU_15, name: "Courses", done: false, tags: [] },
    { id: "x", date: null, name: "Idée", done: false, tags: [WORK] },
  ];
}

function closeWednesday(tasks = [...wednesday(), ...others()]): DayRecord {
  return closeDay(tasks, [], WED_14, OPEN);
}

/* All the tasks, with the unfinished task of Wednesday postponed to `targetKey`. */
function postponeB(targetKey: string): ClosingTask[] {
  return [...wednesday(), ...others()].map((task) =>
    task.id === "b"
      ? moveTask({ ...task, delayCount: 0 }, targetKey, OPEN)
      : task,
  );
}

const WEDNESDAY_RECORD: DayRecord = {
  key: WED_14,
  status: "failed",
  tasks: [
    { id: "a", name: "Courir", done: true, tags: [SPORT] },
    { id: "b", name: "Rapport", done: false, tags: [WORK, SPORT] },
    { id: "c", name: "Lire", done: true, tags: [] },
  ],
};

describe("À sa clôture, une journée est enregistrée avec ses tâches, leur état et leurs tags.", () => {
  it("enregistre le statut et la photo des tâches, dans l'ordre de la journée", () => {
    expect(closeWednesday()).toEqual(WEDNESDAY_RECORD);
  });

  it("une journée entièrement faite est réussie", () => {
    const tasks = wednesday().map((task) => ({ ...task, done: true }));
    expect(closeWednesday(tasks).status).toBe("success");
  });

  it("garde seulement les tâches du jour : ni la Box, ni les autres jours", () => {
    const record = closeWednesday([
      ...others(),
      wednesday()[2],
      ...others(),
      wednesday()[0],
    ]);
    expect(record.tasks.map((task) => task.id)).toEqual(["c", "a"]);
  });

  it("ne garde pas les autres champs de la tâche", () => {
    const tasks = wednesday().map((task) => ({
      ...task,
      delayCount: 2,
      description: "Détail",
    }));
    expect(closeWednesday(tasks)).toEqual(WEDNESDAY_RECORD);
  });

  it("une journée de Repos est enregistrée comme Repos, avec ses tâches", () => {
    const rest: RestPeriod[] = [{ startKey: WED_14, endKey: WED_14 }];
    const record = closeDay(wednesday(), rest, WED_14, OPEN);
    expect(record.status).toBe("rest");
    expect(record.tasks).toEqual(WEDNESDAY_RECORD.tasks);
  });

  it("une journée vide est enregistrée vide", () => {
    expect(closeDay(others(), [], WED_14, OPEN)).toEqual({
      key: WED_14,
      status: "empty",
      tasks: [],
    });
  });

  it("refuse une journée ouverte ou future", () => {
    expect(() => closeDay(wednesday(), [], THU_15, OPEN)).toThrow(
      /^closeDay: the day is not closed/,
    );
    expect(() => closeDay(wednesday(), [], FRI_16, OPEN)).toThrow(RangeError);
  });
});

describe("L'objectif, la série et les statistiques s'appuient sur cet enregistrement, qui ne change plus.", () => {
  it("la série calculée sur les statuts enregistrés ne bouge pas après une modification", () => {
    const tuesday = closeDay(others(), [], TUE_13, OPEN);
    const records = [tuesday, closeWednesday()];
    const statuses = (): DatedStatus[] =>
      records.map(({ key, status }) => ({ key, status }));
    expect(streak(statuses())).toBe(0);

    /* The unfinished task is done late: the day would now be a success. */
    const late = [...wednesday(), ...others()].map((task) =>
      task.id === "b" ? { ...task, done: true } : task,
    );
    const recomputed = closeDay(late, [], WED_14, OPEN);
    expect(recomputed.status).toBe("success");
    expect(streak([tuesday, recomputed])).toBe(2);

    /* The records stay as they were: the streak does not move. */
    expect(recordDiffers(records[1], late)).toBe(true);
    expect(streak(statuses())).toBe(0);
  });
});

describe("Les tâches d'une journée close restent modifiables, sans verrouillage ; ces modifications ne changent pas son enregistrement.", () => {
  const record = Object.freeze(closeWednesday());

  it.each<[string, (tasks: ClosingTask[]) => ClosingTask[]]>([
    [
      "cocher en retard",
      (tasks) =>
        tasks.map((task) => (task.id === "b" ? { ...task, done: true } : task)),
    ],
    [
      "décocher",
      (tasks) =>
        tasks.map((task) =>
          task.id === "a" ? { ...task, done: false } : task,
        ),
    ],
    ["supprimer", (tasks) => tasks.filter((task) => task.id !== "c")],
    [
      "ajouter",
      (tasks) => [
        ...tasks,
        { id: "d", date: WED_14, name: "Ranger", done: false, tags: [] },
      ],
    ],
  ])("%s : la journée diffère, l'enregistrement reste le même", (_, change) => {
    const changed = change(wednesday());
    expect(recordDiffers(record, changed)).toBe(true);
    expect(record).toEqual(WEDNESDAY_RECORD);
  });

  it("reporter : la journée ne diffère pas, l'enregistrement reste le même", () => {
    const changed = [...wednesday(), ...others()].map((task) =>
      task.id === "b"
        ? moveTask({ ...task, delayCount: 0 }, THU_15, OPEN)
        : task,
    );
    expect(recordDiffers(record, changed)).toBe(false);
    expect(record).toEqual(WEDNESDAY_RECORD);
  });

  it("un tag renommé ou supprimé après la clôture reste tel quel", () => {
    const tag = { name: "Sport", color: "#2E7D32" };
    const tasks: ClosingTask[] = [
      { id: "a", date: WED_14, name: "Courir", done: true, tags: [tag] },
    ];
    const closed = closeDay(tasks, [], WED_14, OPEN);

    tag.name = "Course";
    tag.color = "#000000";
    tasks[0].tags = [];

    expect(closed.tasks[0].tags).toEqual([{ name: "Sport", color: "#2E7D32" }]);
  });
});

describe("Une journée dont les tâches ou leur état ont changé après sa clôture, hors report, le signale ; son enregistrement reste consultable.", () => {
  const record = closeWednesday();

  it("les mêmes tâches dans le même état ne signalent rien", () => {
    expect(recordDiffers(record, [...wednesday(), ...others()])).toBe(false);
  });

  it("renommer, changer les tags ou réordonner ne signale rien", () => {
    const [a, b, c] = wednesday();
    const changed: ClosingTask[] = [
      c,
      { ...a, name: "Courir 10 km" },
      { ...b, tags: [] },
    ];
    expect(recordDiffers(record, changed)).toBe(false);
  });

  it("supprimer une tâche faite et en ajouter une autre faite est signalé", () => {
    const changed: ClosingTask[] = [
      ...wednesday().filter((task) => task.id !== "c"),
      { id: "d", date: WED_14, name: "Ranger", done: true, tags: [] },
    ];
    expect(recordDiffers(record, changed)).toBe(true);
  });

  it("déplacer une tâche faite vers un autre jour est signalé", () => {
    const changed = wednesday().map((task) =>
      task.id === "a" ? { ...task, date: TUE_13 } : task,
    );
    expect(recordDiffers(record, changed)).toBe(true);
  });

  it("une tâche non faite à minuit reportée plus tard ne signale rien", () => {
    expect(recordDiffers(record, postponeB(THU_15))).toBe(false);
    expect(recordDiffers(record, postponeB(FRI_16))).toBe(false);
  });

  it("une tâche reportée puis faite le jour suivant ne signale rien", () => {
    const changed = postponeB(THU_15).map((task) =>
      task.id === "b" ? { ...task, done: true } : task,
    );
    expect(recordDiffers(record, changed)).toBe(false);
  });

  it("un report et la coche en retard d'une autre tâche sont signalés", () => {
    const changed = postponeB(THU_15).map((task) =>
      task.id === "a" ? { ...task, done: false } : task,
    );
    expect(recordDiffers(record, changed)).toBe(true);
  });

  it("un report et l'ajout d'une tâche sont signalés", () => {
    const changed: ClosingTask[] = [
      ...postponeB(THU_15),
      { id: "d", date: WED_14, name: "Ranger", done: false, tags: [] },
    ];
    expect(recordDiffers(record, changed)).toBe(true);
  });

  it("une tâche non faite déplacée vers la Box est signalée", () => {
    const changed = wednesday().map((task) =>
      task.id === "b" ? { ...task, date: null } : task,
    );
    expect(recordDiffers(record, changed)).toBe(true);
  });

  it("une tâche non faite déplacée vers un jour antérieur est signalée", () => {
    const changed = wednesday().map((task) =>
      task.id === "b" ? { ...task, date: TUE_13 } : task,
    );
    expect(recordDiffers(record, changed)).toBe(true);
  });

  it("une tâche faite déplacée vers un jour postérieur est signalée", () => {
    const changed = wednesday().map((task) =>
      task.id === "a" ? { ...task, date: FRI_16 } : task,
    );
    expect(recordDiffers(record, changed)).toBe(true);
  });

  it("une tâche reportée puis supprimée est signalée", () => {
    const changed = postponeB(THU_15).filter((task) => task.id !== "b");
    expect(recordDiffers(record, changed)).toBe(true);
  });

  it("une journée vide reste vide tant qu'aucune tâche n'y arrive", () => {
    const empty = closeDay(others(), [], WED_14, OPEN);
    expect(recordDiffers(empty, others())).toBe(false);
    expect(recordDiffers(empty, wednesday())).toBe(true);
  });
});

describe("Arguments", () => {
  it("closeDay et recordDiffers ne modifient pas leurs arguments", () => {
    const tasks = Object.freeze(
      [...wednesday(), ...others()].map((task) =>
        Object.freeze({ ...task, tags: Object.freeze([...task.tags]) }),
      ),
    );
    const rest = Object.freeze([
      Object.freeze({ startKey: TUE_13, endKey: TUE_13 }),
    ]);
    const record = closeDay(tasks, rest, WED_14, OPEN);
    expect(record).toEqual(WEDNESDAY_RECORD);
    expect(tasks).toEqual([...wednesday(), ...others()]);

    const frozen = Object.freeze({
      ...record,
      tasks: Object.freeze(record.tasks.map((task) => Object.freeze(task))),
    });
    expect(recordDiffers(frozen, tasks)).toBe(false);
    expect(frozen).toEqual(WEDNESDAY_RECORD);
  });

  it("l'enregistrement ne partage pas les tags de la tâche", () => {
    const tasks = wednesday();
    const record = closeDay(tasks, [], WED_14, OPEN);
    expect(record.tasks[0].tags[0]).not.toBe(tasks[0].tags[0]);
    expect(record.tasks[0].tags).not.toBe(tasks[0].tags);
  });
});

describe("Entrées invalides", () => {
  it("closeDay refuse une clé invalide", () => {
    expect(() => closeDay(wednesday(), [], "2026-02-30", OPEN)).toThrow(
      /^closeDay: invalid date key/,
    );
    expect(() => closeDay(wednesday(), [], WED_14, "15/10/2026")).toThrow(
      /^closeDay: invalid date key/,
    );
  });

  it("closeDay refuse un Repos invalide", () => {
    const rest: RestPeriod[] = [{ startKey: WED_14, endKey: "2026-13-01" }];
    expect(() => closeDay(wednesday(), rest, WED_14, OPEN)).toThrow(RangeError);
  });

  it("closeDay refuse deux tâches du jour avec le même id", () => {
    const [a, b] = wednesday();
    expect(() => closeWednesday([a, { ...b, id: "a" }])).toThrow(
      /^closeDay: duplicate task id \(a\)/,
    );
  });

  it("closeDay accepte un id déjà pris sur un autre jour", () => {
    const tasks = [...wednesday(), { ...others()[0], id: "a" }];
    expect(closeWednesday(tasks)).toEqual(WEDNESDAY_RECORD);
  });

  it("recordDiffers refuse une clé invalide", () => {
    expect(() =>
      recordDiffers({ ...WEDNESDAY_RECORD, key: "2026-10-32" }, wednesday()),
    ).toThrow(/^recordDiffers: invalid date key/);
  });

  it("recordDiffers refuse un id en double dans l'enregistrement", () => {
    const [a] = WEDNESDAY_RECORD.tasks;
    const record: DayRecord = { ...WEDNESDAY_RECORD, tasks: [a, a] };
    expect(() => recordDiffers(record, wednesday())).toThrow(
      /^recordDiffers: duplicate task id/,
    );
  });

  it("recordDiffers refuse un id en double dans les tâches du jour", () => {
    const [a] = wednesday();
    expect(() => recordDiffers(WEDNESDAY_RECORD, [a, a])).toThrow(
      /^recordDiffers: duplicate task id \(a\)/,
    );
  });

  it("recordDiffers accepte un id déjà pris sur un autre jour", () => {
    const tasks = [...wednesday(), { ...others()[0], id: "a" }];
    expect(recordDiffers(WEDNESDAY_RECORD, tasks)).toBe(false);
  });
});
