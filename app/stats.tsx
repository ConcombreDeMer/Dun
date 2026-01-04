import { useStore } from "@/store/store";
import { QueryClient, useQuery } from "@tanstack/react-query";
import * as Haptic from 'expo-haptics';
import { router } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { BarChart } from "react-native-gifted-charts";
import { supabase } from "../lib/supabase";


export default function Stats() {

  const complete = '#2b2b2bff';
  const incomplete = '#bbbbbbff';
  const queryClient = new QueryClient();
  const selectedDate = useStore((state: { selectedDate: any; }) => state.selectedDate) || new Date();
  const setSelectedDate = useStore((state: { setSelectedDate: any; }) => state.setSelectedDate);





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

  const dateFormatter = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }


  const createThisWeek = () => {
    const today = new Date();

    // Obtenir le jour de la semaine (0 = dimanche, 6 = samedi)
    const dayOfWeek = today.getDay();

    // Calculer le nombre de jours depuis lundi
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    // Créer les dates sans modifier l'originale
    const firstDayOfWeek = new Date(today);
    firstDayOfWeek.setDate(today.getDate() - daysToMonday);
    firstDayOfWeek.setHours(0, 0, 0, 0);

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(firstDayOfWeek);
      currentDay.setDate(firstDayOfWeek.getDate() + i);

      weekDays.push({
        date: currentDay,
        timestamp: currentDay.getTime(),
        isoString: currentDay.toISOString(),
        dateString: currentDay.toDateString(),
      });
    }

    // console.log('This week days:', weekDays);
    return weekDays;
  }


  const fillStackData = () => {
    const weekDays = createThisWeek();
    const stackData = weekDays.map(weekDay => {
      const dayData = daysQuery.data?.find(day => new Date(day.date).toDateString() === weekDay.dateString);
      if (dayData) {
        return {
          stacks: [
            { value: dayData.done_count, color: complete },
            { value: (dayData.total - dayData.done_count), color: incomplete, marginBottom: 2 },
          ],
          label: weekDay.date.toLocaleDateString('fr-FR', { weekday: 'short' }),
          date: dayData.date,  // ← Ajoutez ceci si vous avez besoin d'accéder à la date
        };
      } else {
        return {
          stacks: [
            { value: 0, color: complete },
            { value: 0, color: incomplete, marginBottom: 2 },
          ],
          label: weekDay.date.toLocaleDateString('fr-FR', { weekday: 'short' }),
          date: weekDay.isoString,  // ← Ou la date du weekDay
        };
      }
    });
    return stackData;
  };

  const handlePressBar = async (data: any) => {
    await Haptic.impactAsync(Haptic.ImpactFeedbackStyle.Medium);
    if (data && data.date) {
      setSelectedDate(new Date(data.date));
    }

    // vider le cache de days pour éviter les problemes de performance
    queryClient.invalidateQueries({ queryKey: ['days'] });
    

    router.push('/');

  }



  useEffect(() => {
    fillStackData()
  }, [daysQuery.data]);





  return (
    <View style={styles.container}>


      <View
        style={styles.barCharContainer}
      >
        <View>
          <BarChart
            barBorderRadius={8}
            yAxisThickness={0}
            xAxisThickness={0}
            hideAxesAndRules
            stackData={fillStackData()}
            animationDuration={500}
            isAnimated
            hideYAxisText
            xAxisLabelTextStyle={{ fontSize: 12, color: '#3d3d3dff' }}
            onPress={handlePressBar}
          />
        </View>
      </View>

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
  barCharContainer: {
    backgroundColor: '#F1F1F1',
    borderRadius: 16,
    borderColor: 'rgba(0, 0, 15, 0.2)',
    borderWidth: 0.5,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '90%',
    paddingTop: 0,
    paddingBottom: 16,
  },

});