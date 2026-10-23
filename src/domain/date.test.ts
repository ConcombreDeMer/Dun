import {
  addDays,
  dateKey,
  dayKeysToClose,
  isDateKey,
  openDayKey,
  weekday,
} from "./date";

const PARIS = "Europe/Paris";
const NEW_YORK = "America/New_York";
const TOKYO = "Asia/Tokyo";

/*
 * Instants are written with an explicit UTC offset, so the tests do not
 * depend on the time zone of the machine that runs them. In October 2026,
 * Paris is at +02:00 until the 25th, then +01:00; New York is at -04:00.
 */
const at = (iso: string) => new Date(iso);

describe("Une journée se clôt à minuit", () => {
  it("23:59:59.999 et 00:00:00.000 donnent deux clés différentes", () => {
    expect(dateKey(at("2026-10-15T23:59:59.999+02:00"), PARIS)).toBe(
      "2026-10-15",
    );
    expect(dateKey(at("2026-10-16T00:00:00.000+02:00"), PARIS)).toBe(
      "2026-10-16",
    );
  });

  it("à 04:00, c'est déjà la nouvelle clé : la bascule n'a plus lieu à 4 h", () => {
    expect(dateKey(at("2026-10-16T03:59:59.999+02:00"), PARIS)).toBe(
      "2026-10-16",
    );
    expect(dateKey(at("2026-10-16T04:00:00.000+02:00"), PARIS)).toBe(
      "2026-10-16",
    );
  });

  it("minuit s'entend dans le fuseau passé en paramètre", () => {
    expect(dateKey(at("2026-10-15T23:59:59.999-04:00"), NEW_YORK)).toBe(
      "2026-10-15",
    );
    expect(dateKey(at("2026-10-16T00:00:00.000-04:00"), NEW_YORK)).toBe(
      "2026-10-16",
    );
    expect(dateKey(at("2026-10-15T23:59:59.999Z"), "UTC")).toBe("2026-10-15");
    expect(dateKey(at("2026-10-16T00:00:00.000Z"), "UTC")).toBe("2026-10-16");
  });
});

describe("Les nouvelles journées suivent le fuseau de l'iPhone", () => {
  it("un même instant donne des clés différentes à Paris, New York et Tokyo", () => {
    /* 22:30 UTC: 00:30 in Paris, 18:30 in New York, 07:30 in Tokyo. */
    const evening = at("2026-10-15T22:30:00Z");
    expect(dateKey(evening, PARIS)).toBe("2026-10-16");
    expect(dateKey(evening, NEW_YORK)).toBe("2026-10-15");
    expect(dateKey(evening, TOKYO)).toBe("2026-10-16");

    /* 16:00 UTC: 18:00 in Paris, 12:00 in New York, 01:00 in Tokyo. */
    const afternoon = at("2026-10-15T16:00:00Z");
    expect(dateKey(afternoon, PARIS)).toBe("2026-10-15");
    expect(dateKey(afternoon, NEW_YORK)).toBe("2026-10-15");
    expect(dateKey(afternoon, TOKYO)).toBe("2026-10-16");
  });

  it("trois fuseaux éloignés donnent trois journées à la fois", () => {
    /* 10:30 UTC: 00:30 the 16th at UTC+14, 23:30 the 14th at UTC-11. */
    const instant = at("2026-10-15T10:30:00Z");
    expect(dateKey(instant, "Pacific/Kiritimati")).toBe("2026-10-16");
    expect(dateKey(instant, PARIS)).toBe("2026-10-15");
    expect(dateKey(instant, "Pacific/Pago_Pago")).toBe("2026-10-14");
  });

  it("sans journée close, la journée ouverte est la date locale", () => {
    const instant = at("2026-10-15T22:30:00Z");
    expect(openDayKey(instant, PARIS, null)).toBe("2026-10-16");
    expect(openDayKey(instant, NEW_YORK, null)).toBe("2026-10-15");
  });

  it("après une absence, la journée ouverte est la date locale", () => {
    expect(
      openDayKey(at("2026-10-20T09:00:00+02:00"), PARIS, "2026-10-14"),
    ).toBe("2026-10-20");
  });
});

