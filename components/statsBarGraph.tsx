import {
  CalculatedStats,
  DEFAULT_STATS_PREFERENCES,
  StatsDay,
  StatsPreferences,
  buildDaysMap,
  calculateStats,
  createEmptyStatsDay,
  filterStatsDays,
  normalizeDate,
  toDateKey,
} from "@/lib/calculateStats";
import { useFont } from "@/lib/FontContext";
import { useAppTranslation } from "@/lib/i18n";
import { useTheme } from "@/lib/ThemeContext";
import { useStore } from "@/store/store";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptic from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
import Squircle from "./Squircle";

interface StatsBarGraphProps {
  daysData: Day[];
  period: Period;
  statsPreferences?: StatsPreferences;
  onSlideChange?: (slide: Slide) => void;
}

type Period = "Par semaine" | "Par mois" | "Par année" | "Global";

type Day = StatsDay;

type BarData = {
  stacks: { value: number; color: string; marginBottom?: number }[];
  label: string;
  date: string;
  done: number;
  total: number;
  remaining: number;
  completion: number;
  isCurrent: boolean;
  caption: string;
  days: StatsDay[];
};

type Slide = {
  bars: BarData[];
  periodLabel: string;
  id: string;
  summary: {
    done: number;
    total: number;
    completion: number;
  };
  stats: CalculatedStats;
};

type ChartPalette = {
  accent: string;
  accentSoft: string;
  track: string;
  mutedTrack: string;
  grid: string;
};

const CHART_HEIGHT = 168;
const MIN_BAR_HEIGHT = 12;

const getWeekStart = (date: Date): Date => {
  const d = normalizeDate(date);
  const dayOfWeek = d.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  d.setDate(d.getDate() - daysToMonday);
  return d;
};

const clampDone = (done: number, total: number) => Math.min(Math.max(done, 0), Math.max(total, 0));

const getPeriodName = (period: Period, t: (key: string) => string) => {
  if (period === "Par semaine") return t("stats.general.period.week");
  if (period === "Par mois") return t("stats.general.period.month");
  if (period === "Par année") return t("stats.general.period.year");
  return t("stats.general.period.global");
};

const createBar = (
  days: StatsDay[],
  label: string,
  caption: string,
  date: Date,
  isCurrent: boolean,
  palette: ChartPalette,
  statsPreferences: StatsPreferences,
  today: Date
): BarData => {
  const includedDays = filterStatsDays(days, statsPreferences, today);
  const total = includedDays.reduce((sum, day) => sum + Math.max(day.total || 0, 0), 0);
  const done = clampDone(includedDays.reduce((sum, day) => sum + Math.max(day.done_count || 0, 0), 0), total);
  const remaining = Math.max(total - done, 0);
  const completion = total > 0 ? Math.round((done / total) * 100) : 0;

  return {
    stacks: [
      { value: done, color: isCurrent ? palette.accent : palette.accent },
      { value: remaining, color: isCurrent ? palette.accentSoft : palette.track, marginBottom: 2 },
    ],
    label,
    caption,
    date: date.toISOString(),
    done,
    total,
    remaining,
    completion,
    isCurrent,
    days: includedDays,
  };
};

const buildSlideStats = (days: StatsDay[], preferences: StatsPreferences, today: Date) => {
  const stats = calculateStats(days, preferences, today);

  return {
    stats,
    summary: {
      done: stats.totalDoneCount,
      total: stats.totalTasksCount,
      completion: Number.parseInt(stats.completion, 10) || 0,
    },
  };
};

const buildWeekSlides = (
  daysMap: Map<string, StatsDay>,
  palette: ChartPalette,
  locale: string,
  t: (key: string, options?: Record<string, any>) => string,
  today: Date,
  statsPreferences: StatsPreferences,
  offsets = [-4, -3, -2, -1, 0]
): Slide[] => {
  const todayKey = toDateKey(today);
  const currentWeekStart = getWeekStart(today);

  return offsets.map((offset) => {
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(currentWeekStart.getDate() + offset * 7);

    const bars = Array.from({ length: 7 }, (_, index) => {
      const currentDay = new Date(weekStart);
      currentDay.setDate(weekStart.getDate() + index);
      const key = toDateKey(currentDay);
      const day = daysMap.get(key) || createEmptyStatsDay(currentDay);

      return createBar(
        [day],
        currentDay.toLocaleDateString(locale, { weekday: "narrow" }),
        currentDay.toLocaleDateString(locale, { day: "numeric", month: "short" }),
        currentDay,
        key === todayKey,
        palette,
        statsPreferences,
        today
      );
    });

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const calculated = buildSlideStats(bars.flatMap((bar) => bar.days), statsPreferences, today);

    return {
      id: `week-${weekStart.toISOString()}`,
      bars,
      periodLabel: t("stats.chart.weekRange", {
        start: weekStart.toLocaleDateString(locale, { day: "numeric", month: "short" }),
        end: weekEnd.toLocaleDateString(locale, { day: "numeric", month: "short" }),
      }),
      ...calculated,
    };
  });
};

