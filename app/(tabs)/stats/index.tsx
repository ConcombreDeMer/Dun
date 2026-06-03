import CreateModalHost from "@/components/CreateModalHost";
import HorizontalBarGraph from "@/components/horizontalBarGraph";
import SecondaryButton from "@/components/secondaryButton";
import StatsBarGraph from "@/components/statsBarGraph";
import StatsCard from "@/components/statsCard";
import StatsCardCharge from "@/components/statsCardCharge";
import StatsCardCompletion from "@/components/statsCardCompletion";
import StatsPreferencesModal from "@/components/StatsPreferencesModal";
import StatsStreak from "@/components/statsStreak";
import {
  CalculatedStats,
  calculateStats,
  createEmptyStatsDay,
  filterStatsDays,
  getGlobalStatsDays,
  StatsDay,
  StatsPeriod,
  toDateKey,
} from "@/lib/calculateStats";
import { useAppTranslation } from "@/lib/i18n";
import { useSubscription } from "@/lib/subscription";
import { supabase } from "@/lib/supabase";
import { getTagUsageStats, TAG_USAGE_STATS_QUERY_KEY } from "@/lib/tags";
import { useTheme } from "@/lib/ThemeContext";
import { useStatsPreferences } from "@/lib/useStatsPreferences";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated from 'react-native-reanimated';

interface StatsData {
  completion: string;
  charge: number;
  streak: number;
}

type Slide = {
  bars: {
    stacks: { value: number; color: string; marginBottom?: number }[];
    label: string;
    date: string;
    days?: StatsDay[];
  }[];
  periodLabel: string;
  id: string;
  stats: CalculatedStats;
};

