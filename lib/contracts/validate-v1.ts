import type { SnapshotV1 } from './data-v1';

type Row = Record<string, unknown>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const BASE = ['id', 'spaceId', 'createdAt', 'updatedAt', 'deletedAt', 'serverRevision'];
const TASK = ['name', 'description', 'day', 'order', 'done', 'completedAt', 'resolvedAt', 'resolution', 'carriedFromId', 'delayCount', 'lateAdjustedAt', 'tagIds'];
const PREF = ['displayName', 'onboardingCompletedAt', 'dailyEnabled', 'lockPastDaysEnabled', 'language', 'theme', 'textSize', 'palette', 'calendar', 'progress', 'stackCompletedTasks', 'statsVisibility', 'reminders'];

function fail(path: string): never { throw new Error(`Invalid Dun v1 contract: ${path}`); }
function row(value: unknown, keys: string[], path: string): Row {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(path);
  const record = value as Row;
  if (Object.keys(record).length !== keys.length || keys.some(k => !Object.hasOwn(record, k))) fail(`${path}.fields`);
  return record;
}
function text(value: unknown, path: string): asserts value is string {
  if (typeof value !== 'string') fail(path);
}
function id(value: unknown, path: string): asserts value is string {
  if (typeof value !== 'string' || !UUID.test(value)) fail(path);
}
function bool(value: unknown, path: string) { if (typeof value !== 'boolean') fail(path); }
function integer(value: unknown, min: number, max: number, path: string) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) fail(path);
}
function oneOf(value: unknown, values: unknown[], path: string) { if (!values.includes(value)) fail(path); }
export function isDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '0001-01-01') return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function day(value: unknown, path: string) { if (!isDateKey(value)) fail(path); }
function instant(value: unknown, path: string): asserts value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) fail(path);
  if (!isDateKey(value.slice(0, 10))) fail(path);
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== value) fail(path);
}
function optionalInstant(value: unknown, path: string) { if (value !== null) instant(value, path); }
function list(value: unknown, path: string): unknown[] { if (!Array.isArray(value)) fail(path); return value; }
function entity(value: unknown, fields: string[], spaceId: unknown, path: string): Row {
  const r = row(value, [...BASE, ...fields], path);
  id(r.id, `${path}.id`);
  if (r.spaceId !== spaceId) fail(`${path}.spaceId`);
  instant(r.createdAt, `${path}.createdAt`);
  instant(r.updatedAt, `${path}.updatedAt`);
  optionalInstant(r.deletedAt, `${path}.deletedAt`);
  if (r.updatedAt < r.createdAt || (r.deletedAt !== null && ((r.deletedAt as string) < r.createdAt || (r.deletedAt as string) > r.updatedAt))) fail(`${path}.chronology`);
  if (r.serverRevision !== null && (typeof r.serverRevision !== 'string' || !/^(0|[1-9]\d*)$/.test(r.serverRevision))) fail(`${path}.serverRevision`);
  return r;
}
function unique(values: unknown[], path: string) { if (new Set(values).size !== values.length) fail(`${path}.duplicate`); }