const buildMonthSlides = (
  daysMap: Map<string, StatsDay>,
  palette: ChartPalette,
  locale: string,
  t: (key: string, options?: Record<string, any>) => string,
  today: Date,
  statsPreferences: StatsPreferences
): Slide[] => {
  const slides: Slide[] = [];

  for (let monthOffset = -12; monthOffset <= 0; monthOffset++) {
    const target = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const monthEnd = new Date(target.getFullYear(), target.getMonth() + 1, 0);
    const bars: BarData[] = [];

    for (
      let weekStart = getWeekStart(target);
      weekStart <= monthEnd;
      weekStart = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 7)
    ) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const rangeStart = weekStart < target ? new Date(target) : new Date(weekStart);
      const rangeEnd = weekEnd > monthEnd ? new Date(monthEnd) : new Date(weekEnd);

      const days: StatsDay[] = [];
      const cursor = new Date(rangeStart);
      while (cursor <= rangeEnd) {
        const key = toDateKey(cursor);
        days.push(daysMap.get(key) || createEmptyStatsDay(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }

      const includesToday = days.some((day) => toDateKey(new Date(day.date)) === toDateKey(today));
      const label = `${rangeStart.getDate()}-${rangeEnd.getDate()}`;
      bars.push(createBar(days, label, label, rangeStart, includesToday, palette, statsPreferences, today));
    }

    const month = target.toLocaleDateString(locale, { month: "long", year: "numeric" });
    const calculated = buildSlideStats(bars.flatMap((bar) => bar.days), statsPreferences, today);

    slides.push({
      id: `month-${target.getFullYear()}-${target.getMonth()}`,
      bars,
      periodLabel: t("stats.chart.monthOf", { month: month.charAt(0).toUpperCase() + month.slice(1) }),
      ...calculated,
    });
  }

  return slides;
};

const buildYearSlides = (
  daysMap: Map<string, StatsDay>,
  palette: ChartPalette,
  locale: string,
  today: Date,
  statsPreferences: StatsPreferences
): Slide[] => {
  const slides: Slide[] = [];
  const startYear = today.getFullYear() - 1;

  for (let year = startYear; year <= today.getFullYear(); year++) {
    const maxMonth = year === today.getFullYear() ? today.getMonth() : 11;
    const bars = Array.from({ length: maxMonth + 1 }, (_, month) => {
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);
      const days: StatsDay[] = [];

      for (let cursor = new Date(monthStart); cursor <= monthEnd; cursor.setDate(cursor.getDate() + 1)) {
        const key = toDateKey(cursor);
        days.push(daysMap.get(key) || createEmptyStatsDay(cursor));
      }

      return createBar(
        days,
        monthStart.toLocaleDateString(locale, { month: "narrow" }),
        monthStart.toLocaleDateString(locale, { month: "short" }),
        monthStart,
        year === today.getFullYear() && month === today.getMonth(),
        palette,
        statsPreferences,
        today
      );
    });

    const calculated = buildSlideStats(bars.flatMap((bar) => bar.days), statsPreferences, today);

    slides.push({
      id: `year-${year}`,
      bars,
      periodLabel: year.toString(),
      ...calculated,
    });
  }

  return slides;
};

