import {
  cancelRest,
  changeRestEnd,
  currentRest,
  isRestDay,
  startRest,
  type RestPeriod,
} from "./rest";

/*
 * Scenario: October 2026. Tuesday the 13th, Wednesday the 14th, Thursday the
 * 15th, Friday the 16th, Saturday the 17th, Sunday the 18th, Tuesday the 20th.
 */
const MON_12 = "2026-10-12";
const TUE_13 = "2026-10-13";
const WED_14 = "2026-10-14";
const THU_15 = "2026-10-15";
const FRI_16 = "2026-10-16";
const SAT_17 = "2026-10-17";
const SUN_18 = "2026-10-18";
const TUE_20 = "2026-10-20";

describe("Le Repos activé pendant une journée ouverte rend cette journée entière neutre pour l'objectif et les statistiques.", () => {
  it("le Repos commence le jour ouvert", () => {
    expect(startRest([], TUE_13, THU_15)).toEqual({
      startKey: TUE_13,
      endKey: THU_15,
    });
  });

  it("le jour ouvert est en Repos, quelle que soit l'heure d'activation", () => {
    /* Rest works on keys: activating it at 08:00 or 23:59 gives the same day. */
    const period = startRest([], TUE_13, TUE_13);
    expect(isRestDay([period], TUE_13)).toBe(true);
    expect(isRestDay([period], MON_12)).toBe(false);
  });

  it("toutes les journées de la période sont en Repos", () => {
    const period = startRest([], TUE_13, THU_15);
    expect(isRestDay([period], TUE_13)).toBe(true);
    expect(isRestDay([period], WED_14)).toBe(true);
    expect(isRestDay([period], THU_15)).toBe(true);
  });

  it("sans période, aucune journée n'est en Repos", () => {
    expect(isRestDay([], TUE_13)).toBe(false);
  });
});

describe("Sa date de fin est incluse.", () => {
  it("le dernier jour est en Repos, le lendemain non", () => {
    const periods: RestPeriod[] = [{ startKey: TUE_13, endKey: THU_15 }];
    expect(isRestDay(periods, THU_15)).toBe(true);
    expect(isRestDay(periods, FRI_16)).toBe(false);
  });

  it("chaque période compte, bornes incluses", () => {
    const periods: RestPeriod[] = [
      { startKey: TUE_13, endKey: TUE_13 },
      { startKey: SAT_17, endKey: SUN_18 },
    ];
    expect(isRestDay(periods, TUE_13)).toBe(true);
    expect(isRestDay(periods, WED_14)).toBe(false);
    expect(isRestDay(periods, SAT_17)).toBe(true);
    expect(isRestDay(periods, SUN_18)).toBe(true);
    expect(isRestDay(periods, TUE_20)).toBe(false);
  });
});

describe("Une annulation avant minuit rend la journée en cours normale, sans modifier les jours déjà clos.", () => {
  it("une annulation le mercredi garde mardi en Repos et rend mercredi normal", () => {
    const period: RestPeriod = { startKey: TUE_13, endKey: THU_15 };
    expect(isRestDay([period], TUE_13)).toBe(true);
    expect(isRestDay([period], WED_14)).toBe(true);

    const cancelled = cancelRest(period, WED_14);
    expect(cancelled).toEqual({ startKey: TUE_13, endKey: TUE_13 });

    const periods = cancelled === null ? [] : [cancelled];
    expect(isRestDay(periods, TUE_13)).toBe(true);
    expect(isRestDay(periods, WED_14)).toBe(false);
    expect(isRestDay(periods, THU_15)).toBe(false);
  });

  it("une annulation le jour de l'activation fait disparaître le Repos", () => {
    const period = startRest([], TUE_13, THU_15);
    expect(cancelRest(period, TUE_13)).toBeNull();
  });

  it("une annulation le dernier jour garde les jours clos en Repos", () => {
    const period: RestPeriod = { startKey: TUE_13, endKey: THU_15 };
    expect(cancelRest(period, THU_15)).toEqual({
      startKey: TUE_13,
      endKey: WED_14,
    });
  });

  it("l'annulation ne modifie pas la période reçue", () => {
    const period: RestPeriod = Object.freeze({
      startKey: TUE_13,
      endKey: THU_15,
    });
    cancelRest(period, WED_14);
    expect(period).toEqual({ startKey: TUE_13, endKey: THU_15 });
  });
});

