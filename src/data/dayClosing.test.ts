import { nextDayStart } from "../domain/dayClosing";
import type { LocalDatabase } from "./database";
import {
  createDayClosing,
  DAY_CLOSING_ANCHOR_KEY,
  type DayClosing,
} from "./dayClosing";
import { createDayRecordRepository } from "./repositories/dayRecords";
import { createRestPeriodRepository } from "./repositories/restPeriods";
import { createSettingsRepository } from "./repositories/settings";
import { createTagRepository } from "./repositories/tags";
import { createTaskRepository } from "./repositories/tasks";
import { createTaskTagRepository } from "./repositories/taskTags";
import { settings } from "./schema";
import { createTestDatabase } from "./testing/testDatabase";
import { idSequence } from "./testing/testClock";

const PARIS = "Europe/Paris";
const NEW_YORK = "America/New_York";

/*
 * October 2026, in Paris (+01:00 since the 25th). Instants are written with
 * an explicit offset, so the tests do not depend on the machine time zone.
 */
const WED_28 = "2026-10-28";
const THU_29 = "2026-10-29";
const FRI_30 = "2026-10-30";
const SAT_31 = "2026-10-31";
const SUN_1 = "2026-11-01";

let db: LocalDatabase;
let time: Date;
let zone: string;
let closing: DayClosing;
let newId: () => string;

const now = () => time;
/* The repositories of the test, on the same clock and the same ids. */
const repos = () => {
  const options = { db, now, newId };
  return {
    tasks: createTaskRepository(options),
    tags: createTagRepository(options),
    taskTags: createTaskTagRepository(options),
    restPeriods: createRestPeriodRepository(options),
    dayRecords: createDayRecordRepository(options),
    settings: createSettingsRepository(options),
  };
};

/* Thursday 29th, 9:00 in Paris: the first closing sets the anchor. */
beforeEach(() => {
  db = createTestDatabase();
  time = new Date("2026-10-29T09:00:00+01:00");
  zone = PARIS;
  newId = idSequence("id");
  closing = createDayClosing({
    db,
    now,
    newId: idSequence("day"),
    timeZone: () => zone,
  });
});

const records = () =>
  repos()
    .dayRecords.list()
    .all()
    .map(({ key, status, tasks }) => ({ key, status, tasks }));

const anchor = () => repos().settings.get(DAY_CLOSING_ANCHOR_KEY).get()?.value;

describe("the first closing", () => {
  it("sets the anchor to the day before, records nothing and gives the local day", () => {
    expect(closing.close()).toEqual({ openKey: THU_29, closedKeys: [] });

    expect(anchor()).toBe(WED_28);
    expect(records()).toEqual([]);
  });

  it("keeps the anchor afterwards", () => {
    closing.close();
    time = new Date("2026-10-30T09:00:00+01:00");

    closing.close();

    expect(anchor()).toBe(WED_28);
  });

  it("does not set the anchor when a day is already recorded", () => {
    repos().dayRecords.record([{ key: WED_28, status: "empty", tasks: [] }]);

    expect(closing.close()).toEqual({ openKey: THU_29, closedKeys: [] });
    expect(anchor()).toBeUndefined();
  });
});

