const PUBLIC_TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

const parsePublicBoolean = (value: string | undefined, fallback = false) => {
  const normalizedValue = value?.trim().toLowerCase();

  if (!normalizedValue) {
    return fallback;
  }

  return PUBLIC_TRUE_VALUES.has(normalizedValue);
};

export const REQUIRE_PREMIUM_ACCESS = parsePublicBoolean(
  process.env.EXPO_PUBLIC_REQUIRE_PREMIUM_ACCESS,
  false
);

export const FREE_DAILY_TASK_LIMIT = 6;
export const FREE_TAG_LIMIT = 2;
export const MAX_TAGS_PER_TASK = 3;

export const FREE_PLAN_LIMITS = {
  dailyTaskLimit: FREE_DAILY_TASK_LIMIT,
  tagLimit: FREE_TAG_LIMIT,
  maxTagsPerTask: MAX_TAGS_PER_TASK,
} as const;

export const canAccessAppWithoutPremium = !REQUIRE_PREMIUM_ACCESS;
