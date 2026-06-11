import {
  calculateStats,
  buildDaysBetween,
  buildDaysMap,
  normalizeDate,
  type CalculatedStats,
  type StatsDay,
  type StatsPeriod,
  type StatsPreferences,
} from "@/lib/calculateStats";

const DAY_IN_MS = 1000 * 60 * 60 * 24;

type StatsBarInput = {
  date: string;
  done: number;
  total: number;
  completion: number;
  label: string;
};

type StatsSlideInput = {
  id: string;
  periodLabel: string;
  bars?: StatsBarInput[];
};

type PeriodSummary = {
  label: string;
  startDate: string;
  endDate: string;
  isPartial: boolean;
  stats: {
    totalTasks: number;
    completedTasks: number;
    remainingTasks: number;
    completionRate: number;
    averageCharge: number;
    perfectDays: number;
    adjustedTasks: number;
    adjustmentRate: number;
    includedDays: number;
  };
  distribution: {
    label: string;
    date: string;
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
  }[];
};

export type StatsAnalysisPayload = {
  analysisType: "stats_period";
  locale: string;
  period: StatsPeriod;
  statsFeedbackPlan: StatsFeedbackPlan;
  instructions: {
    maxSentences: number;
    noNewNumbers: boolean;
    noHallucination: boolean;
  };
};

type PeriodComparison = {
  target: "previous" | "next";
  totalTasksDelta: number;
  completedTasksDelta: number;
  completionRateDelta: number;
  averageChargeDelta: number;
  perfectDaysDelta: number;
  adjustmentRateDelta: number;
};

type StatsFeedbackPlan = {
  tone: "soft" | "encouraging" | "balanced" | "warning";
  intent:
    | "empty_period"
    | "light_period"
    | "stable_good_period"
    | "dense_but_well_handled"
    | "overloaded_and_difficult"
    | "partial_progress"
    | "low_activity";
  periodContext: {
    label: string;
    type: StatsPeriod;
  };
  keyFacts: {
    metric: "total_tasks" | "completed_tasks" | "completion_rate" | "average_charge" | "perfect_days" | "adjustment_rate";
    value: string;
    meaning: string;
  }[];
  signals: {
    type:
      | "completion_level"
      | "charge_level"
      | "perfect_days"
      | "distribution_regular"
      | "distribution_peak"
      | "distribution_difficult_bucket"
      | "adjustment_high"
      | "adjustment_changed"
      | "comparison_previous"
      | "comparison_next";
    metric?: string;
    direction?: "up" | "down" | "stable";
    value?: string;
    label?: string;
    comparedTo?: "previous" | "next";
    isPartial?: boolean;
    meaning: string;
  }[];
  adviceIntent?: "reduce_load" | "smooth_distribution" | "stabilize_history";
  constraints: {
    maxSentences: number;
    noNewNumbers: boolean;
    noExtraComparison: boolean;
    noRawUnits: boolean;
  };
};

const toIsoDate = (date: Date) => normalizeDate(date).toISOString().slice(0, 10);

const parseRate = (value: string) => Number.parseInt(value, 10) || 0;

const formatNumber = (value: number) => {
  return Number.isInteger(value)
    ? String(value)
    : value.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
};

const addDays = (date: Date, days: number) => {
  const next = normalizeDate(date);
  next.setDate(next.getDate() + days);
  return next;
};

const getRangeLength = (startDate: Date, endDate: Date) => {
  return Math.max(1, Math.round((normalizeDate(endDate).getTime() - normalizeDate(startDate).getTime()) / DAY_IN_MS) + 1);
};

const getSelectedRange = ({
  allDays,
  period,
  slide,
  today,
}: {
  allDays: StatsDay[];
  period: StatsPeriod;
  slide?: StatsSlideInput | null;
  today: Date;
}) => {
  const slideId = slide?.id;
  const slideLabel = slide?.periodLabel ?? period;

  if (slideId?.startsWith("week-")) {
    const startDate = normalizeDate(new Date(slideId.replace("week-", "")));
    return { startDate, endDate: addDays(startDate, 6), label: slideLabel };
  }

  const monthMatch = slideId?.match(/^month-(\d{4})-(\d{1,2})$/);
  if (monthMatch) {
    const year = Number(monthMatch[1]);
    const month = Number(monthMatch[2]);
    return {
      startDate: new Date(year, month, 1),
      endDate: new Date(year, month + 1, 0),
      label: slideLabel,
    };
  }

  const yearMatch = slideId?.match(/^(?:year|global)-(\d{4})$/);
  if (yearMatch) {
    const year = Number(yearMatch[1]);
    const endDate = year === today.getFullYear() ? today : new Date(year, 11, 31);

    return {
      startDate: new Date(year, 0, 1),
      endDate,
      label: slide?.periodLabel ?? String(year),
    };
  }

  const sortedDates = allDays
    .map((day) => normalizeDate(new Date(day.date)))
    .sort((a, b) => a.getTime() - b.getTime());

  return {
    startDate: sortedDates[0] ?? today,
    endDate: today,
    label: slide?.periodLabel ?? period,
  };
};

