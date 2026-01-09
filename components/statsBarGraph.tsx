import { useStore } from "@/store/store";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptic from 'expo-haptics';
import { router } from "expo-router";
import { useCallback, useMemo, useRef } from "react";
import { FlatList, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { BarChart } from "react-native-gifted-charts";

interface StatsBarGraphProps {
  daysData: any[];
}

type Week = {
  days: { date: Date; timestamp: number; isoString: string; dateString: string; }[];
  firstDayOfWeek: string;
  lastDayOfWeek: string;
  offset: number;
  id: string;
};

type Day = {
  date: string;
  done_count: number;
  total: number;
};

export default function StatsBarGraph({ daysData }: StatsBarGraphProps) {
  const { width: screenWidth } = useWindowDimensions();
  const itemWidth = screenWidth * 0.9; // 90% of screen width
  const barWidth = (itemWidth * 0.5) / 7; // 85% of itemWidth divided by 7 days

  const complete = '#2b2b2bff';
  const incomplete = '#bbbbbbff';
  const completeToday = '#3f8041ff';
  const incompleteToday = '#a5d6a7ff';
  const queryClient = useQueryClient();
  const setSelectedDate = useStore((state: { setSelectedDate: any; }) => state.setSelectedDate);
  const flatListRef = useRef<FlatList>(null);


  const getFormattedLabel = (date: Date) => {
    const dayOfWeek = date.toLocaleDateString('fr-FR', { weekday: 'narrow' });
    const dayOfMonth = date.getDate();
    return `${dayOfWeek}. ${dayOfMonth}`;
  }

  const getFormattedWeekLabel = (date: Date) => {
    const day = date.getDate();
    const month = date.toLocaleDateString('fr-FR', { month: 'short' });
    return `${day} ${month}`;
  }

  const createWeekByOffset = (weekOffset: number): { date: Date; timestamp: number; isoString: string; dateString: string; }[] => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const firstDayOfWeek = new Date(today);
    firstDayOfWeek.setDate(today.getDate() - daysToMonday + weekOffset * 7);
    firstDayOfWeek.setHours(0, 0, 0, 0);

    const weekDays: { date: Date; timestamp: number; isoString: string; dateString: string; }[] = [];
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

  const generateWeeks = (): Week[] => {
    const weeks: Week[] = [];
    for (let i = -2; i <= 2; i++) {
      const days = createWeekByOffset(i);
      const firstDay = days[0];
      const lastDay = days[6];

      weeks.push({
        id: i.toString(),
        offset: i,
        days: days,
        firstDayOfWeek: getFormattedWeekLabel(firstDay.date),
        lastDayOfWeek: getFormattedWeekLabel(lastDay.date),
      });
    }
    return weeks;
  };

  const weeks = useMemo(() => generateWeeks(), []);

  // Créer une Map des données indexées par date pour des recherches O(1)
  const daysDataMap = useMemo(() => {
    const map = new Map<string, Day>();
    daysData?.forEach(day => {
      map.set(new Date(day.date).toDateString(), day);
    });
    return map;
  }, [daysData]);

  const getTodayString = useCallback(() => new Date().toDateString(), []);

  const fillStackData = useCallback((weekDays: { date: Date; timestamp: number; isoString: string; dateString: string; }[]) => {
    const todayString = getTodayString();
    const stackData = weekDays.map(weekDay => {
      const isToday = weekDay.date.toDateString() === todayString;
      const dayData = daysDataMap.get(weekDay.dateString);
      
      if (dayData) {
        return {
          stacks: [
            { value: dayData.done_count, color: isToday ? completeToday : complete },
            { value: (dayData.total - dayData.done_count), color: isToday ? incompleteToday : incomplete, marginBottom: 2 },
          ],
          label: getFormattedLabel(weekDay.date),
          date: dayData.date,
        };
      } else {
        return {
          stacks: [
            { value: 0, color: isToday ? completeToday : complete },
            { value: 0, color: isToday ? incompleteToday : incomplete, marginBottom: 2 },
          ],
          label: getFormattedLabel(weekDay.date),
          date: weekDay.isoString,
        };
      }
    });
    return stackData;
  }, [daysDataMap, getTodayString, completeToday, complete, incompleteToday, incomplete]);

  const handlePressBar = async (data: any) => {
    await Haptic.impactAsync(Haptic.ImpactFeedbackStyle.Medium);
    if (data && data.date) {
      setSelectedDate(new Date(data.date));
    }

    queryClient.invalidateQueries({ queryKey: ['days'] });

    router.replace('/');
  };

  const renderWeekChart = ({ item }: { item: Week }) => {
    return (
      <View style={[styles.weekContainer, { width: itemWidth }]}>
        <Text
          style={{ fontSize: 16, fontWeight: '300', color: '#525252ff', paddingVertical: 8 }}
        >
          Semaine du {item.firstDayOfWeek} au {item.lastDayOfWeek}
        </Text>
        <BarChart
          barBorderRadius={8}
          barWidth={barWidth}
          yAxisThickness={0}
          xAxisThickness={0}
          hideAxesAndRules
          stackData={fillStackData(item.days)}
          animationDuration={500}
          isAnimated
          hideYAxisText
          xAxisLabelTextStyle={{ fontSize: 12, color: '#3d3d3dff' }}
          onPress={handlePressBar}
          disableScroll
        />
      </View>
    );
  };

  return (
    <View style={styles.barCharContainer}>
      <FlatList
        ref={flatListRef}
        data={weeks}
        renderItem={renderWeekChart}
        keyExtractor={item => item.id}
        horizontal
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        snapToInterval={itemWidth}
        decelerationRate="fast"
        bounces
        initialScrollIndex={2}
        getItemLayout={(data, index) => ({
          length: itemWidth,
          offset: itemWidth * index,
          index,
        })}
        onScrollToIndexFailed={() => { }}

      />
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
    overflow: 'hidden',
  },
  weekContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
