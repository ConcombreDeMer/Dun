import { useFont } from "@/lib/FontContext";
import { useTheme } from "@/lib/ThemeContext";
import { useStore } from "@/store/store";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptic from 'expo-haptics';
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { BarChart } from "react-native-gifted-charts";

interface StatsBarGraphProps {
  daysData: any[];
  period: 'Par semaine' | 'Par mois' | 'Par année' | 'Global';
  onSlideChange?: (slide: Slide) => void;
}

type Week = {
  days: { date: Date; timestamp: number; isoString: string; dateString: string; }[];
  firstDayOfWeek: string;
  lastDayOfWeek: string;
  offset: number;
  id: string;
};

type BarData = {
  stacks: Array<{ value: number; color: string; marginBottom?: number }>;
  label: string;
  date: string;
};

type Slide = {
  bars: BarData[];
  periodLabel: string;
  id: string;
};

type Day = {
  date: string;
  done_count: number;
  total: number;
};

// Fonction pour obtenir le début de la semaine (lundi)
const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  d.setDate(d.getDate() - daysToMonday);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Fonction pour regrouper les jours par semaine
const groupDaysByWeek = (days: any[]): Map<string, any[]> => {
  const map = new Map<string, any[]>();
  days.forEach(day => {
    const date = new Date(day.date);
    const weekStart = getWeekStart(date);
    const weekKey = weekStart.toISOString().split('T')[0];
    if (!map.has(weekKey)) map.set(weekKey, []);
    map.get(weekKey)!.push(day);
  });
  return map;
};

// Fonction pour regrouper les jours par mois
const groupDaysByMonth = (days: any[]): Map<string, any[]> => {
  const map = new Map<string, any[]>();
  days.forEach(day => {
    const date = new Date(day.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!map.has(monthKey)) map.set(monthKey, []);
    map.get(monthKey)!.push(day);
  });
  return map;
};

// Fonction pour créer une barre à partir d'un groupe de jours
const createBarFromDays = (days: any[], label: string, isToday: boolean, colors: any): BarData => {
  const totalDone = days.reduce((sum, d) => sum + (d.done_count || 0), 0);
  const totalTasks = days.reduce((sum, d) => sum + (d.total || 0), 0);
  const remaining = Math.max(0, totalTasks - totalDone);

  const complete = colors.text;
  const incomplete = colors.textSecondary;
  const completeToday = '#3f8041ff';
  const incompleteToday = '#a5d6a7ff';

  return {
    stacks: [
      { value: totalDone, color: isToday ? completeToday : complete },
      { value: remaining, color: isToday ? incompleteToday : incomplete, marginBottom: 2 },
    ],
    label,
    date: days[0].date,
  };
};

