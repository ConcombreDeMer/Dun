import StatsBarGraph from "@/components/statsBarGraph";
import StatsCardCharge from "@/components/statsCardCharge";
import StatsCardCompletion from "@/components/statsCardCompletion";
import StatsStatut from "@/components/statsStatut";
import StatsStreak from "@/components/statsStreak";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { StyleSheet, View } from "react-native";
import { supabase } from "../../lib/supabase";

export default function Stats() {

  const [previousDays, setPreviousDays] = React.useState<any[]>([]);
  const [completion, setCompletion] = React.useState<string>("0%");
  const [charge, setCharge] = React.useState<number>(0);
  const [streak, setStreak] = React.useState<number>(0);
  const [statut, setStatut] = React.useState<string>("Fantôme");


  // CALCUL DES STATS

  const getStats = () => {
    setCompletion(calculateCompletion());
    setCharge(calculateCharge());
    setStreak(caluclateStreak());
    setStatut(calculateStatut());
  }

  // CALCUL DE LA COMPLETION

  const calculateCompletion = () => {
    if (!previousDays || previousDays.length === 0) return "0%";
    // Faire une moyenne de la complétion des 7 derniers jours
    let totalCompletion = 0;
    let count = 0;
    for (let i = 0; i < Math.min(7, previousDays.length); i++) {
      const day = previousDays[i];
      if (day.total > 0) {
        totalCompletion += (day.done_count / day.total) * 100;
        count++;
      }
    }
    const averageCompletion = Math.round(totalCompletion / count)
    return `${averageCompletion}%`;
  }


  // CALCUL DE LA CHARGE

  const calculateCharge = () => {
    // Faire une moyenne de la charge des 7 derniers jours
    let totalCharge = 0;
    let count = 0;
    for (let i = 0; i < Math.min(7, previousDays.length); i++) {
      totalCharge += previousDays[i].total || 0;
      count++;
    }
    const averageCharge = Math.round((totalCharge / count) * 10) / 10;
    return averageCharge;
  }


  // CALCUL DU STREAK

  const caluclateStreak = () => {
    const today = new Date();
    let streak = 0;
    let currentDate = new Date();
    currentDate.setDate(currentDate.getDate() - 1);  // commencer par hier
    for (let day of previousDays || []) {
      const dayDate = new Date(day.date);
      if (dayDate.toDateString() === today.toDateString()) {
        continue; // sauter aujourd'hui
      }
      else if (dayDate.toDateString() === currentDate.toDateString()) {
        if (day.total > 0 && day.done_count == day.total) {
          streak++;
          currentDate.setDate(currentDate.getDate() - 1); // passer au jour précédent
        }
      } else {
        break; // la chaîne est rompue
      }
    }
    if (streak === 0) return 0;
    return streak; // ne pas compter aujourd'hui
  }


  // CALCUL DU STATUT

  const calculateStatut = () => {
    if (!previousDays || previousDays.length === 0) {
      return "Fantôme";
    }
    // Calculer la charge moyenne et complétion moyenne des 7 derniers jours
    let totalCharge = 0;
    let totalCompletion = 0;
    let daysWithTasks = 0;
    let daysCount = 0;
    for (let i = 0; i < Math.min(7, previousDays.length); i++) {
      const day = previousDays[i];
      totalCharge += day.total || 0;

      if (day.total > 0) {
        totalCompletion += (day.done_count / day.total) * 100;
        daysWithTasks++;
      }
      daysCount++;
    }
    const averageCharge = Math.round((totalCharge / daysCount) * 10) / 10;
    const averageCompletion = daysWithTasks > 0
      ? Math.round(totalCompletion / daysWithTasks)
      : 0;
    // Vérifier si utilisateur est fantôme (aucune activité)
    if (averageCharge === 0 || daysWithTasks === 0) {
      return "Fantôme";
    }
    // Vérifier si Robot (charge très élevée + complétion parfaite)
    if (averageCharge >= 10 && averageCompletion === 100) {
      return "Robot";
    }
    // Vérifier si Acharné (charge élevée + très bonne complétion)
    if (averageCharge >= 7 && averageCompletion >= 90) {
      return "Acharné";
    }
    // Vérifier si Ambitieux (charge élevée + mauvaise complétion)
    if (averageCharge >= 7 && averageCompletion < 50) {
      return "Ambitieux";
    }
    // Vérifier si Procrastinateur (charge très faible + complétion très faible)
    if (averageCharge < 3 && averageCompletion < 30) {
      return "Procrastinateur";
    }
    // Vérifier si Productif (charge bonne + excellente complétion + longue période)
    if (averageCharge >= 5 && averageCharge <= 7 && averageCompletion >= 80 && daysWithTasks >= 7) {
      return "Productif";
    }
    // Vérifier si Sur le bon chemin (charge bonne + excellente complétion + courte période)
    if (averageCharge >= 5 && averageCharge <= 7 && averageCompletion >= 80 && daysWithTasks < 7) {
      return "Sur le bon chemin";
    }
    // Vérifier si Équilibré (charge acceptable + bonne complétion)
    if (averageCharge >= 5 && averageCharge < 7 && averageCompletion >= 70 && averageCompletion < 80) {
      return "Équilibré";
    }
    // Vérifier si En progression (charge acceptable + complétion moyenne)
    if (averageCharge >= 5 && averageCharge < 7 && averageCompletion >= 40 && averageCompletion < 70) {
      return "En progression";
    }
    // Vérifier si Potentiel (charge faible/moyenne + bonne complétion)
    if (averageCharge >= 3 && averageCharge < 5 && averageCompletion >= 70) {
      return "Potentiel";
    }
    // Vérifier si En construction (charge faible/moyenne + complétion moyenne)
    if (averageCharge >= 3 && averageCharge < 5 && averageCompletion >= 50 && averageCompletion < 70) {
      return "En construction";
    }
    // Vérifier si Hésitant (charge très faible + complétion faible)
    if (averageCharge < 3 && averageCompletion >= 30 && averageCompletion < 60) {
      return "Hésitant";
    }
    // Vérifier si Flâneur (charge très faible + complétion acceptable)
    if (averageCharge < 3 && averageCompletion >= 60 && averageCompletion < 80) {
      return "Flâneur";
    }
    // Par défaut pour les cas résiduels
    return "Procrastinateur";
  }


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
  }

  const daysQuery = useQuery({
    queryKey: ['days'],
    queryFn: getDays,
  });

  const getLastWeekDays = (daysData: any[]) => {
    const lastWeekDays = [];
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    for (let i = 0; i < 7; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() - i);
      const dayData = daysData.find(day => {
        const dayDate = new Date(day.date);
        return dayDate.toDateString() === targetDate.toDateString();
      });
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
  }


  React.useEffect(() => {
    if (daysQuery.data) {
      setPreviousDays(getLastWeekDays(daysQuery.data));
    }
  }, [daysQuery.data]);

  React.useEffect(() => {
    if (previousDays.length > 0) {
      ``
      getStats();
    }
  }, [previousDays]);


  return (
    <View style={styles.container}>
      <View
        style={styles.topContainer}
      >
        <StatsStatut
          value={statut}
        />
        <StatsStreak
          value={streak.toString()} />

      </View><StatsBarGraph daysData={daysQuery.data || []} /><View
        style={styles.cardsContainer}
      >
        <StatsCardCompletion
          image={require('../../assets/images/stats/completion.png')}
          title="Complétion"
          value={completion.toString()} />
        <StatsCardCharge
          image={require('../../assets/images/stats/charge.png')}
          title="Charge"
          value={charge.toString()} />

      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 70,
    display: 'flex',
    gap: 20,
    justifyContent: 'flex-start',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'white',
    width: '100%',
    height: '100%',
  },

  topContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '90%',
    height: 120,
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