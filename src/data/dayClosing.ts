/*
 * Closing of the days in the local database (offer: "Une journée se clôt à
 * minuit"; "À sa clôture, une journée est enregistrée avec ses tâches, leur
 * état et leurs tags").
 *
 * The rules stay in `src/domain` (`openDayKey`, `dayKeysToClose`, `closeDay`
 * through `closeDays`); the reads and writes go through the repositories.
 * The APIs are synchronous and JavaScript runs on one thread: two closings
 * never interleave, so a second `close()` right after the first one finds
 * nothing left to close.
 *
 * The anchor is the day before the first closing. It is never recorded, but
 * it is the last closed day until a day is: without it, `dayKeysToClose(null,
 * …)` returns `[]` and no day would ever be recorded. It is stored in the
 * settings, which are synced and exported.
 */

import {
  addDays,
  dayKeysToClose,
  isDateKey,
  openDayKey,
  type DateKey,
} from "../domain/date";
import { closeDays, lastClosedKey, nextDayStart } from "../domain/dayClosing";
import type { ClosingTask, RecordedTag } from "../domain/dayRecord";
import { createDayRecordRepository } from "./repositories/dayRecords";
import {
  repositoryDefaults,
  type RepositoryOptions,
} from "./repositories/repository";
import { createRestPeriodRepository } from "./repositories/restPeriods";
import { createSettingsRepository } from "./repositories/settings";
import {
  createTaskRepository,
  type TaskRepository,
} from "./repositories/tasks";
import {
  createTaskTagRepository,
  type TaskTagRepository,
} from "./repositories/taskTags";

/** Setting that holds the anchor, a `DateKey`. */
export const DAY_CLOSING_ANCHOR_KEY = "day_closing.anchor";

export type DayClosingOptions = RepositoryOptions & {
  /** IANA time zone of the iPhone, read again at each call. */
  timeZone?: () => string;
};

export type DayClosingResult = {
  /** The open day, after the closing. */
  openKey: DateKey;
  /** The days recorded by this closing, in order (`[]` if none). */
  closedKeys: DateKey[];
};

/* The time zone of the iPhone: it changes on a journey. */
const deviceTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * The tasks dated from `startKey` to `endKey` included, not deleted, with
 * their tags: what `closeDay` needs.
 */
function readClosingTasks(
  tasks: TaskRepository,
  taskTags: TaskTagRepository,
  startKey: DateKey,
  endKey: DateKey,
): ClosingTask[] {
  const rows = tasks.listRange(startKey, endKey).all();

  const tagsByTask = new Map<string, RecordedTag[]>();
  const links = taskTags.listForTasks(rows.map((row) => row.id)).all();
  for (const { taskId, tag } of links) {
    const list = tagsByTask.get(taskId) ?? [];
    list.push({ name: tag.name, color: tag.color });
    tagsByTask.set(taskId, list);
  }

  return rows.map(({ id, name, date, done }) => ({
    id,
    name,
    date,
    done,
    tags: tagsByTask.get(id) ?? [],
  }));
}

export function createDayClosing(options: DayClosingOptions) {
  const { now } = repositoryDefaults(options);
  const timeZone = options.timeZone ?? deviceTimeZone;

  /* Repositories on a clock stopped at `at`, so `now()` is read once. */
  function repositories(at: Date) {
    const fixed = { ...options, now: () => at };
    return {
      settings: createSettingsRepository(fixed),
      dayRecords: createDayRecordRepository(fixed),
      tasks: createTaskRepository(fixed),
      taskTags: createTaskTagRepository(fixed),
      restPeriods: createRestPeriodRepository(fixed),
    };
  }

  return {
    /**
     * Records the closed days since the last closing, in one batch, and
     * returns the open day and the days recorded.
     *
     * The first closing, without anchor nor record, records nothing: it sets
     * the anchor to the day before the open day.
     *
     * Throws a `RangeError` if the anchor is not a `DateKey`, before any
     * write, and the errors of the repositories (`already_recorded`…).
     */
    close(): DayClosingResult {
      const at = now();
      const zone = timeZone();
      const repos = repositories(at);

      const anchor = repos.settings.get(DAY_CLOSING_ANCHOR_KEY).get()?.value;
      if (
        anchor !== undefined &&
        (typeof anchor !== "string" || !isDateKey(anchor))
      ) {
        throw new RangeError(
          `dayClosing.close: invalid anchor (${JSON.stringify(anchor)})`,
        );
      }
      const lastRecorded = repos.dayRecords.lastKey().get()?.key;

      if (anchor === undefined && lastRecorded === undefined) {
        const openKey = openDayKey(at, zone, null);
        repos.settings.set(DAY_CLOSING_ANCHOR_KEY, addDays(openKey, -1));
        return { openKey, closedKeys: [] };
      }

      const last = lastClosedKey(anchor ?? null, lastRecorded ?? null);
      const openKey = openDayKey(at, zone, last);
      const keys = dayKeysToClose(last, openKey);
      if (keys.length === 0) {
        return { openKey, closedKeys: [] };
      }

      const records = closeDays(
        readClosingTasks(
          repos.tasks,
          repos.taskTags,
          keys[0],
          keys[keys.length - 1],
        ),
        repos.restPeriods.list().all(),
        last,
        openKey,
      );
      repos.dayRecords.record(records);
      return { openKey, closedKeys: records.map((record) => record.key) };
    },

    /** Milliseconds until the next local midnight, for the refresh. */
    msUntilRefresh(): number {
      const at = now();
      return nextDayStart(at, timeZone()).getTime() - at.getTime();
    },
  };
}

export type DayClosing = ReturnType<typeof createDayClosing>;
