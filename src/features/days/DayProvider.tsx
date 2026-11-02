/*
 * The open day, kept up to date (offer: "Une journée se clôt à minuit").
 *
 * The days are closed (`DayClosing.close`, `src/data/dayClosing.ts`):
 * - at launch, when the provider mounts;
 * - when the app comes back to the foreground (`AppState` "active");
 * - at the next local midnight, with a timer set again after a closing of
 *   any trigger when none is pending or when the open day has changed, and
 *   after a failed closing when none is pending; `openKey` changes, so the
 *   screens refresh;
 * - before any write, through `write`. Once the provider is unmounted,
 *   `write` still closes the days before `fn`, but sets no timer.
 *
 * Rule: every write of a hook in `src/features` goes through `write`. Without
 * the closing before the write, a task checked at 00:01 on a screen left open
 * would enter the record of the day before.
 *
 * An error of an automatic closing is logged; `openKey` keeps its value, and
 * the next trigger tries again (the midnight timer at the latest). An error
 * of the closing in `write` reaches the caller. If the timer cannot be set
 * after a failed closing, that second error is only logged, so that it never
 * hides the error of the closing.
 */

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import { logger } from "../../../lib/logger";
import type { DayClosing, DayClosingResult } from "../../data/dayClosing";
import type { DateKey } from "../../domain/date";

export type OpenDay = {
  /** The open day, `null` until the first successful closing. */
  openKey: DateKey | null;
  /**
   * Closes the days, then runs `fn` with the open day and returns its
   * result. If the closing throws, the error reaches the caller and `fn` is
   * not called.
   */
  write<T>(fn: (openKey: DateKey) => T): T;
};

export const OpenDayContext = createContext<OpenDay | null>(null);

export type DayProviderProps = {
  /** The closing of the days, on the database of the app (or of a test). */
  closing: DayClosing;
  children?: ReactNode;
};

export function DayProvider({ closing, children }: DayProviderProps) {
  const [openKey, setOpenKey] = useState<DateKey | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  /* The open day when the pending timer was set. */
  const timerKey = useRef<DateKey | null>(null);
  const mounted = useRef(false);

  /*
   * Closes the days, then sets the midnight timer again if none is pending or
   * if the open day has changed. After a failed closing, a timer is set if
   * none is pending: `msUntilRefresh` does not read the database. Once
   * unmounted, it only closes the days: no state update, no timer.
   */
  const close = useCallback((): DateKey => {
    /* Replaces the pending timer, if any. */
    const schedule = (key: DateKey | null) => {
      const delay = closing.msUntilRefresh();
      clearTimeout(timer.current);
      timerKey.current = key;
      timer.current = setTimeout(() => {
        timer.current = undefined;
        closeAutomatically(close);
      }, delay);
    };

    let result: DayClosingResult;
    try {
      result = closing.close();
    } catch (error) {
      if (mounted.current && timer.current === undefined) {
        try {
          schedule(timerKey.current);
        } catch (scheduleError) {
          logger.error("DayProvider: midnight timer not set", scheduleError);
        }
      }
      throw error;
    }

    if (mounted.current) {
      setOpenKey(result.openKey);
      if (timer.current === undefined || timerKey.current !== result.openKey) {
        schedule(result.openKey);
      }
    }
    return result.openKey;
  }, [closing]);

  useEffect(() => {
    mounted.current = true;
    closeAutomatically(close);

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        closeAutomatically(close);
      }
    });

    return () => {
      mounted.current = false;
      subscription.remove();
      clearTimeout(timer.current);
      timer.current = undefined;
    };
  }, [close]);

  const write = useCallback(
    <T,>(fn: (key: DateKey) => T): T => fn(close()),
    [close],
  );

  const value = useMemo(() => ({ openKey, write }), [openKey, write]);

  return (
    <OpenDayContext.Provider value={value}>{children}</OpenDayContext.Provider>
  );
}

/* A closing started by the app, not by a write: its error is only logged. */
function closeAutomatically(close: () => unknown): void {
  try {
    close();
  } catch (error) {
    logger.error("DayProvider: closing of the days failed", error);
  }
}