// Fonction principale pour transformer les données selon la période
const transformDaysDataByPeriod = (daysData: any[], period: 'Par semaine' | 'Par mois' | 'Par année' | 'Global', colors: any): Slide[] => {
  if (!daysData || daysData.length === 0) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayString = today.toDateString();

  // Créer une map pour O(1) lookup
  const daysDataMap = new Map<string, any>();
  daysData.forEach(day => {
    daysDataMap.set(new Date(day.date).toDateString(), day);
  });

  if (period === 'Par semaine') {
    // Logique actuelle : 5 semaines (dernière slide = semaine actuelle)
    const slides: Slide[] = [];
    const complete = colors.text;
    const incomplete = colors.textSecondary;
    const completeToday = '#3f8041ff';
    const incompleteToday = '#a5d6a7ff';

    for (let i = -4; i <= 0; i++) {
      const baseDay = new Date(today);
      const dayOfWeek = baseDay.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - daysToMonday + (i * 7));
      weekStart.setHours(0, 0, 0, 0);

      const bars: BarData[] = [];
      for (let j = 0; j < 7; j++) {
        const currentDay = new Date(weekStart);
        currentDay.setDate(weekStart.getDate() + j);
        const dayString = currentDay.toDateString();
        const isToday = dayString === todayString;
        const dayData = daysDataMap.get(dayString);

        const dayFormatted = currentDay.toLocaleDateString('fr-FR', { weekday: 'narrow', day: 'numeric' });

        bars.push({
          stacks: [
            { value: dayData?.done_count || 0, color: isToday ? completeToday : complete },
            { value: (dayData?.total || 0) - (dayData?.done_count || 0), color: isToday ? incompleteToday : incomplete, marginBottom: 2 },
          ],
          label: dayFormatted,
          date: dayData?.date || currentDay.toISOString(),
        });
      }

      const firstDay = new Date(weekStart);
      const lastDay = new Date(weekStart);
      lastDay.setDate(weekStart.getDate() + 6);

      const firstDayStr = firstDay.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
      const lastDayStr = lastDay.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

      slides.push({
        id: `week-${i}`,
        bars,
        periodLabel: `Semaine du ${firstDayStr} au ${lastDayStr}`,
      });
    }
    return slides;
  } else if (period === 'Par mois') {
    // Afficher les 12 derniers mois, chacun en une slide
    const slides: Slide[] = [];

    let startDate = new Date(today);
    startDate.setFullYear(today.getFullYear() - 1);

    // Pour "Par mois", afficher depuis 12 mois en arrière
    let currentMonthDate = new Date(startDate);
    
    while (currentMonthDate <= today) {
      const monthStart = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), 1);
      const monthEnd = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 0);

      // Grouper par semaine calendaire pour ce mois
      const weeks: Map<string, any[]> = new Map();
      let currentDate = new Date(monthStart);
      
      while (currentDate <= monthEnd) {
        const weekStart = getWeekStart(currentDate);
        const weekKey = weekStart.toISOString().split('T')[0];
        
        if (!weeks.has(weekKey)) {
          weeks.set(weekKey, []);
        }
        
        // Ajouter le jour de ce mois
        const dayString = currentDate.toDateString();
        const dayData = daysDataMap.get(dayString);
        if (dayData) {
          weeks.get(weekKey)!.push(dayData);
        } else {
          weeks.get(weekKey)!.push({
            date: currentDate.toISOString(),
            done_count: 0,
            total: 0,
          });
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const bars: BarData[] = [];
      weeks.forEach((weekDays, weekKey) => {
        // Calculer si cette semaine inclut aujourd'hui
        const isToday = weekDays.some(d => new Date(d.date).toDateString() === todayString);
        
        // Extraire le premier et dernier jour de la semaine
        const firstDate = new Date(weekDays[0].date);
        const lastDate = new Date(weekDays[weekDays.length - 1].date);
        const firstDay = firstDate.getDate();
        const lastDay = lastDate.getDate();
        const label = `${firstDay}-${lastDay}`;
        
        bars.push(createBarFromDays(weekDays, label, isToday, colors));
      });

      if (bars.length > 0) {
        const monthStr = currentMonthDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        slides.push({
          id: `month-${currentMonthDate.getFullYear()}-${currentMonthDate.getMonth()}`,
          bars,
          periodLabel: `Mois de ${monthStr.charAt(0).toUpperCase() + monthStr.slice(1)}`,
        });
      }

      currentMonthDate.setMonth(currentMonthDate.getMonth() + 1);
    }

    return slides;
  } else if (period === 'Par année' || period === 'Global') {
    // Afficher les 12 derniers mois (ou tous les mois pour "Global")
    const slides: Slide[] = [];

    if (period === 'Global') {
      // "Global" affiche la même chose que "Par semaine" : 5 semaines
      const complete = colors.text;
      const incomplete = colors.textSecondary;
      const completeToday = '#3f8041ff';
      const incompleteToday = '#a5d6a7ff';

      for (let i = -4; i <= 0; i++) {
        const baseDay = new Date(today);
        const dayOfWeek = baseDay.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - daysToMonday + (i * 7));
        weekStart.setHours(0, 0, 0, 0);

        const bars: BarData[] = [];
        for (let j = 0; j < 7; j++) {
          const currentDay = new Date(weekStart);
          currentDay.setDate(weekStart.getDate() + j);
          const dayString = currentDay.toDateString();
          const isToday = dayString === todayString;
          const dayData = daysDataMap.get(dayString);

          const dayFormatted = currentDay.toLocaleDateString('fr-FR', { weekday: 'narrow', day: 'numeric' });

          bars.push({
            stacks: [
              { value: dayData?.done_count || 0, color: isToday ? completeToday : complete },
              { value: (dayData?.total || 0) - (dayData?.done_count || 0), color: isToday ? incompleteToday : incomplete, marginBottom: 2 },
            ],
            label: dayFormatted,
            date: dayData?.date || currentDay.toISOString(),
          });
        }

        const firstDay = new Date(weekStart);
        const lastDay = new Date(weekStart);
        lastDay.setDate(weekStart.getDate() + 6);

        const firstDayStr = firstDay.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
        const lastDayStr = lastDay.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

        slides.push({
          id: `week-${i}`,
          bars,
          periodLabel: `Semaine du ${firstDayStr} au ${lastDayStr}`,
        });
      }

      return slides;
    }

    // Pour "Par année" : afficher les 12 derniers mois
    let startDate = new Date(today);
    startDate.setFullYear(today.getFullYear() - 1);

    // Grouper par année puis par mois
    const yearMap = new Map<number, Map<number, any[]>>();
    
    let currentDate = new Date(startDate);
    while (currentDate <= today) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      
      if (!yearMap.has(year)) {
        yearMap.set(year, new Map());
      }
      
      const monthKey = currentDate.toISOString().split('T')[0].substring(0, 7); // YYYY-MM
      if (!yearMap.get(year)!.has(month)) {
        yearMap.get(year)!.set(month, []);
      }
      
      const dayString = currentDate.toDateString();
      const dayData = daysDataMap.get(dayString);
      if (dayData) {
        yearMap.get(year)!.get(month)!.push(dayData);
      } else {
        yearMap.get(year)!.get(month)!.push({
          date: currentDate.toISOString(),
          done_count: 0,
          total: 0,
        });
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Créer les slides
    yearMap.forEach((monthMap, year) => {
      const bars: BarData[] = [];
      
      for (let month = 0; month < 12; month++) {
        if (monthMap.has(month)) {
          const monthDays = monthMap.get(month)!;
          const monthDate = new Date(year, month);
          const monthName = monthDate.toLocaleDateString('fr-FR', { month: 'narrow' });
          const isThisMonth = year === today.getFullYear() && month === today.getMonth();
          
          bars.push(createBarFromDays(monthDays, monthName, isThisMonth, colors));
        }
      }

      if (bars.length > 0) {
        slides.push({
          id: `year-${year}`,
          bars,
          periodLabel: year.toString(),
        });
      }
    });

    return slides;
  }

  return [];
};

