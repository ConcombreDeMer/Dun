import PopUpModal from "@/components/popUpModal";
import SecondaryButton from "@/components/secondaryButton";
import StatsBarGraph from "@/components/statsBarGraph";
import StatsCardCharge from "@/components/statsCardCharge";
import StatsCardCompletion from "@/components/statsCardCompletion";
import StatsStreak from "@/components/statsStreak";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { StyleSheet, View } from "react-native";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/ThemeContext";

interface StatsData {
  completion: string;
  charge: number;
  streak: number;
  statut: string;
}

export default function Stats() {
  const { colors } = useTheme();
  const [previousDays, setPreviousDays] = React.useState<any[]>([]);
  const [showInfoPopUp, setShowInfoPopUp] = React.useState(false);

  // FONCTION UNIQUE DE CALCUL DE TOUS LES STATS
  // Cela évite de parcourir previousDays 4 fois et élimine les calculs redondants
  const calculateAllStats = React.useCallback((days: any[]): StatsData => {
    if (!days || days.length === 0) {
      return {
        completion: "0%",
        charge: 0,
        streak: 0,
        statut: "Fantôme",
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

    // Calcul du statut en utilisant les agrégats déjà calculés
    let statut = "Fantôme";
    if (averageCharge === 0 || daysWithTasks === 0) {
      statut = "Fantôme";
    } else if (averageCharge >= 10 && averageCompletion === 100) {
      statut = "Robot";
    } else if (averageCharge >= 7 && averageCompletion >= 90) {
      statut = "Acharné";
    } else if (averageCharge >= 7 && averageCompletion < 50) {
      statut = "Ambitieux";
    } else if (averageCharge < 3 && averageCompletion < 30) {
      statut = "Procrastinateur";
    } else if (
      averageCharge >= 5 &&
      averageCharge <= 7 &&
      averageCompletion >= 80 &&
      daysWithTasks >= 7
    ) {
      statut = "Productif";
    } else if (
      averageCharge >= 5 &&
      averageCharge <= 7 &&
      averageCompletion >= 80 &&
      daysWithTasks < 7
    ) {
      //   statut = "Sur le bon chemin";
      // } else if (
      //   averageCharge >= 5 &&
      //   averageCharge < 7 &&
      //   averageCompletion >= 70 &&
      //   averageCompletion < 80
      // ) {
      statut = "Équilibré";
    } else if (
      averageCharge >= 5 &&
      averageCharge < 7 &&
      averageCompletion >= 40 &&
      averageCompletion < 70
    ) {
      statut = "En progression";
    } else if (
      averageCharge >= 3 &&
      averageCharge < 5 &&
      averageCompletion >= 70
    ) {
      statut = "Potentiel";
    } else if (
      averageCharge >= 3 &&
      averageCharge < 5 &&
      averageCompletion >= 50 &&
      averageCompletion < 70
    ) {
      statut = "En construction";
    } else if (
      averageCharge < 3 &&
      averageCompletion >= 30 &&
      averageCompletion < 60
    ) {
      statut = "Hésitant";
    } else if (
      averageCharge < 3 &&
      averageCompletion >= 60 &&
      averageCompletion < 80
    ) {
      statut = "Flâneur";
    }

    return { completion, charge: averageCharge, streak, statut };
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
  const getLastWeekDays = React.useCallback((daysData: any[]) => {
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

  // Cela évite de recalculer tous les stats à chaque rendu
  const stats = React.useMemo(() => {
    return calculateAllStats(previousDays);
  }, [previousDays, calculateAllStats]);

  // On récupère les données brutes et on les transforme directement
  React.useEffect(() => {
    if (daysQuery.data) {
      setPreviousDays(getLastWeekDays(daysQuery.data));
    }
  }, [daysQuery.data, getLastWeekDays]);


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

      <View
        style={styles.topContainer}
      >

        <StatsStreak
          value={stats.streak.toString()} />

      </View>
      <View
        style={styles.cardsContainer}
      >
        <StatsCardCompletion
          image={require('../../assets/images/stats/completion.png')}
          title="Complétion"
          value={stats.completion} />
        <StatsCardCharge
          image={require('../../assets/images/stats/charge.png')}
          title="Charge"
          value={stats.charge.toString()} />

      </View>

      <StatsBarGraph daysData={React.useMemo(() => daysQuery.data || [], [daysQuery.data])} />

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
    height: 120,
  },




});