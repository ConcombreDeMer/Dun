const APP_DATE_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function toAppDateKey(value: Date | string): string {
  if (typeof value === "string" && APP_DATE_KEY_REGEX.test(value)) {
    return value;
  }

  const date = typeof value === "string" ? new Date(value) : value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function fromAppDateKey(value: string): Date {
  if (APP_DATE_KEY_REGEX.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  return new Date(value);
}

export function isSameAppDate(left: Date | string, right: Date | string): boolean {
  return toAppDateKey(left) === toAppDateKey(right);
}
