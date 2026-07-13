export const NOTIFICATION_REMINDER_LIMITS = {
  delayMinutes: {
    min: 15,
    max: 240,
  },
  repetitions: {
    min: 1,
    max: 3,
  },
} as const;

export function sanitizeNumericInput(value: string, maxLength: number) {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

export function parseIntegerInput(value: string | number | null | undefined) {
  const parsed = Number.parseInt(`${value ?? ""}`, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function clampInteger(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function normalizeIntegerInput(
  value: string | number | null | undefined,
  min: number,
  max: number,
) {
  const parsed = parseIntegerInput(value);

  if (parsed === null) {
    return "";
  }

  return `${clampInteger(parsed, min, max)}`;
}
