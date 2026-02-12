import PopUpModal from "@/components/popUpModal";
import SecondaryButton from "@/components/secondaryButton";
import StatsBarGraph from "@/components/statsBarGraph";
import StatsCard from "@/components/statsCard";
import StatsCardCharge from "@/components/statsCardCharge";
import StatsCardCompletion from "@/components/statsCardCompletion";
import StatsStreak from "@/components/statsStreak";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { Extrapolate, interpolate, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useFont } from "../../lib/FontContext";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/ThemeContext";

interface StatsData {
  completion: string;
  charge: number;
  streak: number;
}

type Slide = {
  bars: Array<{
    stacks: Array<{ value: number; color: string; marginBottom?: number }>;
    label: string;
    date: string;
  }>;
  periodLabel: string;
  id: string;
};

export default function Stats() {
  const { colors } = useTheme();
  const [previousDays, setPreviousDays] = useState<any[]>([]);
  const [showInfoPopUp, setShowInfoPopUp] = useState(false);
  const [period, setPeriod] = useState<'Par semaine' | 'Par mois' | 'Par année' | 'Global'>('Par semaine');
  const [showPeriodSelector, setShowPeriodSelector] = useState(false);
  const [totalDone, setTotalDone] = useState(0);
  const [perfectDays, setPerfectDays] = useState(0);
  const [completion, setCompletion] = useState("0%");
  const [charge, setCharge] = useState(0);
  const [currentSlide, setCurrentSlide] = useState<Slide | null>(null);
  const periodSelectorHeight = useSharedValue(0);
  const periodSelectorOpacity = useSharedValue(0);
  const chevronRotation = useSharedValue(0);
  const [loadingState, setLoadingState] = useState(true);
  const { fontSizes } = useFont();



  // Fonction unique qui fait le filtrage une seule fois et retourne tous les stats
  const calculatePeriodStats = useCallback((daysData: any[], selectedPeriod: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let startDate: Date | null = null;

    switch (selectedPeriod) {
      case 'Par semaine':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        break;
      case 'Par mois':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 30);
        break;
      case 'Par année':
        startDate = new Date(today);
        startDate.setFullYear(today.getFullYear() - 1);
        break;
      case 'Global':
      default:
        startDate = null;
    }

    // Trouver le premier jour de données
    let firstDayDate: Date | null = null;
    if (daysData.length > 0) {
      firstDayDate = new Date(daysData[daysData.length - 1].date);
      firstDayDate.setHours(0, 0, 0, 0);
    }

    // Si la startDate remonte plus loin que le premier jour de données, utiliser le premier jour
    if (startDate && firstDayDate && startDate < firstDayDate) {
      startDate = new Date(firstDayDate);
    }

    // Un seul parcours pour calculer tous les stats
    let totalDoneCount = 0;
    let perfectDaysCount = 0;
    let totalCharge = 0;
    let totalCompletion = 0;
    let daysWithTasks = 0;
    let daysCount = 0;

    for (const day of daysData) {
      const dayDate = new Date(day.date);
      dayDate.setHours(0, 0, 0, 0);

      // Filtrer si nécessaire
      if (startDate && dayDate < startDate) {
        continue;
      }

      // Calculer tous les stats en un seul parcours
      totalDoneCount += day.done_count || 0;
      if (day.done_count === day.total && day.total > 0) {
        perfectDaysCount++;
      }

      totalCharge += day.total || 0;
      if (day.total > 0) {
        totalCompletion += (day.done_count / day.total) * 100;
        daysWithTasks++;
      }
      daysCount++;
    }

    // Calculer le nombre total de jours dans la période pour la charge moyenne
    let totalDaysInPeriod = daysCount;
    if (selectedPeriod === 'Global' && firstDayDate) {
      // Pour "Global", calculer depuis le premier jour de données
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 1);
      totalDaysInPeriod = Math.ceil((endDate.getTime() - firstDayDate.getTime()) / (1000 * 60 * 60 * 24));
    } else if (startDate && firstDayDate) {
      // Pour les autres périodes, calculer depuis startDate
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 1);
      totalDaysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    const averageCharge = totalDaysInPeriod > 0 ? Math.round((totalCharge / totalDaysInPeriod) * 10) / 10 : 0;
    const averageCompletion = daysWithTasks > 0 ? Math.round(totalCompletion / daysWithTasks) : 0;
    const completionString = `${averageCompletion}%`;

    return { totalDoneCount, perfectDaysCount, completion: completionString, charge: averageCharge };
  }, []);




  // Fonction pour calculer les stats basées sur un slide
  const calculateStatsFromSlide = useCallback((slide: Slide) => {
    if (!slide || !slide.bars) {
      return { totalDoneCount: 0, perfectDaysCount: 0, completion: "0%", charge: 0 };
    }

    let totalDoneCount = 0;
    let perfectDaysCount = 0;
    let totalCharge = 0;
    let daysInSlide = 0;

    slide.bars.forEach((bar) => {
      const done = bar.stacks[0]?.value || 0;
      const incomplete = bar.stacks[1]?.value || 0;
      const total = done + incomplete;

      totalDoneCount += done;
      totalCharge += total;

      if (total > 0 && done === total) {
        perfectDaysCount++;
      }

      daysInSlide++;
    });

    const averageCharge = daysInSlide > 0 ? Math.round((totalCharge / daysInSlide) * 10) / 10 : 0;
    const averageCompletion = totalCharge > 0 ? Math.round((totalDoneCount / totalCharge) * 100) : 0;
    const completionString = `${averageCompletion}%`;

    return { totalDoneCount, perfectDaysCount, completion: completionString, charge: averageCharge };
  }, []);

  // Gestionnaire pour les changements de slide
  const handleSlideChange = useCallback((slide: Slide) => {
    // Ne mettre à jour les stats que si ce n'est pas "Global"
    if (period === 'Global') return;

    setCurrentSlide(slide);
    const stats = calculateStatsFromSlide(slide);
    setTotalDone(stats.totalDoneCount);
    setPerfectDays(stats.perfectDaysCount);
    setCompletion(stats.completion);
    setCharge(stats.charge);
    setLoadingState(false);
  }, [calculateStatsFromSlide, period]);


  // Cela évite de parcourir previousDays 4 fois et élimine les calculs redondants
  const calculateAllStats = useCallback((days: any[]): StatsData => {
    if (!days || days.length === 0) {
      return {
        completion: "0%",
        charge: 0,
        streak: 0,
      };
    }

    // Passer 1 : Calculer les agrégats nécessaires pour tous les stats
    let totalCharge = 0;
    let totalCompletion = 0;
    let daysWithTasks = 0;
    let daysCount = 0;

    for (let i = 0; i < Math.min(7, days.length); i++) {
      const day = days[i];
      totalCharge += day.total || 0;

      if (day.total > 0) {
        totalCompletion += (day.done_count / day.total) * 100;
        daysWithTasks++;
      }
      daysCount++;
    }

    // Dériver tous les stat à partir de ces agrégats
    const averageCharge =
      daysCount > 0 ? Math.round((totalCharge / daysCount) * 10) / 10 : 0;
    const averageCompletion =
      daysWithTasks > 0 ? Math.round(totalCompletion / daysWithTasks) : 0;
    const completion = `${averageCompletion}%`;

    // Calcul du streak
    const today = new Date();
    const todayString = today.toDateString();
    let streak = 0;
    let currentDate = new Date();
    currentDate.setDate(currentDate.getDate() - 1);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    // Limiter la boucle aux 7 derniers jours et éviter recréation de Date
    for (let i = 0; i < Math.min(7, days.length); i++) {
      const day = days[i];
      const dayDate = new Date(day.date);
      const dayDateString = dayDate.toDateString();

      if (dayDateString === todayString) {
        continue;
      } else if (dayDateString === currentDate.toDateString()) {
        if (day.total > 0 && day.done_count === day.total) {
          streak++;
          currentDate.setDate(currentDate.getDate() - 1);
        }
      } else {
        break;
      }
    }
    return { completion, charge: averageCharge, streak };
  }, []);


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
  const getLastWeekDays = useCallback((daysData: any[]) => {
    const lastWeekDays = [];
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const todayString = today.toDateString();

    // Créer une Map pour O(1) lookup au lieu de O(n)
    const daysByDateString = new Map();
    for (const day of daysData) {
      const dayDate = new Date(day.date);
      daysByDateString.set(dayDate.toDateString(), day);
    }

    for (let i = 0; i < 7; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() - i);
      const targetDateString = targetDate.toDateString();

      const dayData = daysByDateString.get(targetDateString);
      if (dayData) {
        lastWeekDays.push(dayData);
      } else {
        lastWeekDays.push({
          date: targetDate.toISOString(),
          total: 0,
          done_count: 0,
        });
      }
    }
    return lastWeekDays;
  }, []);

  // Cela évite de recalculer le streak à chaque rendu
  const streak = useMemo(() => {
    return calculateAllStats(previousDays).streak;
  }, [previousDays, calculateAllStats]);

  // On récupère les données brutes et on les transforme directement
  useEffect(() => {
    if (daysQuery.data) {
      setPreviousDays(getLastWeekDays(daysQuery.data));
    }
  }, [daysQuery.data, getLastWeekDays]);

  useEffect(() => {
    if (daysQuery.data) {
      if (period != 'Global') {
        return;
      }
      const { totalDoneCount, perfectDaysCount, completion: newCompletion, charge: newCharge } = calculatePeriodStats(daysQuery.data, period);
      setTotalDone(totalDoneCount);
      setPerfectDays(perfectDaysCount);
      setCompletion(newCompletion);
      setCharge(newCharge);
      // Réinitialiser le slide actuel quand la période change
      setCurrentSlide(null);
      setLoadingState(false);
    }
  }, [period, daysQuery.data, calculatePeriodStats]);



  useEffect(() => {
    periodSelectorHeight.value = withSpring(showPeriodSelector ? 170 : 0);
    periodSelectorOpacity.value = withSpring(showPeriodSelector ? 1 : 0);
    chevronRotation.value = withSpring(showPeriodSelector ? 0 : 180);
  }, [showPeriodSelector, periodSelectorHeight, periodSelectorOpacity, chevronRotation]);

  const animatedPeriodSelectorStyle = useAnimatedStyle(() => ({
    height: periodSelectorHeight.value,
    opacity: periodSelectorOpacity.value,
    paddingVertical: interpolate(
      periodSelectorHeight.value,
      [0, 110],
      [0, 10],
      Extrapolate.CLAMP
    ),
  }));

  const animatedChevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value}deg` }],
  }));

  const openPeriodSelector = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowPeriodSelector(prev => !prev);
  }, []);

  const periodOptions: Array<'Par semaine' | 'Par mois' | 'Par année' | 'Global'> = ['Par semaine', 'Par mois', 'Par année', 'Global'];

  const getDisplayedPeriod = (period: string) => {
    return period;
  };

  const handlePeriodSelect = async (selectedPeriod: 'Par semaine' | 'Par mois' | 'Par année' | 'Global') => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPeriod(selectedPeriod);
    setShowPeriodSelector(false);
    console.log('Période sélectionnée :', selectedPeriod);
    setLoadingState(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={{ position: 'absolute', top: 70, right: 20, zIndex: 10 }}
      >
        <SecondaryButton
          image='info'
          onPress={showInfoPopUp ? () => setShowInfoPopUp(false) : () => setShowInfoPopUp(true)}
        />
      </View>

      <PopUpModal
        isVisible={showInfoPopUp}
        title="À propos des stats"
        message="L'onglet statistique est en cours de développement et sera aggrémenté de nouvelles fonctionnalités au fil du temps."
        onCancel={() => setShowInfoPopUp(false)}
        confirmText="Compris"
        onConfirm={() => setShowInfoPopUp(false)}
        withNavbar={true}
        symbolName="info.circle"
      />

      {/* Scrollable content */}
      <Animated.ScrollView
        style={{ width: '100%' }}
        contentContainerStyle={{ alignItems: 'center', paddingBottom: 40, display: 'flex', gap: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topContainer}>
          <StatsStreak value={streak.toString()} />
        </View>


        <View
          style={{
            width: '50%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <Pressable
            onPress={openPeriodSelector}
            style={{
              width: '80%',
              minHeight: 40,
              paddingHorizontal: 20,
              paddingVertical: 10,
              backgroundColor: colors.taskDone,
              borderRadius: 30,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
              }}
            >
              <Text
                style={{
                  color: colors.buttonText,
                  opacity: 0.7,
                  fontFamily: 'Satoshi-Medium',
                  fontSize: fontSizes.sm,
                }}
              >
                {getDisplayedPeriod(period)}
              </Text>
              <Animated.View
                style={[animatedChevronStyle, { opacity: 0.7 }]}
              >
                <SymbolView
                  name="chevron.up"
                  tintColor={colors.buttonText}
                  size={20}
                />
              </Animated.View>

            </View>
          </Pressable>
          <Animated.View
            style={[
              {
                width: '100%',
                backgroundColor: colors.taskDone,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 5,
                overflow: 'hidden',
                paddingHorizontal: 10,
                borderRadius: 20,
              },
              animatedPeriodSelectorStyle,
            ]}
          >
            {periodOptions.map((option) => (
              <Pressable
                key={option}
                onPress={() => {
                  if (option !== period) {
                    handlePeriodSelect(option);
                  }
                }}
                style={{
                  width: '100%',
                  paddingVertical: 8,
                  paddingHorizontal: 10,
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 8,
                  pointerEvents: option === period ? 'none' : 'auto',
                }}
              >
                <Text style={{
                  color: colors.buttonText,
                  fontFamily: 'Satoshi-Medium',
                  opacity: option === period ? 1 : 0.5,
                  fontSize: fontSizes.sm,
                }}>
                  {getDisplayedPeriod(option)}
                </Text>
                {option === period && (
                  <SymbolView
                    name="checkmark"
                    tintColor={colors.buttonText}
                    size={16}
                  />
                )}
              </Pressable>
            ))}
          </Animated.View>

        </View>


        <View style={styles.cardsContainer}>
          <StatsCard
            image={require('../../assets/images/stats/done.png')}
            title="Tâches faites"
            value={totalDone.toString()}
            loading={loadingState}
          />
          <StatsCard
            image={require('../../assets/images/stats/perfect.png')}
            title="Jours parfaits"
            value={perfectDays.toString()}
            loading={loadingState}
          />
        </View>
        <View style={styles.cardsContainer}>
          <StatsCardCompletion
            image={require('../../assets/images/stats/completion.png')}
            title="Complétion"
            value={completion}
            loading={loadingState}
          />
          <StatsCardCharge
            image={require('../../assets/images/stats/charge.png')}
            title="Charge"
            value={charge.toString()}
            loading={loadingState}
          />
        </View>

        <StatsBarGraph daysData={useMemo(() => daysQuery.data || [], [daysQuery.data])} period={period} onSlideChange={handleSlideChange} />
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    display: 'flex',
    gap: 20,
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

  cardsContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '90%',
    height: 100,
  },




});