describe("Aucun Repos ne s'ajoute rétroactivement à une journée close.", () => {
  it("startRest ne couvre jamais une clé antérieure au jour ouvert", () => {
    const period = startRest([], WED_14, FRI_16);
    expect(period.startKey).toBe(WED_14);
    expect(isRestDay([period], TUE_13)).toBe(false);
  });

  it("startRest refuse une date de fin antérieure au jour ouvert", () => {
    expect(() => startRest([], WED_14, TUE_13)).toThrow(RangeError);
  });

  it("cancelRest refuse une période déjà finie ou pas encore commencée", () => {
    const period: RestPeriod = { startKey: TUE_13, endKey: THU_15 };
    expect(() => cancelRest(period, FRI_16)).toThrow(RangeError);
    expect(() => cancelRest(period, MON_12)).toThrow(RangeError);
  });

  it("changeRestEnd refuse une période déjà finie ou pas encore commencée", () => {
    const period: RestPeriod = { startKey: TUE_13, endKey: THU_15 };
    expect(() => changeRestEnd(period, TUE_20, FRI_16)).toThrow(RangeError);
    expect(() => changeRestEnd(period, TUE_20, MON_12)).toThrow(RangeError);
  });

  it("après une annulation, aucune journée close ne change d'état", () => {
    const before: RestPeriod[] = [{ startKey: TUE_13, endKey: SUN_18 }];
    const cancelled = cancelRest(before[0], THU_15);
    const after = cancelled === null ? [] : [cancelled];

    for (const closedKey of [MON_12, TUE_13, WED_14]) {
      expect(isRestDay(after, closedKey)).toBe(isRestDay(before, closedKey));
    }
  });

  it("après un changement de date de fin, aucune journée close ne change d'état", () => {
    const before: RestPeriod[] = [{ startKey: TUE_13, endKey: SUN_18 }];
    const sooner = [changeRestEnd(before[0], THU_15, THU_15)];
    const later = [changeRestEnd(before[0], TUE_20, THU_15)];

    for (const closedKey of [MON_12, TUE_13, WED_14]) {
      expect(isRestDay(sooner, closedKey)).toBe(isRestDay(before, closedKey));
      expect(isRestDay(later, closedKey)).toBe(isRestDay(before, closedKey));
    }
  });
});

describe("Changer la date de fin d'un Repos en cours", () => {
  /* Rest from Tuesday the 13th to Sunday the 18th; today is Thursday the 15th. */
  const period: RestPeriod = { startKey: TUE_13, endKey: SUN_18 };

  it("repousse la fin au mardi 20", () => {
    expect(changeRestEnd(period, TUE_20, THU_15)).toEqual({
      startKey: TUE_13,
      endKey: TUE_20,
    });
  });

  it("avance la fin au vendredi 16", () => {
    const sooner = changeRestEnd(period, FRI_16, THU_15);
    expect(sooner).toEqual({ startKey: TUE_13, endKey: FRI_16 });
    expect(isRestDay([sooner], FRI_16)).toBe(true);
    expect(isRestDay([sooner], SAT_17)).toBe(false);
  });

  it("fixer la fin au jeudi 15 garde jeudi en Repos", () => {
    const changed = changeRestEnd(period, THU_15, THU_15);
    expect(changed).toEqual({ startKey: TUE_13, endKey: THU_15 });
    expect(isRestDay([changed], THU_15)).toBe(true);
    expect(isRestDay([changed], FRI_16)).toBe(false);
  });

  it("refuse le mercredi 14", () => {
    expect(() => changeRestEnd(period, WED_14, THU_15)).toThrow(RangeError);
  });

  it("ne modifie pas la période reçue", () => {
    const frozen: RestPeriod = Object.freeze({ ...period });
    changeRestEnd(frozen, TUE_20, THU_15);
    expect(frozen).toEqual({ startKey: TUE_13, endKey: SUN_18 });
  });
});