/** Boundary validation only: no database, entitlement decision or side effect. */
export function validateSnapshotV1(input: unknown): SnapshotV1 {
  const root = row(input, ['format', 'formatVersion', 'exportedAt', 'source', 'tasks', 'tags', 'days', 'restPeriods', 'objective', 'preferences'], 'snapshot');
  if (root.format !== 'dun-productivity' || root.formatVersion !== 1) fail('formatVersion');
  instant(root.exportedAt, 'exportedAt');
  const source = row(root.source, ['spaceId', 'ownerId', 'generation'], 'source');
  id(source.spaceId, 'source.spaceId'); id(source.generation, 'source.generation');
  if (source.ownerId !== null) id(source.ownerId, 'source.ownerId');
  const tags = list(root.tags, 'tags').map((v, i) => {
    const r = entity(v, ['name', 'color'], source.spaceId, `tags[${i}]`);
    text(r.name, 'tag.name'); text(r.color, 'tag.color'); return r;
  });
  const tagsById = new Map(tags.map(t => [t.id, t]));
  const tasks = list(root.tasks, 'tasks').map((v, i) => {
    const p = `tasks[${i}]`; const r = entity(v, TASK, source.spaceId, p);
    text(r.name, `${p}.name`); text(r.description, `${p}.description`);
    if (r.day !== null) day(r.day, `${p}.day`);
    integer(r.order, 0, Number.MAX_SAFE_INTEGER, `${p}.order`);
    integer(r.delayCount, 0, Number.MAX_SAFE_INTEGER, `${p}.delayCount`);
    bool(r.done, `${p}.done`);
    for (const key of ['completedAt', 'resolvedAt', 'lateAdjustedAt']) optionalInstant(r[key], `${p}.${key}`);
    if (r.done !== (r.completedAt !== null)) fail(`${p}.completion`);
    oneOf(r.resolution, [null, 'deleted', 'postponed', 'late_completed', 'ignored'], `${p}.resolution`);
    if ((r.resolution === null) !== (r.resolvedAt === null)) fail(`${p}.resolutionDate`);
    if (r.carriedFromId !== null) id(r.carriedFromId, `${p}.carriedFromId`);
    const links = list(r.tagIds, `${p}.tagIds`); unique(links, `${p}.tagIds`);
    if (links.length > 3) fail(`${p}.tagLimit`);
    for (const link of links) {
      id(link, `${p}.tagId`);
      const tag = tagsById.get(link);
      if (!tag || (r.deletedAt === null && tag.deletedAt !== null)) fail(`${p}.tagReference`);
    }
    return r;
  });
  const tasksById = new Map(tasks.map(t => [t.id, t]));
  for (const task of tasks) {
    // Iterative walk: avoid recursion over arbitrarily long report chains.
    const seen = new Set<unknown>([task.id]); let parent = task.carriedFromId;
    while (parent !== null) {
      if (seen.has(parent) || !tasksById.has(parent)) fail('task.carriedFromId');
      seen.add(parent); parent = tasksById.get(parent)!.carriedFromId;
    }
  }
  const days = list(root.days, 'days').map((v, i) => {
    const r = entity(v, ['date', 'timeZone', 'closedAt', 'isRest', 'dailyReviewedAt'], source.spaceId, `days[${i}]`);
    day(r.date, 'day.date'); text(r.timeZone, 'day.timeZone');
    if (/^[+-]/.test(r.timeZone)) fail('day.timeZone');
    try { new Intl.DateTimeFormat('en', { timeZone: r.timeZone }).format(0); } catch { fail('day.timeZone'); }
    if (r.deletedAt !== null) fail('day.deletedAt'); // Closing facts are not user-deletable records.
    optionalInstant(r.closedAt, 'day.closedAt'); optionalInstant(r.dailyReviewedAt, 'day.dailyReviewedAt');
    bool(r.isRest, 'day.isRest'); return r;
  });
  unique(days.map(d => d.date), 'days.date');
  const dayKeys = new Set(days.map(d => d.date));
  for (const task of tasks) if (task.day !== null && !dayKeys.has(task.day)) fail('task.dayReference');
  const rests = list(root.restPeriods, 'restPeriods').map((v, i) => {
    const r = entity(v, ['startDate', 'endDate', 'activatedAt', 'cancelledAt'], source.spaceId, `restPeriods[${i}]`);
    day(r.startDate, 'rest.startDate'); day(r.endDate, 'rest.endDate');
    if ((r.endDate as string) < (r.startDate as string)) fail('rest.range');
    instant(r.activatedAt, 'rest.activatedAt'); optionalInstant(r.cancelledAt, 'rest.cancelledAt');
    if (r.cancelledAt !== null && (r.cancelledAt as string) < r.activatedAt) fail('rest.cancelledAt');
    return r;
  });
  let objective: Row | null = null;
  if (root.objective !== null) {
    objective = entity(root.objective, ['target', 'confirmedAt', 'startDate', 'firstAchievedAt', 'firstAchievedDate'], source.spaceId, 'objective');
    oneOf(objective.target, [1, 2, 3, 4, 7, 14], 'objective.target');
    instant(objective.confirmedAt, 'objective.confirmedAt'); day(objective.startDate, 'objective.startDate');
    if (objective.deletedAt !== null || !dayKeys.has(objective.startDate)) fail('objective.start');
    optionalInstant(objective.firstAchievedAt, 'objective.firstAchievedAt');
    if ((objective.firstAchievedAt === null) !== (objective.firstAchievedDate === null)) fail('objective.achievement');
    if (objective.firstAchievedDate !== null) {
      day(objective.firstAchievedDate, 'objective.firstAchievedDate');
      const achievedDay = days.find(d => d.date === objective!.firstAchievedDate);
      if (!achievedDay || achievedDay.closedAt === null || (objective.firstAchievedDate as string) < (objective.startDate as string) || (objective.firstAchievedAt as string) < objective.confirmedAt || (objective.firstAchievedAt as string) < (achievedDay.closedAt as string)) fail('objective.achievement');
    }
  }
  const pref = entity(root.preferences, PREF, source.spaceId, 'preferences');
  if (pref.deletedAt !== null) fail('preferences.deletedAt');
  text(pref.displayName, 'preferences.displayName'); text(pref.palette, 'preferences.palette');
  optionalInstant(pref.onboardingCompletedAt, 'preferences.onboardingCompletedAt');
  for (const k of ['dailyEnabled', 'lockPastDaysEnabled', 'stackCompletedTasks']) bool(pref[k], `preferences.${k}`);
  oneOf(pref.language, ['fr', 'en'], 'preferences.language');
  oneOf(pref.theme, ['light', 'dark', 'system'], 'preferences.theme');
  oneOf(pref.textSize, ['small', 'medium', 'large'], 'preferences.textSize');
  oneOf(pref.calendar, ['slider', 'text'], 'preferences.calendar');
  oneOf(pref.progress, ['linear', 'circular'], 'preferences.progress');
  const visibility = row(pref.statsVisibility, ['today', 'future', 'empty', 'rest'], 'statsVisibility');
  Object.entries(visibility).forEach(([k, v]) => bool(v, `statsVisibility.${k}`));
  const reminders = row(pref.reminders, ['enabled', 'hour', 'minute', 'weekdays', 'repetitionsEnabled', 'repetitions', 'delayMinutes'], 'reminders');
  bool(reminders.enabled, 'reminders.enabled'); bool(reminders.repetitionsEnabled, 'reminders.repetitionsEnabled');
  integer(reminders.hour, 0, 23, 'reminders.hour'); integer(reminders.minute, 0, 59, 'reminders.minute');
  integer(reminders.repetitions, 1, 3, 'reminders.repetitions'); integer(reminders.delayMinutes, 15, 240, 'reminders.delayMinutes');
  const weekdays = list(reminders.weekdays, 'weekdays'); unique(weekdays, 'weekdays'); weekdays.forEach(d => integer(d, 1, 7, 'weekday'));
  const all = [...tags, ...tasks, ...days, ...rests, pref, ...(objective ? [objective] : [])];
  unique(all.map(r => r.id), 'entities.id');
  // Unknown fields (including credentials/entitlement/caches) were rejected above.
  return input as SnapshotV1;
}
