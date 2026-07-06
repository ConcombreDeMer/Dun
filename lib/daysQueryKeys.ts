export const DAYS_QUERY_KEY = "days";

export const calendarDaysQueryKey = (userId: string | null) =>
  [DAYS_QUERY_KEY, userId, "calendar"] as const;

export const statsDaysQueryKey = (userId: string | null) =>
  [DAYS_QUERY_KEY, userId, "stats"] as const;
