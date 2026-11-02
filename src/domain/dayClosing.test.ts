import { closeDays, lastClosedKey, nextDayStart } from "./dayClosing";
import type { ClosingTask } from "./dayRecord";

const PARIS = "Europe/Paris";
const NEW_YORK = "America/New_York";
/* In Chile, the clocks change at midnight. */
const SANTIAGO = "America/Santiago";

/*
 * Instants are written with an explicit UTC offset, so the tests do not
 * depend on the time zone of the machine that runs them.
 */
const at = (iso: string) => new Date(iso);

const task = (
  id: string,
  date: string | null,
  done: boolean,
  tags: ClosingTask["tags"] = [],
): ClosingTask => ({ id, name: `Task ${id}`, date, done, tags });

describe("lastClosedKey", () => {
  it("is null without anchor nor record", () => {
    expect(lastClosedKey(null, null)).toBeNull();
  });

  it("is the anchor without record, the record without anchor", () => {
    expect(lastClosedKey("2026-10-27", null)).toBe("2026-10-27");
    expect(lastClosedKey(null, "2026-10-28")).toBe("2026-10-28");
  });

  it("is the later of both keys", () => {
    expect(lastClosedKey("2026-10-27", "2026-10-28")).toBe("2026-10-28");
    expect(lastClosedKey("2026-10-29", "2026-10-28")).toBe("2026-10-29");
    expect(lastClosedKey("2026-10-28", "2026-10-28")).toBe("2026-10-28");
  });

  it("refuses an invalid key", () => {
    expect(() => lastClosedKey("2026-10-32", null)).toThrow(RangeError);
    expect(() => lastClosedKey(null, "28/10/2026")).toThrow(
      /^lastClosedKey: invalid date key \(28\/10\/2026\)$/,
    );
    expect(() => lastClosedKey("2026-10-27", "2026-02-30")).toThrow(RangeError);
  });
});

describe("closeDays", () => {
  const tasks = [
    task("a", "2026-10-27", true, [{ name: "Sport", color: "#ff0000" }]),
    task("b", "2026-10-28", false),
    task("c", "2026-10-28", true),
    task("d", null, false),
    task("e", "2026-10-30", false),
  ];

  it("records each day from the day after the last closed day to the day before the open day", () => {
    expect(closeDays(tasks, [], "2026-10-26", "2026-10-30")).toEqual([
      {
        key: "2026-10-27",
        status: "success",
        tasks: [
          {
            id: "a",
            name: "Task a",
            done: true,
            tags: [{ name: "Sport", color: "#ff0000" }],
          },
        ],
      },
      {
        key: "2026-10-28",
        status: "failed",
        tasks: [
          { id: "b", name: "Task b", done: false, tags: [] },
          { id: "c", name: "Task c", done: true, tags: [] },
        ],
      },
      { key: "2026-10-29", status: "empty", tasks: [] },
    ]);
  });

  it("gives the status rest to a day of rest", () => {
    const rest = [{ startKey: "2026-10-28", endKey: "2026-10-28" }];

    expect(
      closeDays(tasks, rest, "2026-10-27", "2026-10-29").map((r) => r.status),
    ).toEqual(["rest"]);
  });

  it("is empty when nothing is left to close", () => {
    expect(closeDays(tasks, [], "2026-10-29", "2026-10-30")).toEqual([]);
    expect(closeDays(tasks, [], "2026-10-30", "2026-10-30")).toEqual([]);
  });

  it("is empty without a last closed day", () => {
    expect(closeDays(tasks, [], null, "2026-10-30")).toEqual([]);
  });

  it("refuses an invalid key", () => {
    expect(() => closeDays(tasks, [], "2026-10-26", "2026-10-32")).toThrow(
      RangeError,
    );
    expect(() => closeDays(tasks, [], "2026-13-01", "2026-10-30")).toThrow(
      RangeError,
    );
  });

  it("refuses an invalid rest period", () => {
    const rest = [{ startKey: "2026-10-29", endKey: "2026-10-28" }];

    expect(() => closeDays(tasks, rest, "2026-10-26", "2026-10-30")).toThrow(
      RangeError,
    );
  });
});

describe("nextDayStart", () => {
  it("is the next midnight in Paris", () => {
    expect(nextDayStart(at("2026-10-15T14:00:00+02:00"), PARIS)).toEqual(
      at("2026-10-16T00:00:00.000+02:00"),
    );
  });

  it("is strictly after now, to the millisecond", () => {
    expect(nextDayStart(at("2026-10-15T23:59:59.999+02:00"), PARIS)).toEqual(
      at("2026-10-16T00:00:00.000+02:00"),
    );
    expect(nextDayStart(at("2026-10-16T00:00:00.000+02:00"), PARIS)).toEqual(
      at("2026-10-17T00:00:00.000+02:00"),
    );
  });

  it("follows the daylight saving changes in Paris", () => {
    /* The 29th of March 2026 lasts 23 hours, the 25th of October 25 hours. */
    expect(nextDayStart(at("2026-03-28T12:00:00+01:00"), PARIS)).toEqual(
      at("2026-03-29T00:00:00.000+01:00"),
    );
    expect(nextDayStart(at("2026-03-29T01:00:00+01:00"), PARIS)).toEqual(
      at("2026-03-30T00:00:00.000+02:00"),
    );
    expect(nextDayStart(at("2026-10-25T01:00:00+02:00"), PARIS)).toEqual(
      at("2026-10-26T00:00:00.000+01:00"),
    );
  });

  it("starts the day at 01:00 when the clocks go forward at midnight", () => {
    /* In Santiago, on the 6th of September 2026, 00:00 becomes 01:00. */
    expect(nextDayStart(at("2026-09-05T12:00:00-04:00"), SANTIAGO)).toEqual(
      at("2026-09-06T01:00:00.000-03:00"),
    );
  });

  it("gives the second midnight when the clocks go back at midnight", () => {
    /*
     * In Santiago, on the 4th of April 2026, midnight (-03:00) becomes 23:00
     * (-04:00): the 5th starts at the second midnight.
     */
    expect(nextDayStart(at("2026-04-04T12:00:00-03:00"), SANTIAGO)).toEqual(
      at("2026-04-05T00:00:00.000-04:00"),
    );
  });

  it("follows the time zone given, after a flight from Paris to New York", () => {
    /* 22:30 UTC: 00:30 the 16th in Paris, 18:30 the 15th in New York. */
    const instant = at("2026-10-15T22:30:00Z");

    expect(nextDayStart(instant, PARIS)).toEqual(
      at("2026-10-17T00:00:00.000+02:00"),
    );
    expect(nextDayStart(instant, NEW_YORK)).toEqual(
      at("2026-10-16T00:00:00.000-04:00"),
    );
  });

  it("refuses an invalid date and an unknown time zone", () => {
    expect(() => nextDayStart(new Date(Number.NaN), PARIS)).toThrow(RangeError);
    expect(() =>
      nextDayStart(at("2026-10-15T14:00:00Z"), "Europe/Nowhere"),
    ).toThrow(RangeError);
  });

  it("refuses a date whose next day is out of range", () => {
    expect(() => nextDayStart(at("9999-12-30T12:00:00Z"), "UTC")).toThrow(
      RangeError,
    );
  });
});