describe("Une journée déjà enregistrée garde sa date et ne se rouvre pas lors d'un voyage", () => {
  it("Paris → New York → Paris, pas à pas", () => {
    let lastClosedKey = "2026-10-14";

    /* Paris, the 15th at 23:00. */
    let now = at("2026-10-15T23:00:00+02:00");
    let openKey = openDayKey(now, PARIS, lastClosedKey);
    expect(openKey).toBe("2026-10-15");
    expect(dayKeysToClose(lastClosedKey, openKey)).toEqual([]);

    /* Paris, the 16th at 00:30: the 15th closes. */
    now = at("2026-10-16T00:30:00+02:00");
    openKey = openDayKey(now, PARIS, lastClosedKey);
    expect(openKey).toBe("2026-10-16");
    expect(dayKeysToClose(lastClosedKey, openKey)).toEqual(["2026-10-15"]);
    lastClosedKey = "2026-10-15";

    /* Arrival in New York, the 15th at 18:30 local time. */
    now = at("2026-10-15T18:30:00-04:00");
    expect(dateKey(now, NEW_YORK)).toBe("2026-10-15");
    openKey = openDayKey(now, NEW_YORK, lastClosedKey);
    expect(openKey).toBe("2026-10-16");
    expect(dayKeysToClose(lastClosedKey, openKey)).toEqual([]);

    /* New York, the 16th at 23:59: still the 16th. */
    now = at("2026-10-16T23:59:00-04:00");
    openKey = openDayKey(now, NEW_YORK, lastClosedKey);
    expect(openKey).toBe("2026-10-16");
    expect(dayKeysToClose(lastClosedKey, openKey)).toEqual([]);

    /* New York, the 17th at 00:01: the 17th opens, the 16th closes. */
    now = at("2026-10-17T00:01:00-04:00");
    openKey = openDayKey(now, NEW_YORK, lastClosedKey);
    expect(openKey).toBe("2026-10-17");
    expect(dayKeysToClose(lastClosedKey, openKey)).toEqual(["2026-10-16"]);
    lastClosedKey = "2026-10-16";

    /* Back in Paris, the 18th at 08:00: the 18th opens, the 17th closes. */
    now = at("2026-10-18T08:00:00+02:00");
    openKey = openDayKey(now, PARIS, lastClosedKey);
    expect(openKey).toBe("2026-10-18");
    expect(dayKeysToClose(lastClosedKey, openKey)).toEqual(["2026-10-17"]);
  });

  it("une journée close n'est jamais rouverte, même très à l'ouest", () => {
    /* The 16th is closed; it is still the 16th in Pago Pago (UTC-11). */
    const now = at("2026-10-16T20:00:00-11:00");
    expect(dateKey(now, "Pacific/Pago_Pago")).toBe("2026-10-16");
    expect(openDayKey(now, "Pacific/Pago_Pago", "2026-10-16")).toBe(
      "2026-10-17",
    );
  });

  it("toutes les journées manquées sont à clore, dans l'ordre", () => {
    expect(dayKeysToClose("2026-10-29", "2026-11-02")).toEqual([
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
    ]);
  });

  it("rien n'est à clore sans journée close ou si la journée ouverte suit", () => {
    expect(dayKeysToClose(null, "2026-10-16")).toEqual([]);
    expect(dayKeysToClose("2026-10-15", "2026-10-16")).toEqual([]);
    expect(dayKeysToClose("2026-10-16", "2026-10-16")).toEqual([]);
    expect(dayKeysToClose("2026-10-17", "2026-10-16")).toEqual([]);
  });
});