describe("the next closings", () => {
  beforeEach(() => {
    closing.close();
  });

  it("record the days since the day after the anchor: status, snapshot and tags", () => {
    const { tasks, tags, taskTags } = repos();
    const sport = tags.create({ name: "Sport", color: "#ff0000" });
    const home = tags.create({ name: "Maison", color: "#00ff00" });
    const run = tasks.create({ name: "Courir", date: THU_29 });
    tasks.update(run.id, { done: true });
    taskTags.setForTask(run.id, [sport.id, home.id]);
    const letter = tasks.create({ name: "Lettre", date: FRI_30 });
    const shop = tasks.create({ name: "Courses", date: FRI_30 });
    tasks.update(shop.id, { done: true });
    tasks.create({ name: "Plus tard", date: SUN_1 });
    time = new Date("2026-11-01T10:00:00+01:00");

    expect(closing.close()).toEqual({
      openKey: SUN_1,
      closedKeys: [THU_29, FRI_30, SAT_31],
    });
    expect(records()).toEqual([
      {
        key: THU_29,
        status: "success",
        tasks: [
          {
            id: run.id,
            name: "Courir",
            done: true,
            tags: [
              { name: "Maison", color: "#00ff00" },
              { name: "Sport", color: "#ff0000" },
            ],
          },
        ],
      },
      {
        key: FRI_30,
        status: "failed",
        tasks: [
          { id: shop.id, name: "Courses", done: true, tags: [] },
          { id: letter.id, name: "Lettre", done: false, tags: [] },
        ],
      },
      /* An empty day, which counts as a failure for the goal. */
      { key: SAT_31, status: "empty", tasks: [] },
    ]);
  });

  it("give the status rest to the days of a rest", () => {
    repos().restPeriods.start(THU_29, FRI_30);
    repos().tasks.create({ name: "Courir", date: FRI_30 });
    time = new Date("2026-10-31T10:00:00+01:00");

    closing.close();

    expect(records().map(({ key, status }) => [key, status])).toEqual([
      [THU_29, "rest"],
      [FRI_30, "rest"],
    ]);
  });

  it("leave out the tasks of the Box and the deleted tasks", () => {
    const { tasks } = repos();
    tasks.create({ name: "Un jour", date: null });
    const deleted = tasks.create({ name: "Supprimée", date: THU_29 });
    tasks.remove(deleted.id);
    time = new Date("2026-10-30T10:00:00+01:00");

    closing.close();

    expect(records()).toEqual([{ key: THU_29, status: "empty", tasks: [] }]);
  });

  it("a second closing right after has no effect", () => {
    time = new Date("2026-10-31T10:00:00+01:00");
    closing.close();

    expect(closing.close()).toEqual({ openKey: SAT_31, closedKeys: [] });
    expect(records().map(({ key }) => key)).toEqual([THU_29, FRI_30]);
  });

  it("start from the latest recorded day when it is after the anchor", () => {
    repos().dayRecords.record([{ key: FRI_30, status: "empty", tasks: [] }]);
    time = new Date("2026-11-01T10:00:00+01:00");

    expect(closing.close()).toEqual({ openKey: SUN_1, closedKeys: [SAT_31] });
  });

  it("keep the open day ahead after a flight west", () => {
    /* 00:30 the 30th in Paris: the 29th closes. */
    time = new Date("2026-10-30T00:30:00+01:00");
    expect(closing.close()).toEqual({ openKey: FRI_30, closedKeys: [THU_29] });

    /* Fifteen minutes later in New York, it is 19:45 on the 29th. */
    time = new Date("2026-10-29T19:45:00-04:00");
    zone = NEW_YORK;

    expect(closing.close()).toEqual({ openKey: FRI_30, closedKeys: [] });
    expect(records().map(({ key }) => key)).toEqual([THU_29]);
  });

  it("do not record the task done after midnight in the day before", () => {
    const task = repos().tasks.create({ name: "Courir", date: THU_29 });
    /* The screen stayed open: the task is checked at 00:01. */
    time = new Date("2026-10-30T00:01:00+01:00");

    closing.close();
    repos().tasks.update(task.id, { done: true });

    expect(records()).toEqual([
      {
        key: THU_29,
        status: "failed",
        tasks: [{ id: task.id, name: "Courir", done: false, tags: [] }],
      },
    ]);
    expect(repos().tasks.get(task.id).get()?.done).toBe(true);
  });
});

describe("a corrupted anchor", () => {
  it.each([["29/10/2026"], ["2026-02-30"], [42], [{ key: WED_28 }]])(
    "throws a RangeError and writes nothing (%j)",
    (value) => {
      repos().settings.set(DAY_CLOSING_ANCHOR_KEY, value);
      const before = db.select().from(settings).all();
      time = new Date("2026-11-01T10:00:00+01:00");

      expect(() => closing.close()).toThrow(
        /^dayClosing\.close: invalid anchor/,
      );
      expect(() => closing.close()).toThrow(RangeError);
      expect(records()).toEqual([]);
      expect(db.select().from(settings).all()).toEqual(before);
    },
  );
});

describe("the clock", () => {
  it("is read once per closing", () => {
    const clock = jest.fn(now);
    const counted = createDayClosing({ db, now: clock, timeZone: () => zone });

    counted.close();
    expect(clock).toHaveBeenCalledTimes(1);

    time = new Date("2026-10-31T10:00:00+01:00");
    counted.close();
    expect(clock).toHaveBeenCalledTimes(2);
  });
});

describe("msUntilRefresh", () => {
  it("is the delay until the next local midnight", () => {
    /* 9:00 in Paris: midnight is fifteen hours away. */
    expect(closing.msUntilRefresh()).toBe(15 * 60 * 60 * 1000);

    zone = NEW_YORK;
    /* 4:00 in New York: midnight is twenty hours away. */
    expect(closing.msUntilRefresh()).toBe(20 * 60 * 60 * 1000);
  });

  it("follows the time zone of the iPhone by default", () => {
    const local = createDayClosing({ db, now });
    const deviceZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    expect(local.msUntilRefresh()).toBe(
      nextDayStart(time, deviceZone).getTime() - time.getTime(),
    );
  });
});
