import { openDayKey } from "./date";
import { dayStatus, type DayTask } from "./dayStatus";
import type { RestPeriod } from "./rest";

const TUE_13 = "2026-10-13";
const WED_14 = "2026-10-14";
const THU_15 = "2026-10-15";
const FRI_16 = "2026-10-16";
const SAT_17 = "2026-10-17";

const allDone: DayTask[] = [
  { date: THU_15, done: true },
  { date: THU_15, done: true },
];
const partlyDone: DayTask[] = [
  { date: THU_15, done: true },
  { date: THU_15, done: false },
];

describe("Seules les journées closes à 100 % comptent pour l'objectif ; une journée en cours à 100 % reste provisoire.", () => {
  it("une journée close à 100 % est un succès", () => {
    expect(dayStatus(allDone, [], THU_15, FRI_16)).toBe("success");
  });

  it("la même journée encore ouverte est provisoire", () => {
    expect(dayStatus(allDone, [], THU_15, THU_15)).toBe("provisional");
  });

  it("une journée ouverte reste provisoire à 0 %, à 50 % ou vide", () => {
    const noneDone: DayTask[] = [{ date: THU_15, done: false }];
    expect(dayStatus(noneDone, [], THU_15, THU_15)).toBe("provisional");
    expect(dayStatus(partlyDone, [], THU_15, THU_15)).toBe("provisional");
    expect(dayStatus([], [], THU_15, THU_15)).toBe("provisional");
  });

  it("une journée future est provisoire", () => {
    const future: DayTask[] = [{ date: SAT_17, done: true }];
    expect(dayStatus(future, [], SAT_17, THU_15)).toBe("provisional");
  });
});

describe("Une journée vide hors Repos ou incomplète rompt la série.", () => {
  it("une journée close sans tâche est vide", () => {
    expect(dayStatus([], [], THU_15, FRI_16)).toBe("empty");
  });

  it("une journée close incomplète est un échec", () => {
    expect(dayStatus(partlyDone, [], THU_15, FRI_16)).toBe("failed");
  });

  it("une journée vide en Repos est en Repos", () => {
    const rest: RestPeriod[] = [{ startKey: WED_14, endKey: THU_15 }];
    expect(dayStatus([], rest, THU_15, FRI_16)).toBe("rest");
  });
});

describe("Le Repos est prioritaire", () => {
  const rest: RestPeriod[] = [{ startKey: TUE_13, endKey: THU_15 }];

  it("une journée close à 100 % en Repos est en Repos", () => {
    expect(dayStatus(allDone, rest, THU_15, FRI_16)).toBe("rest");
  });

  it("une journée close incomplète en Repos est en Repos", () => {
    expect(dayStatus(partlyDone, rest, THU_15, FRI_16)).toBe("rest");
  });

  it("le jour ouvert et les jours futurs en Repos sont en Repos", () => {
    expect(dayStatus(allDone, rest, THU_15, THU_15)).toBe("rest");
    expect(dayStatus([], rest, THU_15, TUE_13)).toBe("rest");
  });
});

describe("Seules les tâches du jour comptent", () => {
  it("les tâches d'autres jours et de la Box sont ignorées", () => {
    const tasks: DayTask[] = [
      { date: THU_15, done: true },
      { date: WED_14, done: false },
      { date: FRI_16, done: false },
      { date: null, done: false },
    ];
    expect(dayStatus(tasks, [], THU_15, FRI_16)).toBe("success");
  });

  it("une journée qui n'a que des tâches d'autres jours ou de la Box est vide", () => {
    const tasks: DayTask[] = [
      { date: WED_14, done: true },
      { date: null, done: true },
    ];
    expect(dayStatus(tasks, [], THU_15, FRI_16)).toBe("empty");
  });
});

describe("Entrées invalides", () => {
  it("refuse une clé invalide", () => {
    expect(() => dayStatus([], [], "2026-02-30", FRI_16)).toThrow(RangeError);
    expect(() => dayStatus([], [], THU_15, "16/10/2026")).toThrow(RangeError);
  });

  it("refuse une période de Repos invalide", () => {
    const inverted: RestPeriod[] = [{ startKey: THU_15, endKey: TUE_13 }];
    expect(() => dayStatus([], inverted, THU_15, FRI_16)).toThrow(RangeError);
  });
});

describe("Avec la journée ouverte après un voyage vers l'ouest", () => {
  it("le 16 reste provisoire à New York, même si l'horloge locale affiche le 15", () => {
    /* The 15th is closed in Paris; on arrival in New York it is 18:30 on the 15th. */
    const now = new Date("2026-10-15T18:30:00-04:00");
    const openKey = openDayKey(now, "America/New_York", THU_15);
    expect(openKey).toBe(FRI_16);

    const tasks: DayTask[] = [
      { date: THU_15, done: true },
      { date: FRI_16, done: true },
    ];
    expect(dayStatus(tasks, [], FRI_16, openKey)).toBe("provisional");
    expect(dayStatus(tasks, [], THU_15, openKey)).toBe("success");
  });
});
