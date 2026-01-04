import StatsBarGraph from "@/components/statsBarGraph";
import { useQuery } from "@tanstack/react-query";
import { StyleSheet, View } from "react-native";
import { supabase } from "../lib/supabase";


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
      <StatsBarGraph daysData={daysQuery.data || []} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'white',
    width: '100%',
  },
});