const getAdjacentRange = (startDate: Date, endDate: Date, direction: -1 | 1) => {
  const length = getRangeLength(startDate, endDate);

  if (direction === -1) {
    const previousEnd = addDays(startDate, -1);
    return {
      startDate: addDays(previousEnd, -length + 1),
      endDate: previousEnd,
    };
  }

  const nextStart = addDays(endDate, 1);
  return {
    startDate: nextStart,
    endDate: addDays(nextStart, length - 1),
  };
};

const summarizeDistributionBucket = (days: StatsDay[], label: string, date: Date) => {
  const total = days.reduce((sum, day) => sum + Math.max(day.total || 0, 0), 0);
  const done = Math.min(
    days.reduce((sum, day) => sum + Math.max(day.done_count || 0, 0), 0),
    total
  );

  return {
    label,
    date: toIsoDate(date),
    totalTasks: total,
    completedTasks: done,
    completionRate: total > 0 ? Math.round((done / total) * 100) : 0,
  };
};

const buildDistribution = (days: StatsDay[], locale: string, period: StatsPeriod) => {
  if (period === "Par semaine") {
    return days.map((day) => {
      const date = normalizeDate(new Date(day.date));
      return summarizeDistributionBucket(
        [day],
        date.toLocaleDateString(locale, { weekday: "short", day: "numeric" }),
        date
      );
    });
  }

  if (period === "Par mois") {
    const buckets: ReturnType<typeof summarizeDistributionBucket>[] = [];

    for (let index = 0; index < days.length; index += 7) {
      const bucketDays = days.slice(index, index + 7);
      const firstDate = normalizeDate(new Date(bucketDays[0].date));
      const lastDate = normalizeDate(new Date(bucketDays[bucketDays.length - 1].date));
      buckets.push(summarizeDistributionBucket(
        bucketDays,
        `${firstDate.getDate()}-${lastDate.getDate()}`,
        firstDate
      ));
    }

    return buckets;
  }

  const bucketsByMonth = new Map<string, StatsDay[]>();

  days.forEach((day) => {
    const date = normalizeDate(new Date(day.date));
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    bucketsByMonth.set(key, [...(bucketsByMonth.get(key) ?? []), day]);
  });

  return Array.from(bucketsByMonth.values()).map((bucketDays) => {
    const firstDate = normalizeDate(new Date(bucketDays[0].date));
    return summarizeDistributionBucket(
      bucketDays,
      firstDate.toLocaleDateString(locale, { month: "short" }),
      firstDate
    );
  });
};

const summarizeStats = ({
  days,
  endDate,
  label,
  locale,
  period,
  preferences,
  startDate,
  today,
}: {
  days: StatsDay[];
  endDate: Date;
  label: string;
  locale: string;
  period: StatsPeriod;
  preferences: StatsPreferences;
  startDate: Date;
  today: Date;
}): PeriodSummary => {
  const stats: CalculatedStats = calculateStats(days, preferences, today);

  return {
    label,
    startDate: toIsoDate(startDate),
    endDate: toIsoDate(endDate),
    isPartial: normalizeDate(endDate).getTime() > normalizeDate(today).getTime(),
    stats: {
      totalTasks: stats.totalTasksCount,
      completedTasks: stats.totalDoneCount,
      remainingTasks: Math.max(stats.totalTasksCount - stats.totalDoneCount, 0),
      completionRate: parseRate(stats.completion),
      averageCharge: stats.charge,
      perfectDays: stats.perfectDaysCount,
      adjustedTasks: stats.lateAdjustedTasksCount,
      adjustmentRate: parseRate(stats.lateAdjustmentRate),
      includedDays: stats.includedDaysCount,
    },
    distribution: buildDistribution(days, locale, period),
  };
};