export default function StatsBarGraph({ daysData, period, onSlideChange }: StatsBarGraphProps) {
  const { width: screenWidth } = useWindowDimensions();
  const { colors } = useTheme();
  const { fontSizes } = useFont();
  
  // Fonction pour compter les semaines dans le mois
  const countWeeksInMonth = (date: Date): number => {
    const monthStart = new Date(date);
    monthStart.setDate(1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    const weeks = new Set<string>();
    let currentDate = new Date(monthStart);
    
    while (currentDate <= monthEnd) {
      const weekStart = getWeekStart(currentDate);
      const weekKey = weekStart.toISOString().split('T')[0];
      weeks.add(weekKey);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return weeks.size;
  };
  
  // Adapter la largeur des barres selon la période
  const itemWidth = screenWidth * 0.9;
  
  // Mémoriser le calcul de barWidth et numBarsPerSlide
  const barConfig = useMemo(() => {
    let barWidth: number;
    let numBarsPerSlide: number;

    if (period === 'Par semaine' || period === 'Global') {
      numBarsPerSlide = 7;
      barWidth = (itemWidth * 0.5) / numBarsPerSlide;
    } else if (period === 'Par mois') {
      numBarsPerSlide = 6;
      barWidth = (itemWidth * 0.6) / numBarsPerSlide;
    } else {
      numBarsPerSlide = 12;
      barWidth = (itemWidth * 0.35) / numBarsPerSlide;
    }
    
    return { barWidth, numBarsPerSlide };
  }, [period, itemWidth]);

  const queryClient = useQueryClient();
  const setSelectedDate = useStore((state: { setSelectedDate: any; }) => state.setSelectedDate);
  const flatListRef = useRef<FlatList>(null);
  
  // État de chargement pour éviter les freezes
  const [isLoadingSlides, setIsLoadingSlides] = useState(false);
  const [displayedSlides, setDisplayedSlides] = useState<Slide[]>([]);


  const getFormattedLabel = (date: Date) => {
    const dayOfWeek = date.toLocaleDateString('fr-FR', { weekday: 'narrow' });
    const dayOfMonth = date.getDate();
    return `${dayOfWeek}. ${dayOfMonth}`;
  }

  // Générer les slides de manière asynchrone pour éviter les freezes
  useEffect(() => {
    setIsLoadingSlides(true);
    
    // Utiliser setImmediate pour exécuter le calcul en arrière-plan
    const timeoutId = setTimeout(() => {
      const newSlides = transformDaysDataByPeriod(daysData, period, colors);
      setDisplayedSlides(newSlides);
      setIsLoadingSlides(false);
    }, 0);
    
    return () => clearTimeout(timeoutId);
  }, [daysData, period, colors]);

  const handlePressBar = useCallback(async (data: any) => {
    await Haptic.impactAsync(Haptic.ImpactFeedbackStyle.Medium);
    if (data && data.date) {
      setSelectedDate(new Date(data.date));
    }

    queryClient.invalidateQueries({ queryKey: ['days'] });

    router.replace('/');
  }, [setSelectedDate, queryClient]);

  const renderWeekChart = useCallback(({ item }: { item: Slide }) => {
    const weekStyles = getStyles(colors);
    return (
      <View style={[weekStyles.weekContainer, { width: itemWidth }]}>
        <Text
          style={{ fontSize: fontSizes.lg, fontWeight: '300', color: colors.textSecondary, paddingVertical: 8 }}
        >
          {item.periodLabel}
        </Text>
        <BarChart
          barBorderRadius={8}
          barWidth={barConfig.barWidth}
          yAxisThickness={0}
          xAxisThickness={0}
          hideAxesAndRules
          stackData={item.bars}
          // animationDuration={500}
          isAnimated={false} // Désactiver l'animation pour éviter les freezes
          hideYAxisText
          xAxisLabelTextStyle={{ fontSize: fontSizes.sm, color: colors.text }}
          onPress={handlePressBar}
          disableScroll
        />
      </View>
    );
  }, [itemWidth, fontSizes.lg, fontSizes.sm, colors, barConfig.barWidth, handlePressBar]);

  // Déterminer l'index de scroll initial selon la période
  const initialScrollIndex = useMemo(() => {
    if (period === 'Par semaine' || period === 'Global') {
      return 4; // Afficher la semaine actuelle (dernière slide)
    } else if (period === 'Par mois' || period === 'Par année') {
      // Afficher le mois/année courant (dernier slide)
      return Math.max(0, displayedSlides.length - 1);
    }
    return 0;
  }, [period, displayedSlides.length]);

  // Utiliser un useEffect pour s'assurer que le scroll se fait correctement
  useEffect(() => {
    if (!isLoadingSlides && displayedSlides.length > 0) {
      if (period === 'Par mois' || period === 'Par année') {
        const targetIndex = displayedSlides.length - 1;
        requestAnimationFrame(() => {
          flatListRef.current?.scrollToIndex({ index: targetIndex, animated: false });
        });
      } else if (period === 'Par semaine' || period === 'Global') {
        requestAnimationFrame(() => {
          flatListRef.current?.scrollToIndex({ index: 4, animated: false });
        });
      }
    }
  }, [displayedSlides.length, period, isLoadingSlides]);

  const containerStyles = getStyles(colors);

  const handleMomentumScrollEnd = useCallback((event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / itemWidth);
    
    if (index >= 0 && index < displayedSlides.length && onSlideChange) {
      onSlideChange(displayedSlides[index]);
    }
  }, [displayedSlides, itemWidth, onSlideChange]);

  return (
    <View style={containerStyles.barCharContainer}>
      {isLoadingSlides ? (
        <View style={{ 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: 220,
          width: itemWidth 
        }}>
          <ActivityIndicator size="large" color={colors.text} />
          <Text style={{ 
            marginTop: 12, 
            fontSize: 14, 
            color: colors.textSecondary,
            fontFamily: 'Satoshi-Medium'
          }}>
            Chargement...
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={displayedSlides}
          renderItem={renderWeekChart}
          keyExtractor={(item) => item.id}
          horizontal
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          snapToInterval={itemWidth}
          decelerationRate="fast"
          bounces
          initialScrollIndex={period === 'Par semaine' || period === 'Global' ? 4 : 0}
          getItemLayout={(data, index) => ({
            length: itemWidth,
            offset: itemWidth * index,
            index,
          })}
          onScrollToIndexFailed={() => { }}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          removeClippedSubviews
          updateCellsBatchingPeriod={50}
          maxToRenderPerBatch={2}
        />
      )}
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  barCharContainer: {
    backgroundColor: colors.card,
    borderRadius: 30,
    borderColor: colors.border,
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

const styles = getStyles({} as any);