const buildGlobalSlides = (
  daysData: Day[],
  palette: ChartPalette,
  locale: string,
  today: Date,
  statsPreferences: StatsPreferences
): Slide[] => {
  if (daysData.length === 0) return [];

  const daysMap = buildDaysMap(daysData);
  const sortedDates = daysData.map((day) => normalizeDate(new Date(day.date))).sort((a, b) => a.getTime() - b.getTime());
  const firstDate = sortedDates[0];
  const slides: Slide[] = [];

  for (let year = firstDate.getFullYear(); year <= today.getFullYear(); year++) {
    const startMonth = year === firstDate.getFullYear() ? firstDate.getMonth() : 0;
    const endMonth = year === today.getFullYear() ? today.getMonth() : 11;
    const bars: BarData[] = [];

    for (let month = startMonth; month <= endMonth; month++) {
      const monthStart = new Date(year, month, 1);
      const calendarMonthEnd = new Date(year, month + 1, 0);
      const monthEnd = year === today.getFullYear() && month === today.getMonth()
        ? today
        : calendarMonthEnd;
      const days: StatsDay[] = [];

      for (let cursor = new Date(monthStart); cursor <= monthEnd; cursor.setDate(cursor.getDate() + 1)) {
        const key = toDateKey(cursor);
        days.push(daysMap.get(key) || createEmptyStatsDay(cursor));
      }

      bars.push(createBar(
        days,
        monthStart.toLocaleDateString(locale, { month: "narrow" }),
        monthStart.toLocaleDateString(locale, { month: "short" }),
        monthStart,
        year === today.getFullYear() && month === today.getMonth(),
        palette,
        statsPreferences,
        today
      ));
    }

    const calculated = buildSlideStats(bars.flatMap((bar) => bar.days), statsPreferences, today);

    slides.push({
      id: `global-${year}`,
      bars,
      periodLabel: year.toString(),
      ...calculated,
    });
  }

  return slides;
};

const transformDaysDataByPeriod = (
  daysData: Day[],
  period: Period,
  palette: ChartPalette,
  locale: string,
  t: (key: string, options?: Record<string, any>) => string,
  statsPreferences: StatsPreferences
): Slide[] => {
  const today = normalizeDate(new Date());
  const daysMap = buildDaysMap(daysData || []);

  if (period === "Par semaine") {
    return buildWeekSlides(daysMap, palette, locale, t, today, statsPreferences);
  }

  if (period === "Par mois") {
    return buildMonthSlides(daysMap, palette, locale, t, today, statsPreferences);
  }

  if (period === "Par année") {
    return buildYearSlides(daysMap, palette, locale, today, statsPreferences);
  }

  return buildGlobalSlides(daysData || [], palette, locale, today, statsPreferences);
};

const ChartSkeleton = memo(function ChartSkeleton({ colors, palette, itemWidth }: { colors: any; palette: ChartPalette; itemWidth: number }) {
  return (
    <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)} style={[styles.stateContainer, { width: itemWidth }]}>
      <View style={styles.skeletonHeader}>
        <View style={[styles.skeletonLine, { width: 132, backgroundColor: palette.track }]} />
        <ActivityIndicator color={colors.text} />
      </View>
      <View style={styles.skeletonBars}>
        {Array.from({ length: 7 }, (_, index) => (
          <View key={index} style={styles.skeletonBarWrap}>
            <View
              style={[
                styles.skeletonBar,
                {
                  height: 56 + (index % 4) * 22,
                  backgroundColor: index === 4 ? palette.accentSoft : palette.track,
                },
              ]}
            />
            <View style={[styles.skeletonLabel, { backgroundColor: palette.mutedTrack }]} />
          </View>
        ))}
      </View>
    </Animated.View>
  );
});

const EmptyState = memo(function EmptyState({ colors, itemWidth, text }: { colors: any; itemWidth: number; text: string }) {
  return (
    <View style={[styles.stateContainer, { width: itemWidth }]}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.input }]}>
        <SymbolView name="chart.bar" size={26} tintColor={colors.textSecondary} />
      </View>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{text}</Text>
    </View>
  );
});

const getDefaultSelectedBarIndex = (bars: BarData[]) => {
  const currentNonEmptyIndex = bars.findIndex((bar) => bar.isCurrent && bar.total > 0);
  if (currentNonEmptyIndex >= 0) return currentNonEmptyIndex;

  const firstNonEmptyIndex = bars.findIndex((bar) => bar.total > 0);
  return firstNonEmptyIndex >= 0 ? firstNonEmptyIndex : null;
};

