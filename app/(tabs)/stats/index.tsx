import CreateModalHost from "@/components/CreateModalHost";
import HorizontalBarGraph from "@/components/horizontalBarGraph";
import PremiumCTAButton from "@/components/PremiumCTAButton";
import ProfileSettingsButton from "@/components/ProfileSettingsButton";
import Squircle from "@/components/Squircle";
import StatsBarGraph from "@/components/statsBarGraph";
import StatsCard from "@/components/statsCard";
import StatsCardCharge from "@/components/statsCardCharge";
import StatsCardCompletion from "@/components/statsCardCompletion";
import StatsInfoButton from "@/components/StatsInfoButton";
import StatsPeriodMenu from "@/components/StatsPeriodMenu";
import StatsPreferencesModal from "@/components/StatsPreferencesModal";
import StatsStreak from "@/components/statsStreak";
import { useAuthUserId } from "@/lib/AuthSessionContext";
import {
  CalculatedStats,
  calculateStats,
  filterStatsDays,
  getGlobalStatsDays,
  StatsDay,
  StatsPeriod,
  toDateKey,
} from "@/lib/calculateStats";
import { statsDaysQueryKey } from "@/lib/daysQueryKeys";
import { useFont } from "@/lib/FontContext";
import { useAppTranslation } from "@/lib/i18n";
import { getStatsImageSource } from "@/lib/imageHelper";
import { useProfile } from "@/lib/profile";
import { SCREEN_HEADER_HEIGHT, SCREEN_HEADER_HORIZONTAL_PADDING, SCREEN_HEADER_TITLE_LINE_HEIGHT, SCREEN_HEADER_TOP_OFFSET } from "@/lib/screenHeader";
import { useSubscription } from "@/lib/subscription";
import { supabase } from "@/lib/supabase";
import { buildTagUsageStats, getTagUsageSourceData, TAG_USAGE_STATS_QUERY_KEY, TagUsageBucket } from "@/lib/tags";
import { useTheme } from "@/lib/ThemeContext";
import { useStatsPreferences } from "@/lib/useStatsPreferences";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { SquircleButton } from "expo-squircle-view";
import { SymbolView } from "expo-symbols";
import { useCallback, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated from 'react-native-reanimated';


type Slide = {
  bars: {
    stacks: { value: number; color: string; marginBottom?: number }[];
    label: string;
    caption?: string;
    date: string;
    days?: StatsDay[];
  }[];
  periodLabel: string;
  rangeEnd: string;
  rangeStart: string;
  id: string;
  stats: CalculatedStats;
};

const withAlpha = (color: string, alpha: number) => {
  const normalizedAlpha = Math.round(Math.min(Math.max(alpha, 0), 1) * 255)
    .toString(16)
    .padStart(2, "0");

  if (/^#[0-9a-fA-F]{6}$/.test(color)) {
    return `${color}${normalizedAlpha}`;
  }

  if (/^#[0-9a-fA-F]{3}$/.test(color)) {
    const [, r, g, b] = color;
    return `#${r}${r}${g}${g}${b}${b}${normalizedAlpha}`;
  }

  return color;
};

const isPerfectStatsDay = (day?: StatsDay) => {
  if (!day) return false;

  const total = Math.max(day.total || 0, 0);
  const done = Math.min(Math.max(day.done_count || 0, 0), total);

  return total > 0 && done === total;
};

const calculateCurrentStreak = (days: StatsDay[]) => {
  const daysByDate = new Map<string, StatsDay>();

  for (const day of days) {
    daysByDate.set(toDateKey(new Date(day.date)), day);
  }

  let streak = 0;
  const cursor = new Date();
  cursor.setDate(cursor.getDate() - 1);

  while (isPerfectStatsDay(daysByDate.get(toDateKey(cursor)))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
};


export default function Stats() {
  const { fontSizes } = useFont();
  const { colors, actualTheme } = useTheme();
  const { t } = useAppTranslation();
  const router = useRouter();
  const { canUseAdvancedStats, isPremium } = useSubscription();
  const userId = useAuthUserId();
  const [showInfoPopUp, setShowInfoPopUp] = useState(false);
  const [period, setPeriod] = useState<StatsPeriod>('Par semaine');
  const [slideStats, setSlideStats] = useState<CalculatedStats | null>(null);
  const [activeSlide, setActiveSlide] = useState<Slide | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(Number.MAX_SAFE_INTEGER);
  const [showUnusedTags, setShowUnusedTags] = useState(false);
  const profileQuery = useProfile();
  const showLateAdjustmentStats = profileQuery.data?.lockPastDaysEnabled ?? true;
  const activeSlideSignatureRef = useRef<string | null>(null);
  const lastPeriodChangeAtRef = useRef(0);
  const {
    isPreferencePending,
    preferences: statsPreferences,
    setPreferenceOptimistically,
  } = useStatsPreferences();
  const [loadingState, setLoadingState] = useState(true);

  // Gestionnaire pour les changements de slide
  const handleSlideChange = useCallback((slide: Slide) => {
    const slideSignature = [
      slide.id,
      slide.stats.totalDoneCount,
      slide.stats.totalTasksCount,
      slide.stats.completion,
      slide.stats.lateAdjustmentRate,
    ].join(":");

    if (activeSlideSignatureRef.current === slideSignature) {
      return;
    }

    activeSlideSignatureRef.current = slideSignature;
    setActiveSlide(slide);

    // Ne mettre à jour les stats que si ce n'est pas "Global"
    if (period === 'Global') return;

    setSlideStats(slide.stats);
    setLoadingState(false);
  }, [period]);

  // FETCHING DES JOURS

  const getDays = async () => {
    if (!userId) {
      return [];
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from("Days")
      .select("date,total,done_count,late_adjusted_count")
      .eq("user_id", userId)
      .lte("date", today.toISOString())
      .order("date", { ascending: false });
    if (error) {
      console.error('Erreur lors de la récupération des jours:', error);
      return [];
    }
    return data;
  };

  const daysQuery = useQuery({
    queryKey: statsDaysQueryKey(userId),
    queryFn: getDays,
    enabled: !!userId,
  });

  const chartDaysData = useMemo(() => (daysQuery.data || []) as StatsDay[], [daysQuery.data]);
  const streak = useMemo(() => calculateCurrentStreak(chartDaysData), [chartDaysData]);
  const globalStats = useMemo(
    () => calculateStats(getGlobalStatsDays(chartDaysData), statsPreferences),
    [chartDaysData, statsPreferences]
  );
  const displayedStats = period === "Global" ? globalStats : slideStats || globalStats;
  const includedTagStatsDateKeys = useMemo(() => {
    if (!activeSlide) {
      return null;
    }

    return filterStatsDays(
      activeSlide.bars.flatMap((bar) => bar.days ?? []),
      statsPreferences
    )
      .map((day) => day.date.slice(0, 10))
      .filter(Boolean)
      .sort();
  }, [activeSlide, statsPreferences]);

  const tagUsageBuckets = useMemo<TagUsageBucket[] | null>(() => {
    if (!activeSlide) {
      return null;
    }

    return activeSlide.bars.map((bar, index) => ({
      id: `${activeSlide.id}-${index}`,
      label: bar.label,
      dateKeys: filterStatsDays(bar.days ?? [], statsPreferences)
        .map((day) => day.date.slice(0, 10))
        .filter(Boolean)
        .sort(),
    }));
  }, [activeSlide, statsPreferences]);

  const tagStatsDateRange = useMemo(() => {
    const dates = includedTagStatsDateKeys;

    if (!dates?.length) {
      return { startDateKey: null, endDateKey: null };
    }

    return {
      startDateKey: dates[0],
      endDateKey: dates[dates.length - 1],
    };
  }, [includedTagStatsDateKeys]);

  const tagUsageSourceQuery = useQuery({
    enabled: canUseAdvancedStats && Boolean(tagStatsDateRange.startDateKey && tagStatsDateRange.endDateKey),
    queryKey: [
      ...TAG_USAGE_STATS_QUERY_KEY,
      "source",
      tagStatsDateRange.startDateKey,
      tagStatsDateRange.endDateKey,
    ],
    queryFn: () => getTagUsageSourceData({
      startDateKey: tagStatsDateRange.startDateKey,
      endDateKey: tagStatsDateRange.endDateKey,
      userId,
    }),
    staleTime: 1000 * 60 * 5,
  });

  const tagUsageStats = useMemo(() => {
    if (!activeSlide || !tagUsageBuckets || !tagUsageSourceQuery.data) {
      return [];
    }

    return buildTagUsageStats({
      buckets: tagUsageBuckets ?? [],
      startDateKey: tagStatsDateRange.startDateKey,
      endDateKey: tagStatsDateRange.endDateKey,
      includedDateKeys: includedTagStatsDateKeys ?? [],
      includeUnused: showUnusedTags,
      sourceData: tagUsageSourceQuery.data,
    });
  }, [
    activeSlide,
    includedTagStatsDateKeys,
    showUnusedTags,
    tagStatsDateRange.endDateKey,
    tagStatsDateRange.startDateKey,
    tagUsageBuckets,
    tagUsageSourceQuery.data,
  ]);

  const periodOptions = useMemo<StatsPeriod[]>(() => ['Par semaine', 'Par mois', 'Par année'], []);
  const displayedLoadingState = canUseAdvancedStats ? loadingState : daysQuery.isLoading;
  const topContentPadding = SCREEN_HEADER_TOP_OFFSET;
  const topScrimHeight = SCREEN_HEADER_TOP_OFFSET + SCREEN_HEADER_HEIGHT;
  const topScrimColors = useMemo(
    () => [
      colors.background,
      withAlpha(colors.background, 0.9),
      withAlpha(colors.background, 0),
    ] as const,
    [colors.background]
  );

  const getDisplayedPeriod = useCallback((period: string) => {
    if (period === 'Par semaine') return t('stats.general.period.week');
    if (period === 'Par mois') return t('stats.general.period.month');
    if (period === 'Par année') return t('stats.general.period.year');
    return t('stats.general.period.global');
  }, [t]);

  const handlePeriodSelect = useCallback(async (selectedPeriod: StatsPeriod) => {
    if (selectedPeriod === period) {
      return;
    }

    const now = Date.now();
    if (now - lastPeriodChangeAtRef.current < 350) {
      return;
    }

    lastPeriodChangeAtRef.current = now;
    activeSlideSignatureRef.current = null;
    setActiveSlideIndex(Number.MAX_SAFE_INTEGER);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPeriod(selectedPeriod);
    console.log('Période sélectionnée :', selectedPeriod);
  }, [period]);

  const handleSlideIndexChange = useCallback((index: number) => {
    setActiveSlideIndex(index);
  }, []);

  const handleShowUnusedTagsChange = useCallback(async (value: boolean) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowUnusedTags(value);
  }, []);

  const toggleInfoPopup = useCallback(() => {
    setShowInfoPopUp((current) => !current);
  }, []);

  const handleSettingsPress = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/settings");
  }, [router]);

  const profileName = useMemo(() => {
    return profileQuery.data?.name?.trim() || t("settings.root.defaultUserName");
  }, [profileQuery.data?.name, t]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={{ position: 'absolute', top: 70, right: 30, zIndex: 10, }}
      >
      </View>

      <StatsPreferencesModal
        isVisible={showInfoPopUp}
        isPreferencePending={isPreferencePending}
        preferences={statsPreferences}
        onPreferenceChange={setPreferenceOptimistically}
        showUnusedTags={showUnusedTags}
        onShowUnusedTagsChange={handleShowUnusedTagsChange}
        onClose={() => setShowInfoPopUp(false)}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.listContent, { paddingTop: topContentPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileHeader}>
          <View style={styles.profileIdentity}>
            {/* <View style={[styles.profileIconContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <SymbolView
                name="person.fill"
                size={31}
                tintColor={colors.textSecondary}
              />
            </View> */}

            <View style={styles.profileTextGroup}>
              <View style={styles.profileNameRow}>
                <Text
                  numberOfLines={1}
                  style={[styles.profileGreeting, { color: colors.text, fontSize: fontSizes["3xl"] }]}
                >
                  {t("profile.greeting", { name: profileName })}
                </Text>
                {isPremium ? (
                  <View style={styles.premiumBadge}>
                    <Text style={styles.premiumBadgeText}>Dun+</Text>
                  </View>
                ) : null}
              </View>

              {/* {user?.email ? (
                <Text
                  numberOfLines={1}
                  style={[styles.profileEmail, { color: colors.textSecondary }]}
                >
                  {user.email}
                </Text>
              ) : null} */}
            </View>
          </View>

          <ProfileSettingsButton onPress={handleSettingsPress} />
        </View>

        <View style={styles.periodPickerContainer}>
          <StatsPeriodMenu
            period={period}
            periodOptions={periodOptions}
            getDisplayedPeriod={getDisplayedPeriod}
            onPeriodChange={handlePeriodSelect}
          />

          <StatsInfoButton
            onPress={toggleInfoPopup}
          />
        </View>

        <View style={styles.overviewSection}>
          <StatsBarGraph
            activeSlideIndex={activeSlideIndex}
            daysData={chartDaysData}
            period={period}
            statsPreferences={statsPreferences}
            onSlideChange={handleSlideChange}
            onSlideIndexChange={handleSlideIndexChange}
          />
          <StatsStreak
            activeSlideIndex={activeSlideIndex}
            daysData={chartDaysData}
            onSlideIndexChange={handleSlideIndexChange}
            period={period}
            value={streak.toString()}
          />
          <View style={styles.cardsContainer}>
            <View style={styles.cardsRow}>
              <StatsCard
                image={getStatsImageSource('done', actualTheme)}
                title={t('stats.general.cards.tasksDone')}
                value={displayedStats.totalDoneCount.toString()}
                loading={displayedLoadingState}
              />
              <StatsCard
                image={getStatsImageSource('perfect', actualTheme)}
                title={t('stats.general.cards.perfectDays')}
                value={displayedStats.perfectDaysCount.toString()}
                loading={displayedLoadingState}
              />
            </View>
            <View style={styles.cardsRow}>
              <StatsCardCompletion
                image={getStatsImageSource('completion', actualTheme)}
                title={t('stats.general.cards.completion')}
                value={displayedStats.completion}
                loading={displayedLoadingState}
              />
              <StatsCardCharge
                image={getStatsImageSource('charge', actualTheme)}
                title={t('stats.general.cards.charge')}
                value={displayedStats.charge.toString()}
                loading={displayedLoadingState}
              />
            </View>
            {showLateAdjustmentStats ? (
              <SquircleButton
                activeOpacity={0.82}
                cornerSmoothing={100}
                onPress={() => router.push("/stats/adjustmentExplain")}
                preserveSmoothing
                style={[styles.adjustmentMetric, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={[styles.adjustmentIcon, { backgroundColor: colors.background }]}>
                  <SymbolView name="arrow.triangle.2.circlepath" size={23} tintColor={colors.textSecondary} />
                </View>
                <View style={styles.adjustmentTextGroup}>
                  <Text style={[styles.adjustmentTitle, { color: colors.text, fontSize: fontSizes.lg }]}>
                    {t('stats.general.cards.lateAdjustmentRate')}
                  </Text>
                  <Text style={[styles.adjustmentSubtitle, { color: colors.textSecondary }]}>
                    {t('stats.general.cards.lateAdjustmentCount', { count: displayedStats.lateAdjustedTasksCount })}
                  </Text>
                </View>
                {displayedLoadingState ? (
                  <Animated.Text
                    style={[styles.adjustmentValue, { color: colors.text, fontSize: fontSizes['3xl'] }]}
                  />
                ) : (
                  <Animated.Text
                    style={[styles.adjustmentValue, { color: colors.text, fontSize: fontSizes['3xl'] }]}
                  >
                    {displayedStats.lateAdjustmentRate}
                  </Animated.Text>
                )}
              </SquircleButton>
            ) : null}
          </View>

          {canUseAdvancedStats ? (
            <HorizontalBarGraph
              data={tagUsageStats}
              isLoading={!activeSlide || tagUsageSourceQuery.isLoading}
              periodLabel={activeSlide?.periodLabel ?? getDisplayedPeriod(period)}
            />
          ) : (
            <Squircle
              style={[styles.premiumStatsCard, { backgroundColor: colors.card, borderColor: "#F4BA00" }]}
              cornerSmoothing={100}
              preserveSmoothing={true}
            >
              <View style={styles.premiumIcon}>
                <SymbolView name="chart.bar.xaxis" size={24} tintColor="#2C2405" />
              </View>
              <Text style={[styles.premiumTitle, { color: colors.text }]}>
                {t("stats.general.premium.title")}
              </Text>
              <Text style={[styles.premiumMessage, { color: colors.textSecondary }]}>
                {t("stats.general.premium.message")}
              </Text>
              <PremiumCTAButton
                title={t("stats.general.premium.cta")}
                onPress={() => router.push("/settings/premium")}
              />
            </Squircle>
          )}
        </View>
      </ScrollView>
      <LinearGradient
        pointerEvents="none"
        colors={topScrimColors}
        locations={[0, 0.58, 1]}
        style={[styles.topScrim, { height: topScrimHeight }]}
      />
      <CreateModalHost activePath="/stats" />
    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
    alignSelf: 'center',
    width: '100%',
    height: '100%',
  },
  scrollView: {
    width: '100%',
  },

  topContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '90%',
    gap: 10,
    marginBottom: 10,
  },
  listContent: {
    alignItems: "center",
    paddingBottom: 200,
  },
  profileHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    minHeight: SCREEN_HEADER_HEIGHT,
    paddingHorizontal: SCREEN_HEADER_HORIZONTAL_PADDING,
    width: "100%",
  },
  profileIdentity: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 14,
    minWidth: 0,
    paddingRight: 16,
  },
  profileIconContainer: {
    alignItems: "center",
    borderRadius: 32,
    borderWidth: 0.5,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  profileTextGroup: {
    flex: 1,
    minWidth: 0,
  },
  profileNameRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    minWidth: 0,
  },
  profileGreeting: {
    flexShrink: 1,
    fontFamily: "Satoshi-Bold",
    lineHeight: SCREEN_HEADER_TITLE_LINE_HEIGHT,
  },
  profileEmail: {
    fontFamily: "Satoshi-Regular",
    fontSize: 14,
    marginTop: 3,
    opacity: 0.7,
  },
  premiumBadge: {
    alignItems: "center",
    backgroundColor: "#FFE39C",
    borderColor: "#FFCF4D",
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  premiumBadgeText: {
    color: "#2F2500",
    fontFamily: "Satoshi-Bold",
    fontSize: 12,
  },
  topScrim: {
    left: 0,
    position: "absolute",
    right: 0,
    top: -24,
    zIndex: 4,
  },
  overviewSection: {
    alignItems: "center",
    gap: 18,
    width: "100%",
  },
  cardsContainer: {
    alignItems: "center",
    gap: 10,
    // marginVertical: 10,
    width: "100%",
  },

  cardsRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '90%',
    height: 100,
  },
  periodPickerContainer: {
    marginBottom: 10,
    width: "90%",
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  adjustmentMetric: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 76,
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: "90%",
    boxShadow: '0px 6px 10px rgba(0, 0, 0, 0.1)',
    gap: 4,
  },
  adjustmentIcon: {
    alignItems: "center",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  adjustmentTextGroup: {
    flex: 1,
    minWidth: 0,
  },
  adjustmentTitle: {
    fontFamily: "Satoshi-Medium",
    opacity: 0.7,
  },
  adjustmentSubtitle: {
    fontFamily: "Satoshi-Regular",
    fontSize: 12,
    marginTop: 2,
    opacity: 0.7,
  },
  adjustmentValue: {
    fontFamily: "Satoshi-Bold",
  },
  premiumStatsCard: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 28,
    width: "90%",
  },
  premiumIcon: {
    alignItems: "center",
    backgroundColor: "#F4BA00",
    borderRadius: 18,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  premiumTitle: {
    fontFamily: "Satoshi-Bold",
    fontSize: 20,
    textAlign: "center",
  },
  premiumMessage: {
    fontFamily: "Satoshi-Regular",
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center",
  },
});