const comparePeriods = (target: "previous" | "next", selected: PeriodSummary, compared: PeriodSummary): PeriodComparison => ({
  target,
  totalTasksDelta: selected.stats.totalTasks - compared.stats.totalTasks,
  completedTasksDelta: selected.stats.completedTasks - compared.stats.completedTasks,
  completionRateDelta: selected.stats.completionRate - compared.stats.completionRate,
  averageChargeDelta: Math.round((selected.stats.averageCharge - compared.stats.averageCharge) * 10) / 10,
  perfectDaysDelta: selected.stats.perfectDays - compared.stats.perfectDays,
  adjustmentRateDelta: selected.stats.adjustmentRate - compared.stats.adjustmentRate,
});

const classifyCharge = (averageCharge: number) => {
  if (averageCharge === 0) return "empty";
  if (averageCharge < 3) return "light";
  if (averageCharge <= 7) return "balanced";
  if (averageCharge <= 10) return "dense";
  return "overloaded";
};

const classifyCompletion = (completionRate: number) => {
  if (completionRate >= 90) return "excellent";
  if (completionRate >= 75) return "strong";
  if (completionRate >= 50) return "medium";
  if (completionRate >= 25) return "low";
  return "very_low";
};

const getDistributionSignal = (period: PeriodSummary) => {
  const activeBuckets = period.distribution.filter((item) => item.totalTasks > 0);

  if (activeBuckets.length < 2) {
    return null;
  }

  const sortedByLoad = [...activeBuckets].sort((a, b) => b.totalTasks - a.totalTasks);
  const heaviest = sortedByLoad[0];
  const lightest = sortedByLoad[sortedByLoad.length - 1];
  const spread = heaviest.totalTasks - lightest.totalTasks;
  const difficultLoadedBucket = activeBuckets
    .filter((item) => item.totalTasks >= period.stats.averageCharge && item.completionRate < 50)
    .sort((a, b) => a.completionRate - b.completionRate || b.totalTasks - a.totalTasks)[0];

  if (difficultLoadedBucket) {
    return {
      type: "distribution_difficult_bucket" as const,
      label: difficultLoadedBucket.label,
      value: `${difficultLoadedBucket.completedTasks}/${difficultLoadedBucket.totalTasks}`,
      meaning: "bucket chargé avec une complétion basse",
    };
  }

  if (spread >= 6) {
    return {
      type: "distribution_peak" as const,
      label: heaviest.label,
      value: `${heaviest.totalTasks} tâches`,
      meaning: "charge concentrée sur un point de la période",
    };
  }

  if (spread <= 2) {
    return {
      type: "distribution_regular" as const,
      value: `écart ${spread}`,
      meaning: "répartition régulière",
    };
  }

  return null;
};

const getComparisonSignals = ({
  comparison,
  isPartial,
}: {
  comparison: PeriodComparison;
  isPartial?: boolean;
}): StatsFeedbackPlan["signals"] => {
  const comparedTo = comparison.target;
  const signals: StatsFeedbackPlan["signals"] = [];

  if (Math.abs(comparison.totalTasksDelta) >= 5) {
    signals.push({
      type: comparison.target === "previous" ? "comparison_previous" : "comparison_next",
      metric: "total_tasks",
      direction: comparison.totalTasksDelta > 0 ? "up" : "down",
      value: `${Math.abs(comparison.totalTasksDelta)} tâches`,
      comparedTo,
      isPartial,
      meaning: "écart significatif de charge totale",
    });
  }

  if (Math.abs(comparison.completionRateDelta) >= 8) {
    signals.push({
      type: comparison.target === "previous" ? "comparison_previous" : "comparison_next",
      metric: "completion_rate",
      direction: comparison.completionRateDelta > 0 ? "up" : "down",
      value: `${Math.abs(comparison.completionRateDelta)} points`,
      comparedTo,
      isPartial,
      meaning: "écart significatif de complétion",
    });
  }

  if (Math.abs(comparison.averageChargeDelta) >= 1.5) {
    signals.push({
      type: comparison.target === "previous" ? "comparison_previous" : "comparison_next",
      metric: "average_charge",
      direction: comparison.averageChargeDelta > 0 ? "up" : "down",
      value: `${formatNumber(Math.abs(comparison.averageChargeDelta))} tâches par jour`,
      comparedTo,
      isPartial,
      meaning: "écart significatif de charge moyenne",
    });
  }

  if (Math.abs(comparison.perfectDaysDelta) >= 1) {
    signals.push({
      type: comparison.target === "previous" ? "comparison_previous" : "comparison_next",
      metric: "perfect_days",
      direction: comparison.perfectDaysDelta > 0 ? "up" : "down",
      value: `${Math.abs(comparison.perfectDaysDelta)} jour(s) parfait(s)`,
      comparedTo,
      isPartial,
      meaning: "écart significatif de jours parfaits",
    });
  }

  if (Math.abs(comparison.adjustmentRateDelta) >= 5) {
    signals.push({
      type: comparison.target === "previous" ? "comparison_previous" : "comparison_next",
      metric: "adjustment_rate",
      direction: comparison.adjustmentRateDelta > 0 ? "up" : "down",
      value: `${Math.abs(comparison.adjustmentRateDelta)} points`,
      comparedTo,
      isPartial,
      meaning: "écart significatif de réajustement",
    });
  }

  return signals;
};

