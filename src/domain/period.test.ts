import { addDays } from "./date";
import {
  PERIOD_KINDS,
  period,
  periodBuckets,
  shiftPeriod,
  type DateRange,
  type Period,
  type PeriodKind,
} from "./period";

/* One day per slice, from `startKey` to `endKey`. */
function days(startKey: string, endKey: string): DateRange[] {
  const list: DateRange[] = [];
  for (let key = startKey; key <= endKey; key = addDays(key, 1)) {
    list.push({ startKey: key, endKey: key });
  }
  return list;
}

describe("Les périodes sont identifiées par week | month | year, plus par des libellés.", () => {
  it("les trois périodes, de la plus courte à la plus longue", () => {
    expect(PERIOD_KINDS).toEqual(["week", "month", "year"]);
  });

  it("une période porte son type et ses bornes, sans libellé", () => {
    expect(period("month", "2026-10-16")).toEqual({
      kind: "month",
      startKey: "2026-10-01",
      endKey: "2026-10-31",
    });
  });
});

describe("Semaine : du lundi au dimanche, quelle que soit la langue.", () => {
  const WEEK: Period = {
    kind: "week",
    startKey: "2026-10-12",
    endKey: "2026-10-18",
  };

  it("chaque jour de la semaine donne la même semaine", () => {
    for (const { startKey } of days("2026-10-12", "2026-10-18")) {
      expect(period("week", startKey)).toEqual(WEEK);
    }
  });

  it("le dimanche termine la semaine, le lundi suivant en ouvre une autre", () => {
    expect(period("week", "2026-10-11").endKey).toBe("2026-10-11");
    expect(period("week", "2026-10-19").startKey).toBe("2026-10-19");
  });

  it("une semaine à cheval sur deux années", () => {
    expect(period("week", "2026-12-31")).toEqual({
      kind: "week",
      startKey: "2026-12-28",
      endKey: "2027-01-03",
    });
    expect(period("week", "2027-01-03")).toEqual(period("week", "2026-12-28"));
  });

  it("une semaine qui contient le 29 février", () => {
    expect(period("week", "2028-02-29")).toEqual({
      kind: "week",
      startKey: "2028-02-28",
      endKey: "2028-03-05",
    });
  });
});

describe("Mois et année : des bornes exactes", () => {
  it("du 1er au dernier jour du mois", () => {
    expect(period("month", "2026-01-31")).toMatchObject({
      startKey: "2026-01-01",
      endKey: "2026-01-31",
    });
    expect(period("month", "2026-04-01")).toMatchObject({
      startKey: "2026-04-01",
      endKey: "2026-04-30",
    });
    expect(period("month", "2026-12-25")).toMatchObject({
      startKey: "2026-12-01",
      endKey: "2026-12-31",
    });
  });

  it("février d'une année bissextile ou non", () => {
    expect(period("month", "2028-02-10").endKey).toBe("2028-02-29");
    expect(period("month", "2026-02-10").endKey).toBe("2026-02-28");
    expect(period("month", "2000-02-01").endKey).toBe("2000-02-29");
    expect(period("month", "2100-02-01").endKey).toBe("2100-02-28");
  });

  it("du 1er janvier au 31 décembre", () => {
    expect(period("year", "2028-02-29")).toEqual({
      kind: "year",
      startKey: "2028-01-01",
      endKey: "2028-12-31",
    });
  });

  it("les premières et dernières années du calendrier", () => {
    expect(period("year", "0000-06-15")).toMatchObject({
      startKey: "0000-01-01",
      endKey: "0000-12-31",
    });
    expect(period("month", "9999-12-31")).toMatchObject({
      startKey: "9999-12-01",
      endKey: "9999-12-31",
    });
  });
});

describe("shiftPeriod", () => {
  it("0 rend la même période", () => {
    const week = period("week", "2026-10-16");
    expect(shiftPeriod(week, 0)).toEqual(week);
  });

  it("une semaine avant ou après, à travers un changement d'année", () => {
    const week = period("week", "2026-12-31");
    expect(shiftPeriod(week, 1)).toEqual({
      kind: "week",
      startKey: "2027-01-04",
      endKey: "2027-01-10",
    });
    expect(shiftPeriod(week, -1)).toEqual({
      kind: "week",
      startKey: "2026-12-21",
      endKey: "2026-12-27",
    });
    expect(shiftPeriod(week, 53)).toEqual(period("week", "2028-01-06"));
  });

  it("un mois avant ou après, à travers un changement d'année", () => {
    const december = period("month", "2026-12-15");
    expect(shiftPeriod(december, 1)).toEqual({
      kind: "month",
      startKey: "2027-01-01",
      endKey: "2027-01-31",
    });
    expect(shiftPeriod(december, -11)).toEqual(period("month", "2026-01-01"));
    expect(shiftPeriod(december, -12)).toEqual(period("month", "2025-12-01"));
    expect(shiftPeriod(period("month", "2027-01-31"), -1)).toEqual(december);
    expect(shiftPeriod(period("month", "2028-01-31"), 1)).toEqual({
      kind: "month",
      startKey: "2028-02-01",
      endKey: "2028-02-29",
    });
  });

  it("une année avant ou après", () => {
    const year = period("year", "2026-10-16");
    expect(shiftPeriod(year, 1)).toEqual(period("year", "2027-01-01"));
    expect(shiftPeriod(year, -26)).toEqual(period("year", "2000-01-01"));
  });

  it("refuse un résultat hors des années 0000 à 9999", () => {
    expect(() => shiftPeriod(period("year", "9999-01-01"), 1)).toThrow(
      /^shiftPeriod: result out of range/,
    );
    expect(() => shiftPeriod(period("year", "0000-01-01"), -1)).toThrow(
      /^shiftPeriod: result out of range/,
    );
    expect(() => shiftPeriod(period("month", "9999-12-01"), 1)).toThrow(
      /^shiftPeriod: result out of range/,
    );
    expect(() => shiftPeriod(period("month", "0000-01-01"), -1)).toThrow(
      /^shiftPeriod: result out of range/,
    );
    expect(() => shiftPeriod(period("week", "2026-10-16"), 1e10)).toThrow(
      RangeError,
    );
  });
});