describe("currentRest", () => {
  const periods: RestPeriod[] = [
    { startKey: "2026-10-01", endKey: "2026-10-03" },
    { startKey: TUE_13, endKey: THU_15 },
  ];

  it("renvoie la période qui couvre le jour ouvert", () => {
    expect(currentRest(periods, TUE_13)).toEqual(periods[1]);
    expect(currentRest(periods, THU_15)).toEqual(periods[1]);
  });

  it("renvoie null hors Repos", () => {
    expect(currentRest(periods, FRI_16)).toBeNull();
    expect(currentRest([], THU_15)).toBeNull();
  });
});

describe("startRest et les chevauchements", () => {
  const existing: RestPeriod[] = [{ startKey: TUE_13, endKey: THU_15 }];

  it("refuse un Repos qui chevauche une période existante", () => {
    expect(() => startRest(existing, THU_15, SAT_17)).toThrow(RangeError);
    expect(() => startRest(existing, WED_14, WED_14)).toThrow(RangeError);
    expect(() => startRest(existing, TUE_13, TUE_20)).toThrow(RangeError);
  });

  it("accepte un Repos qui suit une période existante", () => {
    expect(startRest(existing, FRI_16, SUN_18)).toEqual({
      startKey: FRI_16,
      endKey: SUN_18,
    });
  });

  it("ne modifie pas la liste reçue", () => {
    const frozen = Object.freeze([Object.freeze({ ...existing[0] })]);
    startRest(frozen, FRI_16, SUN_18);
    expect(frozen).toEqual(existing);
  });
});

describe("Entrées invalides", () => {
  const valid: RestPeriod = { startKey: TUE_13, endKey: THU_15 };
  const inverted: RestPeriod = { startKey: THU_15, endKey: TUE_13 };
  const badStart: RestPeriod = { startKey: "2026-02-30", endKey: THU_15 };
  const badEnd: RestPeriod = { startKey: TUE_13, endKey: "15/10/2026" };

  it("isRestDay refuse une clé ou une période invalide", () => {
    expect(() => isRestDay([valid], "2026-02-30")).toThrow(RangeError);
    expect(() => isRestDay([inverted], WED_14)).toThrow(RangeError);
    expect(() => isRestDay([badStart], WED_14)).toThrow(RangeError);
    expect(() => isRestDay([badEnd], WED_14)).toThrow(RangeError);
  });

  it("currentRest refuse une clé ou une période invalide", () => {
    expect(() => currentRest([valid], "")).toThrow(RangeError);
    expect(() => currentRest([inverted], WED_14)).toThrow(RangeError);
  });

  it("startRest refuse une clé ou une période invalide", () => {
    expect(() => startRest([], "2026-13-01", THU_15)).toThrow(RangeError);
    expect(() => startRest([], TUE_13, "2026-13-01")).toThrow(RangeError);
    expect(() => startRest([inverted], FRI_16, SUN_18)).toThrow(RangeError);
  });

  it("cancelRest refuse une clé ou une période invalide", () => {
    expect(() => cancelRest(valid, "2026-10-32")).toThrow(RangeError);
    expect(() => cancelRest(inverted, WED_14)).toThrow(RangeError);
  });

  it("changeRestEnd refuse une clé ou une période invalide", () => {
    expect(() => changeRestEnd(valid, "2026-10-32", WED_14)).toThrow(
      RangeError,
    );
    expect(() => changeRestEnd(valid, SAT_17, "2026-10-32")).toThrow(
      RangeError,
    );
    expect(() => changeRestEnd(inverted, SAT_17, WED_14)).toThrow(RangeError);
  });
});