const ChartSlide = memo(function ChartSlide({
  slide,
  colors,
  palette,
  fontSizes,
  itemWidth,
  onPressBar,
  opensDayOnPress,
}: {
  slide: Slide;
  colors: any;
  palette: ChartPalette;
  fontSizes: Record<string, number>;
  itemWidth: number;
  onPressBar: (bar: BarData) => void;
  opensDayOnPress: boolean;
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(() => getDefaultSelectedBarIndex(slide.bars));

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSelectedIndex(getDefaultSelectedBarIndex(slide.bars));
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [slide.id, slide.bars]);

  const selectedBar = selectedIndex === null ? undefined : slide.bars[selectedIndex];
  const maxTotal = Math.max(1, ...slide.bars.map((bar) => bar.total));
  const chartWidth = itemWidth - 40;
  const barSlotWidth = Math.max(28, chartWidth / Math.max(slide.bars.length, 1));
  const barWidth = Math.min(34, Math.max(16, barSlotWidth * 0.46));
  const tooltipLeft = selectedIndex === null
    ? 8
    : Math.min(
      Math.max(8, selectedIndex * barSlotWidth + barSlotWidth / 2 - 48),
      Math.max(8, chartWidth - 104)
    );

  const handleSelectBar = useCallback((bar: BarData, index: number) => {
    setSelectedIndex(bar.total > 0 ? index : null);
    onPressBar(bar);
  }, [onPressBar]);

  return (
    <View style={[styles.slide, { width: itemWidth }]}>
      <View style={styles.slideHeader}>
        <View>
          <Text style={[styles.kicker, { color: colors.textSecondary, fontSize: fontSizes.xs }]}>
            {slide.periodLabel}
          </Text>
          <Text style={[styles.title, { color: colors.text, fontSize: fontSizes["3xl"] }]}>
            {slide.summary.done}/{slide.summary.total}
          </Text>
        </View>
        <View style={[styles.scorePill, { backgroundColor: colors.input }]}>
          <Text style={[styles.scoreText, { color: colors.text, fontSize: fontSizes.sm }]}>
            {slide.summary.completion}%
          </Text>
        </View>
      </View>

      <View style={[styles.chartArea, { width: chartWidth }]}>
        <View style={styles.gridLayer} pointerEvents="none">
          <View style={[styles.gridLine, { backgroundColor: palette.grid }]} />
          <View style={[styles.gridLine, { backgroundColor: palette.grid }]} />
          <View style={[styles.gridLine, { backgroundColor: palette.grid }]} />
        </View>

        {selectedBar && (
          <Animated.View
            key={`${slide.id}-${selectedIndex}`}
            entering={FadeIn.duration(120)}
            layout={LinearTransition.duration(160)}
            style={[styles.tooltip, { left: tooltipLeft, backgroundColor: colors.text }]}
            pointerEvents="none"
          >
            <Text style={[styles.tooltipTitle, { color: colors.card }]}>{selectedBar.caption}</Text>
            <Text style={[styles.tooltipValue, { color: colors.card }]}>
              {selectedBar.done}/{selectedBar.total}
            </Text>
            <View style={[styles.tooltipArrow, { borderTopColor: colors.text }]} />
          </Animated.View>
        )}

        <View style={styles.barsRow}>
          {slide.bars.map((bar, index) => {
            const totalHeight = bar.total > 0
              ? Math.max(MIN_BAR_HEIGHT, (bar.total / maxTotal) * CHART_HEIGHT)
              : MIN_BAR_HEIGHT;
            const doneHeight = bar.total > 0
              ? Math.max(4, (bar.done / bar.total) * totalHeight)
              : 0;
            const isSelected = index === selectedIndex;

            return (
              <Pressable
                key={`${bar.date}-${index}`}
                accessibilityRole="button"
                accessibilityLabel={`${bar.caption}, ${bar.done}/${bar.total}`}
                onPress={() => handleSelectBar(bar, index)}
                style={[styles.barSlot, { width: barSlotWidth }]}
              >
                <View
                  style={[
                    styles.barTrack,
                    {
                      width: barWidth,
                      height: totalHeight,
                      backgroundColor: isSelected ? palette.accentSoft : palette.track,
                    },
                  ]}
                >
                  {isSelected && <View style={[styles.barGlow, { backgroundColor: palette.accentSoft }]} />}
                  {bar.total > 0 && (
                    <LinearGradient
                      colors={bar.isCurrent || isSelected
                        ? [palette.accentSoft, palette.accent]
                        : [colors.textSecondary, colors.text]}
                      start={{ x: 0.5, y: 0 }}
                      end={{ x: 0.5, y: 1 }}
                      style={[
                        styles.barFill,
                        {
                          height: doneHeight,
                          opacity: bar.isCurrent || isSelected ? 1 : 0.74,
                        },
                      ]}
                    />
                  )}
                  {isSelected && <View style={[styles.barRing, { borderColor: palette.accentSoft }]} />}
                </View>
                {isSelected && opensDayOnPress && (
                  <View style={[styles.openIndicator, { backgroundColor: palette.accent }]} />
                )}
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.72}
                  style={[
                    styles.barLabel,
                    {
                      color: isSelected ? colors.text : colors.textSecondary,
                      fontSize: fontSizes.xs,
                      fontFamily: isSelected ? "Satoshi-Bold" : "Satoshi-Medium",
                    },
                  ]}
                >
                  {bar.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
});

export default function StatsBarGraph({
  daysData,
  period,
  statsPreferences = DEFAULT_STATS_PREFERENCES,
  onSlideChange,
}: StatsBarGraphProps) {
  const { width: screenWidth } = useWindowDimensions();
  const { colors } = useTheme();
  const { fontSizes } = useFont();
  const { t, language } = useAppTranslation();
  const locale = language === "en" ? "en-US" : "fr-FR";
  const palette = useMemo<ChartPalette>(() => {
    const accent = colors.doneSecondary || colors.actionButton || colors.text;
    return {
      accent,
      accentSoft: colors.donePrimary || colors.checkbox || colors.border,
      track: colors.input || colors.border,
      mutedTrack: colors.border || colors.input,
      grid: colors.border || "rgba(120, 120, 120, 0.16)",
    };
  }, [
    colors.actionButton,
    colors.border,
    colors.checkbox,
    colors.donePrimary,
    colors.doneSecondary,
    colors.input,
    colors.text,
  ]);
  const queryClient = useQueryClient();
  const setSelectedDate = useStore((state: { setSelectedDate: (date: Date) => void }) => state.setSelectedDate);
  const flatListRef = useRef<FlatList<Slide>>(null);
  const onSlideChangeRef = useRef(onSlideChange);
  const itemWidth = Math.min(screenWidth * 0.9, 520);
  const [isLoadingSlides, setIsLoadingSlides] = useState(true);
  const [displayedSlides, setDisplayedSlides] = useState<Slide[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [opensDayOnPress, setOpensDayOnPress] = useState(false);

  useEffect(() => {
    onSlideChangeRef.current = onSlideChange;
  }, [onSlideChange]);

  useEffect(() => {
    let isMounted = true;
    const loadingTimeoutId = setTimeout(() => {
      if (isMounted) {
        setIsLoadingSlides(true);
      }
    }, 120);

    const computeTimeoutId = setTimeout(() => {
      const nextSlides = transformDaysDataByPeriod(daysData || [], period, palette, locale, t, statsPreferences);
      if (!isMounted) return;

      clearTimeout(loadingTimeoutId);
      const nextIndex = Math.max(0, nextSlides.length - 1);
      setDisplayedSlides(nextSlides);
      setActiveIndex(nextIndex);
      setIsLoadingSlides(false);

      if (nextSlides[nextIndex]) {
        onSlideChangeRef.current?.(nextSlides[nextIndex]);
      }

      requestAnimationFrame(() => {
        flatListRef.current?.scrollToIndex({ index: nextIndex, animated: false });
      });
    }, 0);

    return () => {
      isMounted = false;
      clearTimeout(loadingTimeoutId);
      clearTimeout(computeTimeoutId);
    };
  }, [daysData, period, palette, locale, t, statsPreferences]);

  const handlePressBar = useCallback(async (bar: BarData) => {
    await Haptic.impactAsync(opensDayOnPress ? Haptic.ImpactFeedbackStyle.Medium : Haptic.ImpactFeedbackStyle.Light);

    if (!opensDayOnPress) {
      return;
    }

    setSelectedDate(new Date(bar.date));
    queryClient.invalidateQueries({ queryKey: ["days"] });
    router.navigate("/home");
  }, [opensDayOnPress, queryClient, setSelectedDate]);

  const toggleOpenDayOnPress = useCallback(async () => {
    await Haptic.impactAsync(Haptic.ImpactFeedbackStyle.Light);
    setOpensDayOnPress((current) => !current);
  }, []);

  const goToSlide = useCallback(async (index: number) => {
    if (index < 0 || index >= displayedSlides.length) return;
    await Haptic.impactAsync(Haptic.ImpactFeedbackStyle.Light);
    setActiveIndex(index);
    flatListRef.current?.scrollToIndex({ index, animated: true });
    onSlideChange?.(displayedSlides[index]);
  }, [displayedSlides, onSlideChange]);

  const handleMomentumScrollEnd = useCallback((event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / itemWidth);
    if (index < 0 || index >= displayedSlides.length) return;

    setActiveIndex(index);
    onSlideChange?.(displayedSlides[index]);
  }, [displayedSlides, itemWidth, onSlideChange]);

  const renderSlide = useCallback(({ item }: { item: Slide }) => (
    <ChartSlide
      slide={item}
      colors={colors}
      palette={palette}
      fontSizes={fontSizes}
      itemWidth={itemWidth}
      onPressBar={handlePressBar}
      opensDayOnPress={opensDayOnPress}
    />
  ), [colors, fontSizes, handlePressBar, itemWidth, opensDayOnPress, palette]);

  return (
    <Squircle style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.topBar}>
        <Text style={[styles.periodName, { color: colors.text, fontSize: fontSizes.base }]}>
          {getPeriodName(period, t)}
        </Text>
        <View style={styles.timelineControls}>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: opensDayOnPress }}
            accessibilityLabel={language === "en" ? "Open day on bar tap" : "Ouvrir le jour au toucher"}
            onPress={toggleOpenDayOnPress}
            style={[
              styles.redirectToggle,
              {
                backgroundColor: opensDayOnPress ? colors.text : colors.input,
              },
            ]}
          >
            <SymbolView
              name="calendar"
              size={14}
              tintColor={opensDayOnPress ? colors.card : colors.textSecondary}
            />
            <Text
              numberOfLines={1}
              style={[
                styles.redirectToggleText,
                {
                  color: opensDayOnPress ? colors.card : colors.textSecondary,
                  fontSize: fontSizes.xs,
                },
              ]}
            >
              {language === "en" ? "Open" : "Ouvrir"}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={activeIndex === 0 || isLoadingSlides}
            onPress={() => goToSlide(activeIndex - 1)}
            style={[styles.iconButton, { backgroundColor: colors.input, opacity: activeIndex === 0 || isLoadingSlides ? 0.42 : 1 }]}
          >
            <SymbolView name="chevron.left" size={15} tintColor={colors.text} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={activeIndex >= displayedSlides.length - 1 || isLoadingSlides}
            onPress={() => goToSlide(activeIndex + 1)}
            style={[styles.iconButton, { backgroundColor: colors.input, opacity: activeIndex >= displayedSlides.length - 1 || isLoadingSlides ? 0.42 : 1 }]}
          >
            <SymbolView name="chevron.right" size={15} tintColor={colors.text} />
          </Pressable>
        </View>
      </View>

      {isLoadingSlides ? (
        <ChartSkeleton colors={colors} palette={palette} itemWidth={itemWidth} />
      ) : displayedSlides.length === 0 ? (
        <EmptyState colors={colors} itemWidth={itemWidth} text={t("stats.chart.empty")} />
      ) : (
        <>
          <FlatList
            ref={flatListRef}
            data={displayedSlides}
            renderItem={renderSlide}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            scrollEventThrottle={16}
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            initialScrollIndex={Math.max(0, displayedSlides.length - 1)}
            getItemLayout={(_, index) => ({
              length: itemWidth,
              offset: itemWidth * index,
              index,
            })}
            onScrollToIndexFailed={({ index }) => {
              requestAnimationFrame(() => {
                flatListRef.current?.scrollToOffset({ offset: itemWidth * index, animated: false });
              });
            }}
            onMomentumScrollEnd={handleMomentumScrollEnd}
            removeClippedSubviews
            initialNumToRender={1}
            maxToRenderPerBatch={1}
            windowSize={3}
          />
          <View style={styles.timeline}>
            {displayedSlides.map((slide, index) => (
              <Pressable
                key={slide.id}
                accessibilityRole="button"
                accessibilityLabel={slide.periodLabel}
                onPress={() => goToSlide(index)}
                style={[
                  styles.timelineDot,
                  {
                    width: index === activeIndex ? 22 : 6,
                    backgroundColor: index === activeIndex ? colors.text : colors.border,
                  },
                ]}
              />
            ))}
          </View>
        </>
      )}
    </Squircle>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    alignSelf: "center",
    borderRadius: 30,
    overflow: "hidden",
    paddingBottom: 16,
    paddingTop: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    width: "90%",
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    width: "100%",
  },
  periodName: {
    fontFamily: "Satoshi-Bold",
  },
  timelineControls: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  redirectToggle: {
    alignItems: "center",
    borderRadius: 16,
    flexDirection: "row",
    gap: 5,
    height: 32,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  redirectToggleText: {
    fontFamily: "Satoshi-Bold",
  },
  iconButton: {
    alignItems: "center",
    borderRadius: 16,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  stateContainer: {
    alignItems: "center",
    height: 268,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  skeletonHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    width: "100%",
  },
  skeletonLine: {
    borderRadius: 999,
    height: 18,
  },
  skeletonBars: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 12,
    height: 186,
    justifyContent: "center",
  },
  skeletonBarWrap: {
    alignItems: "center",
    gap: 10,
    justifyContent: "flex-end",
  },
  skeletonBar: {
    borderRadius: 14,
    width: 26,
  },
  skeletonLabel: {
    borderRadius: 999,
    height: 6,
    width: 18,
  },
  emptyIcon: {
    alignItems: "center",
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    marginBottom: 12,
    width: 48,
  },
  emptyText: {
    fontFamily: "Satoshi-Medium",
    fontSize: 15,
    textAlign: "center",
  },
  slide: {
    paddingHorizontal: 20,
  },
  slideHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 14,
  },
  kicker: {
    fontFamily: "Satoshi-Medium",
    marginBottom: 2,
  },
  title: {
    fontFamily: "Satoshi-Bold",
    letterSpacing: 0,
  },
  scorePill: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  scoreText: {
    fontFamily: "Satoshi-Bold",
  },
  chartArea: {
    height: 232,
    justifyContent: "flex-end",
    marginTop: 6,
  },
  gridLayer: {
    bottom: 42,
    height: CHART_HEIGHT,
    justifyContent: "space-between",
    left: 0,
    position: "absolute",
    right: 0,
  },
  gridLine: {
    height: StyleSheet.hairlineWidth,
    width: "100%",
  },
  tooltip: {
    alignItems: "center",
    borderRadius: 12,
    minWidth: 96,
    paddingHorizontal: 10,
    paddingVertical: 8,
    position: "absolute",
    top: 0,
    zIndex: 4,
  },
  tooltipTitle: {
    fontFamily: "Satoshi-Medium",
    fontSize: 11,
    opacity: 0.72,
  },
  tooltipValue: {
    fontFamily: "Satoshi-Bold",
    fontSize: 14,
    marginTop: 1,
  },
  tooltipArrow: {
    borderLeftColor: "transparent",
    borderLeftWidth: 7,
    borderRightColor: "transparent",
    borderRightWidth: 7,
    borderTopWidth: 7,
    bottom: -7,
    height: 0,
    position: "absolute",
    width: 0,
  },
  barsRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    height: CHART_HEIGHT + 42,
    justifyContent: "space-between",
  },
  barSlot: {
    alignItems: "center",
    gap: 9,
    height: "100%",
    justifyContent: "flex-end",
  },
  barTrack: {
    borderRadius: 18,
    justifyContent: "flex-end",
    overflow: "visible",
  },
  barFill: {
    borderRadius: 18,
    bottom: 0,
    left: 0,
    overflow: "hidden",
    position: "absolute",
    right: 0,
  },
  barGlow: {
    borderRadius: 22,
    bottom: -5,
    left: -5,
    opacity: 0.38,
    position: "absolute",
    right: -5,
    top: -5,
  },
  barRing: {
    borderRadius: 21,
    borderWidth: 3,
    bottom: -2,
    left: -2,
    opacity: 0.92,
    position: "absolute",
    right: -2,
    top: -2,
  },
  openIndicator: {
    borderRadius: 999,
    height: 4,
    marginTop: -4,
    opacity: 0.75,
    width: 4,
  },
  barLabel: {
    fontFamily: "Satoshi-Medium",
    textAlign: "center",
    width: "100%",
  },
  timeline: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    minHeight: 18,
    paddingHorizontal: 22,
  },
  timelineDot: {
    borderRadius: 999,
    height: 6,
  },
});
