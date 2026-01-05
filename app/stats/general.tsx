import StatsBarGraph from "@/components/statsBarGraph";
import StatsCard from "@/components/statsCard";
import StatsStatut from "@/components/statsStatut";
import StatsStreak from "@/components/statsStreak";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { StyleSheet, View } from "react-native";
import { supabase } from "../../lib/supabase";


export default function Stats() {

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


  return (
    <View style={styles.container}>



      <View
        style={styles.topContainer}
      >

        <StatsStatut />
        <StatsStreak
          daysData={daysQuery.data || []} />

      </View><StatsBarGraph daysData={daysQuery.data || []} /><View
        style={styles.cardsContainer}
      >

        <StatsCard
          image={require('../../assets/images/stats/completion.png')}
          title="Complétion"
          value="85%" />
        <StatsCard
          image={require('../../assets/images/stats/charge.png')}
          title="Charge"
          value="Faible" />

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