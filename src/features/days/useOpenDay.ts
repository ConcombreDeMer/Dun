/*
 * The open day and `write`, from the nearest `DayProvider`.
 */

import { useContext } from "react";
import { OpenDayContext, type OpenDay } from "./DayProvider";

/** Throws an error outside of a `DayProvider`. */
export function useOpenDay(): OpenDay {
  const value = useContext(OpenDayContext);
  if (value === null) {
    throw new Error("useOpenDay must be used within a DayProvider");
  }
  return value;
}