describe("Changements d'heure", () => {
  it("la nuit du 25 octobre 2026 à Paris garde une seule journée", () => {
    expect(dateKey(at("2026-10-24T23:59:59.999+02:00"), PARIS)).toBe(
      "2026-10-24",
    );
    expect(dateKey(at("2026-10-25T00:00:00.000+02:00"), PARIS)).toBe(
      "2026-10-25",
    );
    /* 02:30 happens twice: before and after the clocks go back. */
    expect(dateKey(at("2026-10-25T02:30:00+02:00"), PARIS)).toBe("2026-10-25");
    expect(dateKey(at("2026-10-25T02:30:00+01:00"), PARIS)).toBe("2026-10-25");
    expect(dateKey(at("2026-10-25T23:59:59.999+01:00"), PARIS)).toBe(
      "2026-10-25",
    );
    expect(dateKey(at("2026-10-26T00:00:00.000+01:00"), PARIS)).toBe(
      "2026-10-26",
    );
  });

  it("la nuit du 29 mars 2026 à Paris garde une seule journée", () => {
    expect(dateKey(at("2026-03-29T01:59:59.999+01:00"), PARIS)).toBe(
      "2026-03-29",
    );
    expect(dateKey(at("2026-03-29T03:00:00.000+02:00"), PARIS)).toBe(
      "2026-03-29",
    );
    expect(dateKey(at("2026-03-29T23:59:59.999+02:00"), PARIS)).toBe(
      "2026-03-29",
    );
    expect(dateKey(at("2026-03-30T00:00:00.000+02:00"), PARIS)).toBe(
      "2026-03-30",
    );
  });

  it("addDays ne saute ni ne répète aucune journée de part et d'autre", () => {
    expect(addDays("2026-10-24", 1)).toBe("2026-10-25");
    expect(addDays("2026-10-25", 1)).toBe("2026-10-26");
    expect(addDays("2026-10-26", -2)).toBe("2026-10-24");
    expect(addDays("2026-03-28", 1)).toBe("2026-03-29");
    expect(addDays("2026-03-29", 1)).toBe("2026-03-30");
    expect(addDays("2026-03-30", -2)).toBe("2026-03-28");
  });
});

describe("isDateKey", () => {
  it("accepte une date qui existe, au format YYYY-MM-DD", () => {
    expect(isDateKey("2026-10-16")).toBe(true);
    expect(isDateKey("2028-02-29")).toBe(true);
    expect(isDateKey("2000-02-29")).toBe(true);
    expect(isDateKey("0050-06-15")).toBe(true);
    expect(isDateKey("9999-12-31")).toBe(true);
  });

  it("refuse une date absente du calendrier", () => {
    expect(isDateKey("2026-02-30")).toBe(false);
    expect(isDateKey("2026-02-29")).toBe(false);
    expect(isDateKey("2100-02-29")).toBe(false);
    expect(isDateKey("2026-04-31")).toBe(false);
    expect(isDateKey("2026-13-01")).toBe(false);
    expect(isDateKey("2026-00-10")).toBe(false);
    expect(isDateKey("2026-01-00")).toBe(false);
  });

  it("refuse un autre format", () => {
    expect(isDateKey("")).toBe(false);
    expect(isDateKey("2026-1-01")).toBe(false);
    expect(isDateKey("2026/10/16")).toBe(false);
    expect(isDateKey(" 2026-10-16")).toBe(false);
    expect(isDateKey("2026-10-16T00:00")).toBe(false);
    expect(isDateKey("12026-10-16")).toBe(false);
  });
});

describe("addDays", () => {
  it("passe les fins de mois, d'année et le 29 février", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-04-30", 1)).toBe("2026-05-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2028-02-29", 1)).toBe("2028-03-01");
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
  });

  it("accepte zéro et les grands écarts", () => {
    expect(addDays("2026-10-16", 0)).toBe("2026-10-16");
    expect(addDays("2026-01-01", 365)).toBe("2027-01-01");
    expect(addDays("2028-01-01", 366)).toBe("2029-01-01");
    expect(addDays("2026-10-16", -365)).toBe("2025-10-16");
  });

  it("refuse une clé invalide", () => {
    expect(() => addDays("2026-02-30", 1)).toThrow(RangeError);
    expect(() => addDays("16/10/2026", 1)).toThrow(RangeError);
  });

  it("refuse un nombre de jours non entier", () => {
    expect(() => addDays("2026-10-16", 1.5)).toThrow(RangeError);
    expect(() => addDays("2026-10-16", -0.5)).toThrow(RangeError);
    expect(() => addDays("2026-10-16", Number.NaN)).toThrow(RangeError);
    expect(() => addDays("2026-10-16", Infinity)).toThrow(RangeError);
  });

  it("refuse un résultat hors des années 0000 à 9999", () => {
    expect(() => addDays("9999-12-31", 1)).toThrow(RangeError);
    expect(() => addDays("0000-01-01", -1)).toThrow(RangeError);
    expect(() => addDays("2026-10-16", 1e10)).toThrow(RangeError);
  });
});

