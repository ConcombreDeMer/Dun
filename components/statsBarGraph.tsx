import { useStore } from "@/store/store";
import { QueryClient } from "@tanstack/react-query";
import * as Haptic from 'expo-haptics';
import { router } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { BarChart } from "react-native-gifted-charts";

interface StatsBarGraphProps {
  daysData: any[];
}

export default function StatsBarGraph({ daysData }: StatsBarGraphProps) {
  const complete = '#2b2b2bff';
  const incomplete = '#bbbbbbff';
  const queryClient = new QueryClient();
  const setSelectedDate = useStore((state: { setSelectedDate: any; }) => state.setSelectedDate);

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

    return weekDays;
  };

  const fillStackData = () => {
    const weekDays = createThisWeek();
    const stackData = weekDays.map(weekDay => {
      const dayData = daysData?.find(day => new Date(day.date).toDateString() === weekDay.dateString);
      if (dayData) {
        return {
          stacks: [
            { value: dayData.done_count, color: complete },
            { value: (dayData.total - dayData.done_count), color: incomplete, marginBottom: 2 },
          ],
          label: weekDay.date.toLocaleDateString('fr-FR', { weekday: 'short' }),
          date: dayData.date,
        };
      } else {
        return {
          stacks: [
            { value: 0, color: complete },
            { value: 0, color: incomplete, marginBottom: 2 },
          ],
          label: weekDay.date.toLocaleDateString('fr-FR', { weekday: 'short' }),
          date: weekDay.isoString,
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
  };

  useEffect(() => {
    fillStackData();
  }, [daysData]);

  return (
    <View style={styles.barCharContainer}>
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
  );
}

const styles = StyleSheet.create({
  barCharContainer: {
    backgroundColor: '#F1F1F1',
    borderRadius: 30,
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
