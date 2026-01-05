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
  const getDays = async () => {
    const { data, error } = await supabase
      .from("Days")
      .select("*")
      .order("date", { ascending: true });
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
      getPreviousDays(daysQuery.data);
    }
  }, [daysQuery.data]);


  const getPreviousDays = (daysData: any[]) => {
    if (!daysData || daysData.length === 0) return 0;

    const today = new Date();

    // récupérer dans daysData les jours précédents aujourd'hui
    const pastDays = daysData.filter(day => {
      const dayDate = new Date(day.date);
      return dayDate < today;
    });


    // trier les jours par date décroissante
    pastDays.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setPreviousDays(pastDays);
  }


  return (
    <View style={styles.container}>



      <View
        style={styles.topContainer}
      >

        <StatsStatut />
        <StatsStreak
          daysData={previousDays} />

      </View><StatsBarGraph daysData={daysQuery.data || []} /><View
        style={styles.cardsContainer}
      >

        <StatsCardCompletion
          image={require('../../assets/images/stats/completion.png')}
          title="Complétion"
          daysData={previousDays} />
        <StatsCardCharge
          image={require('../../assets/images/stats/charge.png')}
          title="Charge"
          daysData={previousDays} />

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