describe("weekday", () => {
  it("compte du lundi = 1 au dimanche = 7", () => {
    expect(weekday("2026-10-12")).toBe(1);
    expect(weekday("2026-10-13")).toBe(2);
    expect(weekday("2026-10-14")).toBe(3);
    expect(weekday("2026-10-15")).toBe(4);
    expect(weekday("2026-10-16")).toBe(5);
    expect(weekday("2026-10-17")).toBe(6);
    expect(weekday("2026-10-18")).toBe(7);
  });

  it("passe les années et le 29 février", () => {
    expect(weekday("2026-12-31")).toBe(4);
    expect(weekday("2027-01-03")).toBe(7);
    expect(weekday("2028-02-29")).toBe(2);
    expect(weekday("2000-02-29")).toBe(2);
    expect(weekday("0001-01-01")).toBe(1);
    expect(weekday("9999-12-31")).toBe(5);
  });

  it("refuse une clé invalide", () => {
    expect(() => weekday("2026-02-29")).toThrow(/^weekday: invalid date key/);
    expect(() => weekday("12/10/2026")).toThrow(RangeError);
  });
});

describe("dateKey", () => {
  it("refuse une date invalide", () => {
    expect(() => dateKey(new Date(Number.NaN), PARIS)).toThrow(RangeError);
  });

  it("accepte toute la plage prise en charge, et rien au-delà", () => {
    /*
     * Fixed offsets (`Etc/GMT+12` is UTC-12): far in the past, real zones
     * use their local mean time, which differs from today's offset.
     */
    const tooEarly = new Date(0);
    tooEarly.setUTCFullYear(1, 0, 1);
    expect(() => dateKey(tooEarly, "UTC")).toThrow(RangeError);

    const tooLate = new Date(0);
    tooLate.setUTCFullYear(9999, 11, 31);
    expect(() => dateKey(tooLate, "UTC")).toThrow(RangeError);

    const first = new Date(0);
    first.setUTCFullYear(1, 0, 2);
    expect(dateKey(first, "Etc/GMT+12")).toBe("0001-01-01");

    const last = new Date(0);
    last.setUTCFullYear(9999, 11, 30);
    last.setUTCHours(23, 59, 59, 999);
    expect(dateKey(last, "Etc/GMT-14")).toBe("9999-12-31");
  });

  it("réutilise un fuseau déjà vu sans changer le résultat", () => {
    const instant = at("2026-10-15T22:30:00Z");
    expect(dateKey(instant, "Asia/Kolkata")).toBe("2026-10-16");
    expect(dateKey(instant, "Asia/Kolkata")).toBe("2026-10-16");
    expect(dateKey(at("2026-10-15T12:00:00Z"), "Asia/Kolkata")).toBe(
      "2026-10-15",
    );
    expect(dateKey(instant, "America/Los_Angeles")).toBe("2026-10-15");
    expect(dateKey(instant, "Asia/Kolkata")).toBe("2026-10-16");
  });

  it("refuse un fuseau inconnu, à chaque appel", () => {
    const instant = at("2026-10-16T12:00:00Z");
    expect(() => dateKey(instant, "Mars/Phobos")).toThrow(RangeError);
    expect(() => dateKey(instant, "Mars/Phobos")).toThrow(RangeError);
  });

  it("refuse un fuseau inconnu", () => {
    expect(() => dateKey(at("2026-10-16T12:00:00Z"), "Mars/Olympus")).toThrow(
      RangeError,
    );
    expect(() => dateKey(at("2026-10-16T12:00:00Z"), "")).toThrow(RangeError);
  });
});

describe("openDayKey et dayKeysToClose", () => {
  it("refusent une clé invalide", () => {
    const now = at("2026-10-16T12:00:00+02:00");
    expect(() => openDayKey(now, PARIS, "2026-02-30")).toThrow(RangeError);
    expect(() => dayKeysToClose("2026-10-15", "2026-02-30")).toThrow(
      RangeError,
    );
    expect(() => dayKeysToClose(null, "16/10/2026")).toThrow(RangeError);
    expect(() => dayKeysToClose("2026-02-30", "2026-10-16")).toThrow(
      RangeError,
    );
  });
});
