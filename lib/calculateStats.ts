export type StatsPeriod = "Par semaine" | "Par mois" | "Par année" | "Global";

export type StatsPreferences = {
  includeToday: boolean;
  includeFutureDays: boolean;
  includeEmptyDays: boolean;
  includeRestDays: boolean;
};

export type StatsPreferenceKey = keyof StatsPreferences;

export type StatsDay = {
  date: string;
  done_count?: number | null;
  late_adjusted_count?: number | null;
  total?: number | null;
  is_rest?: boolean | null;
  isRest?: boolean | null;
  isRestDay?: boolean | null;
  rest?: boolean | null;
  rest_day?: boolean | null;
  status?: string | null;
  type?: string | null;
};

export type CalculatedStats = {
  totalDoneCount: number;
  perfectDaysCount: number;
  completion: string;
  charge: number;
  includedDaysCount: number;
  lateAdjustedTasksCount: number;
  lateAdjustmentRate: string;
  totalTasksCount: number;
};

export const DEFAULT_STATS_PREFERENCES: StatsPreferences = {
  includeToday: true,
  includeFutureDays: true,
  includeEmptyDays: true,
  includeRestDays: true,
};

const DAY_IN_MS = 1000 * 60 * 60 * 24;

export const normalizeDate = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

export const toDateKey = (date: Date) => normalizeDate(date).toDateString();

export const createEmptyStatsDay = (date: Date): StatsDay => ({
  date: normalizeDate(date).toISOString(),
  done_count: 0,
  total: 0,
});

export const isRestDay = (day: StatsDay) => {
  const status = `${day.status || day.type || ""}`.toLowerCase();

  return Boolean(
    day.is_rest ||
    day.isRest ||
    day.isRestDay ||
    day.rest ||
    day.rest_day ||
    status === "rest" ||
    status === "repos"
  );
};

export const isEmptyDay = (day: StatsDay) => {
  const done = Math.max(day.done_count || 0, 0);
  const total = Math.max(day.total || 0, 0);

  return !isRestDay(day) && done === 0 && total === 0;
};

export const shouldIncludeStatsDay = (
  day: StatsDay,
  preferences: StatsPreferences = DEFAULT_STATS_PREFERENCES,
  today: Date = new Date()
) => {
  const dayDate = normalizeDate(new Date(day.date));
  const todayDate = normalizeDate(today);

  if (!preferences.includeToday && dayDate.getTime() === todayDate.getTime()) {
    return false;
  }

  if (!preferences.includeFutureDays && dayDate.getTime() > todayDate.getTime()) {
    return false;
  }

  if (!preferences.includeEmptyDays && isEmptyDay(day)) {
    return false;
  }

  if (!preferences.includeRestDays && isRestDay(day)) {
    return false;
  }

  return true;
};

export const filterStatsDays = (
  days: StatsDay[],
  preferences: StatsPreferences = DEFAULT_STATS_PREFERENCES,
  today: Date = new Date()
) => days.filter((day) => shouldIncludeStatsDay(day, preferences, today));

export const calculateStats = (
  days: StatsDay[],
  preferences: StatsPreferences = DEFAULT_STATS_PREFERENCES,
  today: Date = new Date()
): CalculatedStats => {
  const includedDays = filterStatsDays(days, preferences, today);

  let totalDoneCount = 0;
  let lateAdjustedTasksCount = 0;
  let perfectDaysCount = 0;
  let totalTasks = 0;

  for (const day of includedDays) {
    const total = Math.max(day.total || 0, 0);
    const done = Math.min(Math.max(day.done_count || 0, 0), total);

    totalDoneCount += done;
    lateAdjustedTasksCount += Math.min(Math.max(day.late_adjusted_count || 0, 0), total);
    totalTasks += total;

    if (total > 0 && done === total) {
      perfectDaysCount++;
    }
  }

  const averageCharge = includedDays.length > 0
    ? Math.round((totalTasks / includedDays.length) * 10) / 10
    : 0;
  const completionValue = totalTasks > 0 ? Math.round((totalDoneCount / totalTasks) * 100) : 0;
  const lateAdjustmentValue = totalTasks > 0 ? Math.round((lateAdjustedTasksCount / totalTasks) * 100) : 0;

  return {
    totalDoneCount,
    perfectDaysCount,
    completion: `${completionValue}%`,
    charge: averageCharge,
    includedDaysCount: includedDays.length,
    lateAdjustedTasksCount,
    lateAdjustmentRate: `${lateAdjustmentValue}%`,
    totalTasksCount: totalTasks,
  };
};

export const buildDaysMap = (days: StatsDay[]) => {
  const map = new Map<string, StatsDay>();

  for (const day of days) {
    map.set(toDateKey(new Date(day.date)), day);
  }

  return map;
};

export const buildDaysBetween = (
  startDate: Date,
  endDate: Date,
  daysMap: Map<string, StatsDay>
) => {
  const days: StatsDay[] = [];

  for (
    let cursor = normalizeDate(startDate);
    cursor <= normalizeDate(endDate);
    cursor = new Date(cursor.getTime() + DAY_IN_MS)
  ) {
    days.push(daysMap.get(toDateKey(cursor)) || createEmptyStatsDay(cursor));
  }

  return days;
};

export const getGlobalStatsDays = (days: StatsDay[], today: Date = new Date()) => {
  if (days.length === 0) return [];

  const daysMap = buildDaysMap(days);
  const sortedDates = days
    .map((day) => normalizeDate(new Date(day.date)))
    .sort((a, b) => a.getTime() - b.getTime());

  return buildDaysBetween(sortedDates[0], today, daysMap);
};