export default function Stats() {
  const { colors } = useTheme();
  const { t } = useAppTranslation();
  const router = useRouter();
  const { canUseAdvancedStats } = useSubscription();
  const [showInfoPopUp, setShowInfoPopUp] = useState(false);
  const [period, setPeriod] = useState<StatsPeriod>('Par semaine');
  const [slideStats, setSlideStats] = useState<CalculatedStats | null>(null);
  const [activeSlide, setActiveSlide] = useState<Slide | null>(null);
  const [showUnusedTags, setShowUnusedTags] = useState(false);
  const {
    isPreferencePending,
    preferences: statsPreferences,
    setPreferenceOptimistically,
  } = useStatsPreferences();
  const [loadingState, setLoadingState] = useState(true);

  // Gestionnaire pour les changements de slide
  const handleSlideChange = useCallback((slide: Slide) => {
    setActiveSlide(slide);

    // Ne mettre à jour les stats que si ce n'est pas "Global"
    if (period === 'Global') return;

    setSlideStats(slide.stats);
    setLoadingState(false);
  }, [period]);


  // Cela évite de parcourir previousDays 4 fois et élimine les calculs redondants
  const calculateAllStats = useCallback((days: StatsDay[]): StatsData => {
    if (!days || days.length === 0) {
      return {
        completion: "0%",
        charge: 0,
        streak: 0,
      };
    }

    const { completion, charge: averageCharge } = calculateStats(days, statsPreferences);

    // Calcul du streak
    const today = new Date();
    const todayString = today.toDateString();
    let streak = 0;
    let currentDate = new Date();
    currentDate.setDate(currentDate.getDate() - 1);
    // Limiter la boucle aux 7 derniers jours et éviter recréation de Date
    for (let i = 0; i < Math.min(7, days.length); i++) {
      const day = days[i];
      const dayDate = new Date(day.date);
      const dayDateString = dayDate.toDateString();

      if (dayDateString === todayString) {
        continue;
      } else if (dayDateString === currentDate.toDateString()) {
        const total = Math.max(day.total || 0, 0);
        const done = Math.max(day.done_count || 0, 0);
        if (total > 0 && done === total) {
          streak++;
          currentDate.setDate(currentDate.getDate() - 1);
        }
      } else {
        break;
      }
    }
    return { completion, charge: averageCharge, streak };
  }, [statsPreferences]);


  // FETCHING DES JOURS

  const getDays = async () => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from("Days")
      .select("*")
      .lte("date", today.toISOString())
      .order("date", { ascending: false });
    if (error) {
      console.error('Erreur lors de la récupération des jours:', error);
      return [];
    }
    return data;
  };

  const daysQuery = useQuery({
    queryKey: ['days'],
    queryFn: getDays,
  });

  // Cela évite de recréer la fonction à chaque rendu
  const getLastWeekDays = useCallback((daysData: StatsDay[]) => {
    const lastWeekDays: StatsDay[] = [];
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    // Créer une Map pour O(1) lookup au lieu de O(n)
    const daysByDateString = new Map();
    for (const day of daysData) {
      const dayDate = new Date(day.date);
      daysByDateString.set(dayDate.toDateString(), day);
    }

    for (let i = 0; i < 7; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() - i);
      const targetDateString = toDateKey(targetDate);

      const dayData = daysByDateString.get(targetDateString);
      if (dayData) {
        lastWeekDays.push(dayData);
      } else {
        lastWeekDays.push(createEmptyStatsDay(targetDate));
      }
    }
    return lastWeekDays;
  }, []);

  const chartDaysData = useMemo(() => (daysQuery.data || []) as StatsDay[], [daysQuery.data]);
  const previousDays = useMemo(() => getLastWeekDays(chartDaysData), [chartDaysData, getLastWeekDays]);
  const streak = useMemo(() => calculateAllStats(previousDays).streak, [previousDays, calculateAllStats]);
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

  const tagStatsDateKeysQueryPart = useMemo(
    () => includedTagStatsDateKeys?.join("|") ?? "no-slide",
    [includedTagStatsDateKeys]
  );

  const tagUsageStatsQuery = useQuery({
    queryKey: [
      ...TAG_USAGE_STATS_QUERY_KEY,
      tagStatsDateRange.startDateKey,
      tagStatsDateRange.endDateKey,
      tagStatsDateKeysQueryPart,
      showUnusedTags,
    ],
    queryFn: () => getTagUsageStats({
      startDateKey: tagStatsDateRange.startDateKey,
      endDateKey: tagStatsDateRange.endDateKey,
      includedDateKeys: includedTagStatsDateKeys ?? [],
      includeUnused: showUnusedTags,
    }),
    enabled: !!activeSlide,
    placeholderData: (previousData) => previousData,
  });

  const periodOptions: StatsPeriod[] = ['Par semaine', 'Par mois', 'Par année', 'Global'];
  const displayedLoadingState = canUseAdvancedStats ? loadingState : daysQuery.isLoading;

  const getDisplayedPeriod = (period: string) => {
    if (period === 'Par semaine') return t('stats.general.period.week');
    if (period === 'Par mois') return t('stats.general.period.month');
    if (period === 'Par année') return t('stats.general.period.year');
    return t('stats.general.period.global');
  };

  const handlePeriodSelect = async (selectedPeriod: StatsPeriod) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPeriod(selectedPeriod);
    setSlideStats(null);
    setActiveSlide(null);
    console.log('Période sélectionnée :', selectedPeriod);
    setLoadingState(selectedPeriod !== 'Global');
  };

  const handleShowUnusedTagsChange = async (value: boolean) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowUnusedTags(value);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={{ position: 'absolute', top: 70, right: 20, zIndex: 10 }}
      >
        <SecondaryButton
          image='slider.horizontal.3'
          imageSize={27}
          onPress={showInfoPopUp ? () => setShowInfoPopUp(false) : () => setShowInfoPopUp(true)}
        />
      </View>

      <StatsPreferencesModal
        isVisible={showInfoPopUp}
        isPreferencePending={isPreferencePending}
        preferences={statsPreferences}
        period={period}
        periodOptions={periodOptions}
        getDisplayedPeriod={getDisplayedPeriod}
        onPreferenceChange={setPreferenceOptimistically}
        onPeriodChange={handlePeriodSelect}
        showUnusedTags={showUnusedTags}
        onShowUnusedTagsChange={handleShowUnusedTagsChange}
        onClose={() => setShowInfoPopUp(false)}
      />

      {/* Scrollable content */}
      <Animated.ScrollView
        style={{ width: '100%' }}
        contentContainerStyle={{ alignItems: 'center', paddingBottom: 200, display: 'flex', gap: 10 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topContainer}>
          <StatsStreak value={streak.toString()} />
        </View>

        <View
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 10,
            marginVertical: 10,
          }}
        >
        <View style={styles.cardsRow}>
          <StatsCard
            image={require('@/assets/images/stats/done.png')}
            title={t('stats.general.cards.tasksDone')}
            value={displayedStats.totalDoneCount.toString()}
            loading={displayedLoadingState}
          />
          <StatsCard
            image={require('@/assets/images/stats/perfect.png')}
            title={t('stats.general.cards.perfectDays')}
            value={displayedStats.perfectDaysCount.toString()}
            loading={displayedLoadingState}
          />
        </View>
        <View style={styles.cardsRow}>
          <StatsCardCompletion
            image={require('@/assets/images/stats/completion.png')}
            title={t('stats.general.cards.completion')}
            value={displayedStats.completion}
            loading={displayedLoadingState}
          />
          <StatsCardCharge
            image={require('@/assets/images/stats/charge.png')}
            title={t('stats.general.cards.charge')}
            value={displayedStats.charge.toString()}
            loading={displayedLoadingState}
          />
        </View>

        </View>


        {canUseAdvancedStats ? (
          <>
            <StatsBarGraph
              daysData={chartDaysData}
              period={period}
              statsPreferences={statsPreferences}
              onSlideChange={handleSlideChange}
            />

            <HorizontalBarGraph
              data={tagUsageStatsQuery.data ?? []}
              isLoading={!activeSlide || tagUsageStatsQuery.isLoading}
              periodLabel={activeSlide?.periodLabel ?? getDisplayedPeriod(period)}
            />
          </>
        ) : (
          <View style={[styles.premiumStatsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.premiumIcon}>
              <SymbolView name="chart.bar.xaxis" size={30} tintColor="#F4BA00" />
            </View>
            <Text style={[styles.premiumTitle, { color: colors.text }]}>
              {t("stats.general.premium.title")}
            </Text>
            <Text style={[styles.premiumMessage, { color: colors.textSecondary }]}>
              {t("stats.general.premium.message")}
            </Text>
            <TouchableOpacity
              style={styles.premiumButton}
              onPress={() => router.push("/settings/premium")}
            >
              <Text style={styles.premiumButtonText}>
                {t("stats.general.premium.cta")}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.ScrollView>
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
    paddingTop: 70,
  },

  topContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '90%',
    gap: 10,
  },

  cardsRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '90%',
    height: 100,
  },
  premiumStatsCard: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    marginTop: 8,
    paddingHorizontal: 22,
    paddingVertical: 24,
    width: "90%",
  },
  premiumIcon: {
    alignItems: "center",
    backgroundColor: "#FFF5D6",
    borderRadius: 20,
    height: 56,
    justifyContent: "center",
    width: 56,
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
  premiumButton: {
    alignItems: "center",
    backgroundColor: "#272727",
    borderRadius: 14,
    justifyContent: "center",
    marginTop: 4,
    minHeight: 46,
    paddingHorizontal: 22,
  },
  premiumButtonText: {
    color: "#FFFFFF",
    fontFamily: "Satoshi-Bold",
    fontSize: 16,
  },

});
