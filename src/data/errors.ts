/*
 * Errors of the local data layer, for the callers to tell them apart.
 */

export type DataErrorCode =
  /* The row does not exist, or is soft-deleted. */
  | "not_found"
  /* Another tag that is not deleted already has this name. */
  | "duplicate_tag_name"
  /* The neighbors given to place a row are invalid. */
  | "invalid_neighbors";

export class DataError extends Error {
  readonly code: DataErrorCode;

  constructor(code: DataErrorCode, message: string) {
    super(message);
    this.name = "DataError";
    this.code = code;
  }
}

type ErrorLike = { message?: unknown; cause?: unknown };

/**
 * Whether `error`, or one of its causes, is the violation of a unique index
 * on `column` (`table.column`, as SQLite names it). Drivers may wrap the
 * SQLite error, hence the walk through `cause`. No `instanceof Error`: an
 * error thrown by a native module may come from another realm.
 */
export function isUniqueViolation(error: unknown, column: string): boolean {
  let current: unknown = error;
  while (typeof current === "object" && current !== null) {
    const { message, cause }: ErrorLike = current;
    if (
      typeof message === "string" &&
      message.includes(`UNIQUE constraint failed: ${column}`)
    ) {
      return true;
    }
    current = cause;
  }
  return false;
}
