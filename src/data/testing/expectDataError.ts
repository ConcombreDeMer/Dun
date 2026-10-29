/*
 * Assertion shared by the repository tests.
 */

import { DataError, type DataErrorCode } from "../errors";

/** `run` throws a `DataError` with `code`. */
export function expectDataError(run: () => unknown, code: DataErrorCode) {
  expect(run).toThrow(DataError);
  expect(run).toThrow(expect.objectContaining({ code }));
}
