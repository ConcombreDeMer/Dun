/*
 * Goal (offer: "Le premier objectif correspond à la cible choisie à
 * l'onboarding : 1, 2, 3, 4, 7 ou 14 journées réussies").
 *
 * A goal of N is reached when the streak reaches N, with the same rule as the
 * statistics (`nextStreak`). Pure functions: no React, no storage, no current
 * time. Arguments are never modified.
 */

import { isDateKey, type DateKey } from "./date";
import { assertConsecutiveDays, nextStreak, type DatedStatus } from "./streak";

/** The targets offered at onboarding, in successful days in a row. */
export const GOAL_TARGETS = [1, 2, 3, 4, 7, 14] as const;

export type GoalTarget = (typeof GOAL_TARGETS)[number];

/** A goal of `target` days, accepted on the day `confirmedKey`. */
export type Goal = { target: GoalTarget; confirmedKey: DateKey };

/**
 * - `streak`: the current streak, counted from `confirmedKey`;
 * - `achievedKey`: the first day this streak reached `target`, or `null`. It
 *   stays set even if the streak breaks afterwards.
 */
export type GoalProgress = {
  target: GoalTarget;
  streak: number;
  achievedKey: DateKey | null;
};

function isGoalTarget(value: number): value is GoalTarget {
  return (GOAL_TARGETS as readonly number[]).includes(value);
}

/**
 * Progress of `goal` over `days`.
 *
 * Days before `confirmedKey` are ignored. The confirmation day counts if it
 * closes at 100 %, even if tasks were done before the confirmation. The
 * remaining days must start on `confirmedKey` and follow each other exactly.
 *
 * Throws a `RangeError` if the target is not in `GOAL_TARGETS`, if
 * `confirmedKey` or a key is invalid, if the confirmation day is missing, or
 * if the days are not consecutive.
 */
export function goalProgress(
  goal: Goal,
  days: readonly DatedStatus[],
): GoalProgress {
  const { target, confirmedKey } = goal;
  if (!isGoalTarget(target)) {
    throw new RangeError(`goalProgress: invalid target (${target})`);
  }
  if (!isDateKey(confirmedKey)) {
    throw new RangeError(`goalProgress: invalid date key (${confirmedKey})`);
  }

  const start = days.findIndex((day) => day.key >= confirmedKey);
  const counted = start === -1 ? [] : days.slice(start);
  if (counted.length > 0 && counted[0].key !== confirmedKey) {
    throw new RangeError(
      `goalProgress: confirmation day missing (${counted[0].key} instead of ${confirmedKey})`,
    );
  }
  assertConsecutiveDays("goalProgress", counted);

  let current = 0;
  let achievedKey: DateKey | null = null;
  for (const day of counted) {
    current = nextStreak(current, day.status);
    if (achievedKey === null && current === target) {
      achievedKey = day.key;
    }
  }

  return { target, streak: current, achievedKey };
}
