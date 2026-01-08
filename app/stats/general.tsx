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


  // CALCUL DES STATS

  const getStats = () => {
    setCompletion(calculateCompletion());
    setCharge(calculateCharge());
    setStreak(caluclateStreak());
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
    // console.log('Average Completion:', averageCompletion);
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


  React.useEffect(() => {
    if (daysQuery.data) {
      setPreviousDays(daysQuery.data);
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
        <StatsStatut />
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