describe("periodBuckets", () => {
  it("une semaine donne ses 7 journées", () => {
    expect(periodBuckets(period("week", "2026-12-31"))).toEqual(
      days("2026-12-28", "2027-01-03"),
    );
  });

  it("un mois donne ses semaines du lundi au dimanche, coupées au mois", () => {
    expect(periodBuckets(period("month", "2028-02-10"))).toEqual([
      { startKey: "2028-02-01", endKey: "2028-02-06" },
      { startKey: "2028-02-07", endKey: "2028-02-13" },
      { startKey: "2028-02-14", endKey: "2028-02-20" },
      { startKey: "2028-02-21", endKey: "2028-02-27" },
      { startKey: "2028-02-28", endKey: "2028-02-29" },
    ]);
  });

  it("un mois dont le 1er est un dimanche commence par une semaine d'un jour", () => {
    expect(periodBuckets(period("month", "2026-11-15"))).toEqual([
      { startKey: "2026-11-01", endKey: "2026-11-01" },
      { startKey: "2026-11-02", endKey: "2026-11-08" },
      { startKey: "2026-11-09", endKey: "2026-11-15" },
      { startKey: "2026-11-16", endKey: "2026-11-22" },
      { startKey: "2026-11-23", endKey: "2026-11-29" },
      { startKey: "2026-11-30", endKey: "2026-11-30" },
    ]);
  });

  it("un mois qui finit un dimanche finit par une semaine entière", () => {
    const buckets = periodBuckets(period("month", "2026-05-15"));
    expect(buckets.at(-1)).toEqual({
      startKey: "2026-05-25",
      endKey: "2026-05-31",
    });
  });

  it("une année donne ses 12 mois", () => {
    const buckets = periodBuckets(period("year", "2028-06-15"));
    expect(buckets).toHaveLength(12);
    expect(buckets).toEqual(
      Array.from({ length: 12 }, (_, index) => {
        const month = period(
          "month",
          `2028-${String(index + 1).padStart(2, "0")}-01`,
        );
        return { startKey: month.startKey, endKey: month.endKey };
      }),
    );
    expect(buckets[1]).toEqual({
      startKey: "2028-02-01",
      endKey: "2028-02-29",
    });
  });

  it("une période réduite à un jour donne une seule tranche", () => {
    const range: Period = {
      kind: "month",
      startKey: "2026-10-16",
      endKey: "2026-10-16",
    };
    expect(periodBuckets(range)).toEqual([
      { startKey: "2026-10-16", endKey: "2026-10-16" },
    ]);
  });
});

describe("Arguments", () => {
  it("shiftPeriod et periodBuckets ne modifient pas leurs arguments", () => {
    const month = Object.freeze(period("month", "2026-11-15"));
    expect(shiftPeriod(month, 1)).toEqual(period("month", "2026-12-01"));
    expect(periodBuckets(month)).toHaveLength(6);
    expect(month).toEqual(period("month", "2026-11-15"));
  });
});

describe("Entrées invalides", () => {
  const unknown = "day" as PeriodKind;

  it("period refuse un type inconnu ou une clé invalide", () => {
    expect(() => period(unknown, "2026-10-16")).toThrow(
      /^period: unknown period kind \(day\)/,
    );
    expect(() => period("week", "2026-02-30")).toThrow(
      /^period: invalid date key/,
    );
    expect(() => period("month", "16/10/2026")).toThrow(RangeError);
  });

  it("shiftPeriod refuse un décalage non entier", () => {
    const week = period("week", "2026-10-16");
    expect(() => shiftPeriod(week, 1.5)).toThrow(
      /^shiftPeriod: offset must be an integer/,
    );
    expect(() => shiftPeriod(week, Number.NaN)).toThrow(RangeError);
    expect(() => shiftPeriod(week, Infinity)).toThrow(RangeError);
  });

  it.each<[string, (range: Period) => unknown]>([
    ["shiftPeriod", (range) => shiftPeriod(range, 1)],
    ["periodBuckets", (range) => periodBuckets(range)],
  ])("%s refuse une période invalide", (fn, call) => {
    const week = period("week", "2026-10-16");
    expect(() => call({ ...week, kind: unknown })).toThrow(
      new RegExp(`^${fn}: unknown period kind`),
    );
    expect(() => call({ ...week, startKey: "2026-13-01" })).toThrow(
      new RegExp(`^${fn}: invalid date key`),
    );
    expect(() => call({ ...week, endKey: "2026-10-32" })).toThrow(
      new RegExp(`^${fn}: invalid date key`),
    );
    expect(() =>
      call({ kind: "week", startKey: "2026-10-18", endKey: "2026-10-12" }),
    ).toThrow(new RegExp(`^${fn}: period ends before it starts`));
  });
});