const buildStatsFeedbackPlan = ({
  nextComparison,
  nextPeriod,
  period,
  previousComparison,
  previousPeriod,
  selectedPeriod,
}: {
  nextComparison?: PeriodComparison;
  nextPeriod?: PeriodSummary;
  period: StatsPeriod;
  previousComparison: PeriodComparison;
  previousPeriod: PeriodSummary;
  selectedPeriod: PeriodSummary;
}): StatsFeedbackPlan => {
  const chargeLevel = classifyCharge(selectedPeriod.stats.averageCharge);
  const completionLevel = classifyCompletion(selectedPeriod.stats.completionRate);
  const keyFacts: StatsFeedbackPlan["keyFacts"] = [
    { metric: "total_tasks", value: `${selectedPeriod.stats.totalTasks} tâches`, meaning: "charge totale" },
    { metric: "completed_tasks", value: `${selectedPeriod.stats.completedTasks} tâches`, meaning: "tâches terminées" },
    { metric: "completion_rate", value: `${selectedPeriod.stats.completionRate}%`, meaning: completionLevel },
    { metric: "average_charge", value: `${formatNumber(selectedPeriod.stats.averageCharge)} tâches par jour`, meaning: chargeLevel },
    { metric: "perfect_days", value: `${selectedPeriod.stats.perfectDays} jour(s)`, meaning: "jours parfaits" },
    { metric: "adjustment_rate", value: `${selectedPeriod.stats.adjustmentRate}%`, meaning: "taux de réajustement" },
  ];
  const signals: StatsFeedbackPlan["signals"] = [
    {
      type: "completion_level",
      metric: "completion_rate",
      value: `${selectedPeriod.stats.completionRate}%`,
      meaning: completionLevel,
    },
    {
      type: "charge_level",
      metric: "average_charge",
      value: `${formatNumber(selectedPeriod.stats.averageCharge)} tâches par jour`,
      meaning: chargeLevel,
    },
  ];
  const comparisonSignals = [
    ...getComparisonSignals({
      comparison: previousComparison,
    }),
    ...(nextComparison && nextPeriod
      ? getComparisonSignals({
        comparison: nextComparison,
        isPartial: nextPeriod.isPartial,
      })
      : []),
  ];
  let tone: StatsFeedbackPlan["tone"] = "balanced";
  let intent: StatsFeedbackPlan["intent"] = "partial_progress";

  if (chargeLevel === "empty") {
    intent = "empty_period";
    tone = "soft";
  } else if ((chargeLevel === "dense" || chargeLevel === "overloaded") && (completionLevel === "excellent" || completionLevel === "strong")) {
    intent = "dense_but_well_handled";
    tone = "encouraging";
  } else if ((chargeLevel === "dense" || chargeLevel === "overloaded") && (completionLevel === "low" || completionLevel === "very_low")) {
    intent = "overloaded_and_difficult";
    tone = "warning";
  } else if (completionLevel === "excellent" || completionLevel === "strong") {
    intent = "stable_good_period";
    tone = "encouraging";
  } else if (completionLevel === "low" || completionLevel === "very_low") {
    intent = "low_activity";
    tone = "soft";
  } else if (chargeLevel === "light") {
    intent = "light_period";
    tone = "soft";
  }

  if (selectedPeriod.stats.perfectDays > 0 && selectedPeriod.stats.includedDays > 0) {
    const perfectRatio = selectedPeriod.stats.perfectDays / selectedPeriod.stats.includedDays;
    if (selectedPeriod.stats.perfectDays >= 2 || perfectRatio >= 0.5) {
      signals.push({
        type: "perfect_days",
        metric: "perfect_days",
        value: `${selectedPeriod.stats.perfectDays}/${selectedPeriod.stats.includedDays}`,
        meaning: "régularité positive",
      });
    }
  }

  const distributionSignal = getDistributionSignal(selectedPeriod);
  if (distributionSignal) {
    signals.push(distributionSignal);
  }

  if (selectedPeriod.stats.adjustmentRate >= 15) {
    signals.push({
      type: "adjustment_high",
      metric: "adjustment_rate",
      value: `${selectedPeriod.stats.adjustmentRate}%`,
      meaning: "historique assez retouché",
    });
  } else if (selectedPeriod.stats.adjustmentRate > 0 && Math.abs(previousComparison.adjustmentRateDelta) >= 5) {
    signals.push({
      type: "adjustment_changed",
      metric: "adjustment_rate",
      value: `${selectedPeriod.stats.adjustmentRate}%`,
      direction: previousComparison.adjustmentRateDelta > 0 ? "up" : "down",
      comparedTo: "previous",
      meaning: "écart visible face à la période précédente",
    });
  }

  const adviceIntent = (() => {
    if (chargeLevel === "overloaded" || (chargeLevel === "dense" && completionLevel === "low")) {
      return "reduce_load" as const;
    }

    if (distributionSignal?.type === "distribution_peak") {
      return "smooth_distribution" as const;
    }

    if (selectedPeriod.stats.adjustmentRate >= 15) {
      return "stabilize_history" as const;
    }

    return undefined;
  })();

  return {
    tone,
    intent,
    periodContext: {
      label: selectedPeriod.label,
      type: period,
    },
    keyFacts,
    signals: [
      ...signals.slice(0, 4),
      ...comparisonSignals.slice(0, period === "Par semaine" ? 2 : 3),
    ],
    ...(adviceIntent ? { adviceIntent } : {}),
    constraints: {
      maxSentences: 5,
      noNewNumbers: true,
      noExtraComparison: true,
      noRawUnits: true,
    },
  };
};

export const getStatsJsonData = ({
  allDays,
  locale = "fr-FR",
  period,
  preferences,
  slide,
}: {
  allDays: StatsDay[];
  locale?: string;
  period: StatsPeriod;
  preferences: StatsPreferences;
  slide?: StatsSlideInput | null;
}): StatsAnalysisPayload => {
  const today = normalizeDate(new Date());
  const daysMap = buildDaysMap(allDays);
  const selectedRange = getSelectedRange({ allDays, period, slide, today });
  const previousRange = getAdjacentRange(selectedRange.startDate, selectedRange.endDate, -1);
  const nextRange = getAdjacentRange(selectedRange.startDate, selectedRange.endDate, 1);
  const selectedDays = buildDaysBetween(selectedRange.startDate, selectedRange.endDate, daysMap);
  const previousDays = buildDaysBetween(previousRange.startDate, previousRange.endDate, daysMap);
  const nextDays = nextRange.startDate <= today
    ? buildDaysBetween(nextRange.startDate, nextRange.endDate, daysMap)
    : null;
  const selectedPeriod = summarizeStats({
    days: selectedDays,
    endDate: selectedRange.endDate,
    label: selectedRange.label,
    locale,
    period,
    preferences,
    startDate: selectedRange.startDate,
    today,
  });
  const previousPeriod = summarizeStats({
    days: previousDays,
    endDate: previousRange.endDate,
    label: "Période précédente",
    locale,
    period,
    preferences,
    startDate: previousRange.startDate,
    today,
  });
  const nextPeriod = nextDays
    ? summarizeStats({
      days: nextDays,
      endDate: nextRange.endDate,
      label: "Période suivante",
      locale,
      period,
      preferences,
      startDate: nextRange.startDate,
      today,
    })
    : undefined;
  const previousComparison = comparePeriods("previous", selectedPeriod, previousPeriod);
  const nextComparison = nextPeriod ? comparePeriods("next", selectedPeriod, nextPeriod) : undefined;

  return {
    analysisType: "stats_period",
    locale,
    period,
    statsFeedbackPlan: buildStatsFeedbackPlan({
      nextComparison,
      nextPeriod,
      period,
      previousComparison,
      previousPeriod,
      selectedPeriod,
    }),
    instructions: {
      maxSentences: 5,
      noNewNumbers: true,
      noHallucination: true,
    },
  };
};

export const getStatsJsonDataString = (input: Parameters<typeof getStatsJsonData>[0]) => {
  return JSON.stringify(getStatsJsonData(input));
};
