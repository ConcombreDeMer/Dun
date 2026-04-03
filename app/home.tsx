import CalendarComponent from "@/components/calendar";
import PopUpTask from "@/components/popUpTask";
import ProgressBar from "@/components/progressBar";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import DraggableFlatList from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import ReAnimated, { Easing, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import Squircle from "../components/Squircle";
import { TaskItem, TaskItemLayout } from "../components/TaskItem";
import { useAppTranslation } from "../lib/i18n";
import { cancelDailyReminder, requestNotificationPermissions, scheduleDailyReminder } from "../lib/notificationService";
import { supabase } from "../lib/supabase";
import { useTheme } from "../lib/ThemeContext";
import { useStore } from "../store/store";


const LottieView = require("lottie-react-native").default;
const DAY_PAGER_SIZE = 20001;
const DAY_PAGER_CENTER_INDEX = Math.floor(DAY_PAGER_SIZE / 2);
const DAY_PAGER_INDEXES = Array.from({ length: DAY_PAGER_SIZE }, (_, index) => index);

const startOfDay = (date: Date) => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

const addDays = (date: Date, amount: number) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
};

const getDateKey = (date: Date) => startOfDay(date).toISOString().split('T')[0];
const getDayOffset = (from: Date, to: Date) => {
  const start = startOfDay(from).getTime();
  const end = startOfDay(to).getTime();
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
};

type DayTasksPageProps = {
  colors: ReturnType<typeof useTheme>["colors"];
  dayIndex: number;
  dayWidth: number;
  isCalendarExpanded: boolean;
  loading: boolean;
  selectedTaskId: number | null;
  tasks: any[];
  onDragEnd?: ({ data }: { data: any[] }) => void;
  onPlaceholderIndexChange?: () => void;
  onTaskPress: (taskId: number, layout?: TaskItemLayout) => void;
  onToggleTask: (taskId: number, currentDone: boolean) => void;
  t: ReturnType<typeof useAppTranslation>["t"];
};

const DayTasksPage = ({
  colors,
  dayIndex,
  dayWidth,
  isCalendarExpanded,
  loading,
  onDragEnd,
  onPlaceholderIndexChange,
  onTaskPress,
  onToggleTask,
  selectedTaskId,
  tasks,
  t,
}: DayTasksPageProps) => {
  return (
    <View style={[styles.dayPage, { width: dayWidth }]}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.text} />
        </View>
      ) : (
        <DraggableFlatList
          data={tasks}
          keyExtractor={(item) => `${dayIndex}-${item.id}`}
          scrollEnabled={selectedTaskId === null}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          persistentScrollbar
          removeClippedSubviews={false}
          contentContainerStyle={styles.flatListContent}
          activationDistance={20}
          onDragEnd={onDragEnd}
          onPlaceholderIndexChange={onPlaceholderIndexChange}
          renderItem={({ item, drag, isActive }) => (
            <TaskItem
              item={item}
              drag={drag}
              isActive={isActive}
              handleToggleTask={onToggleTask}
              handleTaskPress={onTaskPress}
              selectedTaskId={selectedTaskId}
              listHeight={0}
              mode="normal"
              isExtendable={!isCalendarExpanded}
            />
          )}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {t("home.emptyState")}
            </Text>
          }
        />
      )}
    </View>
  );
};

export default function Home() {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const storedDate = useStore((state) => state.selectedDate);
  const pagerOriginDateRef = useRef(startOfDay(storedDate || new Date()));
  const [selectedDate, setSelectedDate] = useState<Date>(pagerOriginDateRef.current);
  const [userName, setUserName] = useState<string>('');
  const [userHasSeenTutorial, setUserHasSeenTutorial] = useState<boolean>(false);
  const { t } = useAppTranslation();
  const { colors, theme } = useTheme();
  const setStoreDate = useStore((state) => state.setSelectedDate);
  const [progress, setProgress] = useState(0);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [selectedTaskLayout, setSelectedTaskLayout] = useState<TaskItemLayout | null>(null);
  const [shouldRenderOverlayContent, setShouldRenderOverlayContent] = useState(false);
  const queryClient = useQueryClient();
  const store = useStore();
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);
  const overlayProgress = useSharedValue(0);
  const horizontalListRef = useRef<FlatList<number>>(null);
  const lastHapticPageIndexRef = useRef(DAY_PAGER_CENTER_INDEX);




  useEffect(() => {
    const initApp = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          console.log("Utilisateur connecté : ", user);
          const name = user.user_metadata?.name || user.email?.split('@')[0] || t("settings.root.defaultUserName");
          setUserName(name);
          store.setUser({ id: user.id });

          const { data, error } = await supabase
            .from("Profiles")
            .select("*")
            .eq("id", user.id)
            .single();

          if (error) {
            console.error('Erreur lors de la récupération du profil utilisateur:', error);
          } else if (data) {

            if (data.alertSetupActive) {
              const hasPermission = await requestNotificationPermissions();
              if (hasPermission) {
                await scheduleDailyReminder(parseInt(data.alertSetupHour), parseInt(data.alertSetupMinute));
              }
            } else {
              await cancelDailyReminder();
            }
          }
        }
      }
      catch (error) {
        console.error('Erreur lors de la récupération du nom utilisateur:', error);
      }

    }
    initApp();
  }, []);



  // const logStoreState = useCallback(() => {
  //   console.log("Store modifié : ", useStore.getState());
  // }, [store.alertSetupHour, store.alertSetupMinute]);

  // useEffect(() => {
  //   logStoreState();
  // }, [logStoreState]);



  useEffect(() => {
    const checkUserConnection = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data: profileData, error: profileError } = await supabase
            .from("Profiles")
            .select("hasSeenTutorial")
            .eq("id", user.id)
            .single();

          if (profileError) {
            console.error('Erreur lors de la récupération du profil utilisateur:', profileError);
            return;
          }

          setUserHasSeenTutorial(profileData?.hasSeenTutorial || false);
        }
      } catch (error) {
        console.error('Erreur lors de la vérification de la connexion utilisateur:', error);
      }
    };

    checkUserConnection();
  }, []);

  const dateKey = useMemo(() => getDateKey(selectedDate), [selectedDate]);

  useEffect(() => {
    if (!storedDate) {
      return;
    }

    const normalizedStoredDate = startOfDay(storedDate);
    if (getDateKey(normalizedStoredDate) === dateKey) {
      return;
    }

    setSelectedDate(normalizedStoredDate);
  }, [dateKey, storedDate]);

  const getTasks = async () => {
    const { data, error } = await supabase
      .from("Tasks")
      .select("id, name, description, done, order, date")
      .order("order", { ascending: false });
    if (error) {
      console.error('Erreur lors de la récupération des tâches:', error);
      return [];
    }
    return data;
  }

  const taskQuery = useQuery({
    queryKey: ['tasks'],
    queryFn: getTasks,
    gcTime: 1000 * 60 * 30, // 30 minutes de cache
    staleTime: 1000 * 60 * 15,
  });

  const tasksByDate = useMemo(() => {
    const map = new Map<string, any[]>();

    if (!taskQuery.data) {
      return map;
    }

    taskQuery.data.forEach((task: any) => {
      if (!task.date) return;
      const taskDateKey = task.date.includes('T')
        ? task.date.split('T')[0]
        : getDateKey(new Date(task.date));

      if (!map.has(taskDateKey)) {
        map.set(taskDateKey, []);
      }

      map.get(taskDateKey)!.push(task);
    });

    map.forEach((tasks) => {
      tasks.sort((a: any, b: any) => b.order - a.order);
    });

    return map;
  }, [taskQuery.data]);

  const currentTasks = useMemo(
    () => tasksByDate.get(dateKey) ?? [],
    [tasksByDate, dateKey]
  );

  useEffect(() => {
    setLoading(taskQuery.isLoading);
  }, [taskQuery.isLoading]);

  useEffect(() => {
    const calculatedProgress = currentTasks.length === 0 ? 0 : (currentTasks.filter((task: any) => task.done).length / currentTasks.length) * 100;
    setProgress(Math.round(calculatedProgress));
  }, [currentTasks]);



  // Ref pour gérer les mutations en queue (éviter les race conditions)
  const mutationQueueRef = useRef<Promise<void>>(Promise.resolve());

  const doneDayMutation = useMutation({
    mutationFn: async ({ taskId, currentDone }: { taskId: number; currentDone: boolean }) => {
      // Queue les mutations pour les exécuter séquentiellement
      return new Promise<void>((resolve, reject) => {
        mutationQueueRef.current = mutationQueueRef.current.then(async () => {
          try {
            // Récupérer l'utilisateur connecté
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
              throw new Error("Utilisateur non connecté");
            }

            // Mettre à jour le jour associé à la tâche modifiée
            const { data: existingDay, error: fetchError } = await supabase
              .from("Days")
              .select("*")
              .eq("user_id", user.id)
              .eq("date", selectedDate.toDateString())
              .maybeSingle();

            if (fetchError) {
              console.error("Erreur lors de la récupération du jour:", fetchError);
              throw new Error(fetchError.message);
            }

            if (existingDay) {
              const newDoneCount = currentDone
                ? Math.max((existingDay.done_count || 1) - 1, 0)
                : (existingDay.done_count || 0) + 1;

              const { error: updateError } = await supabase
                .from("Days")
                .update({
                  done_count: newDoneCount,
                  updated_at: new Date().toDateString(),
                })
                .eq("id", existingDay.id);

              if (updateError) {
                console.error("Erreur lors de la mise à jour du jour:", updateError);
                throw new Error(updateError.message);
              }
            }
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['days'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });



  const handleToggleTask = useCallback(async (taskId: number, currentDone: boolean) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      // Optimistic update : mettre à jour le cache immédiatement
      const previousTasks = queryClient.getQueryData<any[]>(['tasks']);

      queryClient.setQueryData(
        ['tasks'],
        previousTasks?.map((task: any) =>
          task.id === taskId ? { ...task, done: !currentDone } : task
        ) || []
      );

      // Ensuite, mettre à jour Supabase
      const { error } = await supabase
        .from("Tasks")
        .update({ done: !currentDone })
        .eq("id", taskId);

      if (error) {
        console.error("Erreur lors de la mise à jour de la tâche:", error);
        // Rollback si erreur
        queryClient.setQueryData(
          ['tasks'],
          previousTasks || []
        );
        return;
      }

      // La mutation est queuée automatiquement
      doneDayMutation.mutate({ taskId, currentDone });
    } catch (error) {
      console.error("Erreur:", error);
    }
  }, [queryClient, doneDayMutation]);


  const handleDragEnd = useCallback(async ({ data }: { data: any[] }) => {
    // Calculer les nouveaux ordres pour correspondre au tri décroissant (le premier élément doit avoir l'ordre le plus élevé)
    const updatedData = data.map((task, index) => ({
      ...task,
      order: data.length - index
    }));

    // Optimistic update immédiat avec les nouveaux "order"
    queryClient.setQueryData<any[]>(['tasks'], (oldVars) => {
      if (!oldVars) return [];
      const otherTasks = oldVars.filter((t: any) => !t.date || !t.date.startsWith(dateKey));
      return [...otherTasks, ...updatedData];
    });

    // Mettre à jour les ordres individuellement (évite les problèmes RLS avec upsert)
    try {
      for (const task of updatedData) {
        const { error } = await supabase
          .from("Tasks")
          .update({ order: task.order })
          .eq("id", task.id);

        if (error) {
          console.error("Erreur lors de la mise à jour de l'ordre:", error);
          // Rollback si erreur
          queryClient.invalidateQueries({
            queryKey: ['tasks']
          });
          break;
        }
      }
    } catch (error) {
      console.error("Erreur:", error);
    }
  }, [dateKey, queryClient]);

  const handleTaskPress = useCallback((taskId: number, layout?: TaskItemLayout) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (selectedTaskId === taskId) {
      setShouldRenderOverlayContent(false);
      overlayProgress.value = withTiming(0, {
        duration: 260,
        easing: Easing.bezier(0.2, 0.8, 0.2, 1),
      }, (finished) => {
        if (finished) {
          runOnJS(setSelectedTaskId)(null);
          runOnJS(setSelectedTaskLayout)(null);
        }
      });
      return;
    }

    if (!layout) return;

    setShouldRenderOverlayContent(false);
    setSelectedTaskLayout(layout);
    setSelectedTaskId(taskId);
    overlayProgress.value = 0;

    requestAnimationFrame(() => {
      overlayProgress.value = withTiming(1, {
        duration: 560,
        easing: Easing.bezier(0.2, 0.8, 0.2, 1),
      });
    });
  }, [overlayProgress, selectedTaskId]);

  useEffect(() => {
    if (selectedTaskId === null || selectedTaskLayout === null) return;

    const timeout = setTimeout(() => {
      setShouldRenderOverlayContent(true);
    }, 280);

    return () => clearTimeout(timeout);
  }, [selectedTaskId, selectedTaskLayout]);

  const handlePlaceholderIndexChange = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const changeDate = useCallback((newDate: Date, withHaptic = true) => {
    if (withHaptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const normalizedDate = startOfDay(newDate);
    setSelectedDate(normalizedDate);
    setStoreDate(normalizedDate);
  }, [setStoreDate, setSelectedDate]);

  useEffect(() => {
    const targetIndex = DAY_PAGER_CENTER_INDEX + getDayOffset(pagerOriginDateRef.current, selectedDate);

    requestAnimationFrame(() => {
      horizontalListRef.current?.scrollToIndex({
        index: targetIndex,
        animated: false,
      });
    });
  }, [selectedDate, windowWidth]);

  const headerAnimatedStyle = useAnimatedStyle(() => {
    const isTaskSelected = selectedTaskId !== null;

    return {
      opacity: withTiming(isTaskSelected ? 0 : 1, {
        duration: isTaskSelected ? 260 : 320,
        easing: Easing.out(Easing.quad),
      }),
      transform: [
        {
          translateY: withTiming(isTaskSelected ? -140 : 0, {
            duration: isTaskSelected ? 520 : 360,
            easing: Easing.bezier(0.2, 0.8, 0.2, 1),
          }),
        },
        {
          scale: withTiming(isTaskSelected ? 0.97 : 1, {
            duration: isTaskSelected ? 420 : 320,
            easing: Easing.bezier(0.2, 0.8, 0.2, 1),
          }),
        },
      ],
    };
  }, [selectedTaskId]);

  const listAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(selectedTaskId !== null ? 0.35 : 1, {
        duration: selectedTaskId !== null ? 220 : 280,
        easing: Easing.out(Easing.quad),
      }),
    };
  }, [selectedTaskId]);

  const selectedTask = useMemo(
    () => currentTasks.find((task: any) => task.id === selectedTaskId) ?? null,
    [currentTasks, selectedTaskId]
  );

  const overlayAnimatedStyle = useAnimatedStyle(() => {
    if (!selectedTaskLayout) {
      return {
        opacity: 0,
      };
    }

    const finalLeft = 16;
    const finalTop = 70;
    const finalWidth = windowWidth - 32;
    const finalHeight = Math.max(320, windowHeight - finalTop - 110);

    return {
      position: 'absolute',
      left: interpolate(overlayProgress.value, [0, 1], [selectedTaskLayout.x, finalLeft]),
      top: interpolate(overlayProgress.value, [0, 1], [selectedTaskLayout.y, finalTop]),
      width: interpolate(overlayProgress.value, [0, 1], [selectedTaskLayout.width, finalWidth]),
      height: interpolate(overlayProgress.value, [0, 1], [selectedTaskLayout.height, finalHeight]),
      borderRadius: interpolate(overlayProgress.value, [0, 1], [20, 30]),
      opacity: overlayProgress.value,
      transform: [
        {
          translateY: interpolate(overlayProgress.value, [0, 1], [0, 0]),
        },
      ],
    };
  }, [selectedTaskLayout, windowHeight, windowWidth]);

  const closeTutorial = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setUserHasSeenTutorial(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { error } = await supabase
          .from("Profiles")
          .update({ hasSeenTutorial: true })
          .eq("id", user.id);

        if (error) {
          console.error('Erreur lors de la mise à jour du profil utilisateur:', error);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil utilisateur:', error);
    }
  }, []);

  const handleHorizontalMomentumEnd = useCallback((event: any) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / windowWidth);
    const targetDate = addDays(pagerOriginDateRef.current, nextIndex - DAY_PAGER_CENTER_INDEX);
    lastHapticPageIndexRef.current = nextIndex;

    if (getDateKey(targetDate) !== dateKey) {
      changeDate(targetDate, false);
    }
  }, [changeDate, dateKey, windowWidth]);

  const handleHorizontalScrollBeginDrag = useCallback(() => {
    const currentIndex = DAY_PAGER_CENTER_INDEX + getDayOffset(pagerOriginDateRef.current, selectedDate);
    lastHapticPageIndexRef.current = currentIndex;
  }, [selectedDate]);

  const handleHorizontalScroll = useCallback((event: any) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / windowWidth);

    if (nextIndex === lastHapticPageIndexRef.current) {
      return;
    }

    lastHapticPageIndexRef.current = nextIndex;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [windowWidth]);

  const renderDayPage = useCallback(({ item: dayIndex }: { item: number }) => {
    const pageDate = addDays(pagerOriginDateRef.current, dayIndex - DAY_PAGER_CENTER_INDEX);
    const pageDateKey = getDateKey(pageDate);
    const pageTasks = tasksByDate.get(pageDateKey) ?? [];
    const isSelectedPage = pageDateKey === dateKey;

    return (
      <DayTasksPage
        colors={colors}
        dayIndex={dayIndex}
        dayWidth={windowWidth}
        isCalendarExpanded={isCalendarExpanded}
        loading={loading}
        onDragEnd={isSelectedPage ? handleDragEnd : undefined}
        onPlaceholderIndexChange={isSelectedPage ? handlePlaceholderIndexChange : undefined}
        onTaskPress={handleTaskPress}
        onToggleTask={handleToggleTask}
        selectedTaskId={selectedTaskId}
        tasks={pageTasks}
        t={t}
      />
    );
  }, [
    colors.text,
    colors,
    dateKey,
    handleDragEnd,
    handlePlaceholderIndexChange,
    handleTaskPress,
    handleToggleTask,
    isCalendarExpanded,
    loading,
    selectedTaskId,
    t,
    tasksByDate,
    windowWidth,
  ]);

  return (

    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={theme == "dark" ? "light" : "auto"} />
      <View
        style={[styles.container, { backgroundColor: colors.background, paddingBottom: 0 }]}
      >

        <View style={styles.header}>

          <ReAnimated.View
            pointerEvents={selectedTaskId !== null ? "none" : "auto"}
            style={headerAnimatedStyle}
          >
            <CalendarComponent
              slider={true}
              initialDate={selectedDate}
              onDateSelect={(date) => changeDate(date)}
              onExpandedChange={setIsCalendarExpanded}
            />

            <ProgressBar
              progress={progress}
            />
          </ReAnimated.View>

        </View>

        <ReAnimated.View
          style={[styles.listContainer, listAnimatedStyle]}
        >
          <FlatList
            ref={horizontalListRef}
            data={DAY_PAGER_INDEXES}
            keyExtractor={(item) => item.toString()}
            renderItem={renderDayPage}
            horizontal
            pagingEnabled
            directionalLockEnabled
            initialNumToRender={3}
            initialScrollIndex={DAY_PAGER_CENTER_INDEX}
            getItemLayout={(_, index) => ({
              length: windowWidth,
              offset: windowWidth * index,
              index,
            })}
            showsHorizontalScrollIndicator={false}
            onScrollBeginDrag={handleHorizontalScrollBeginDrag}
            onScroll={handleHorizontalScroll}
            onMomentumScrollEnd={handleHorizontalMomentumEnd}
            onScrollToIndexFailed={() => {}}
            scrollEnabled={selectedTaskId === null}
            windowSize={5}
            maxToRenderPerBatch={3}
            updateCellsBatchingPeriod={50}
            removeClippedSubviews
            scrollEventThrottle={16}
          />
        </ReAnimated.View>

        {selectedTask && selectedTaskLayout ? (
          <ReAnimated.View pointerEvents="box-none" style={styles.overlayRoot}>
            <Squircle
              style={[
                styles.overlayCard,
                { backgroundColor: colors.task, borderRadius: 10 },
                overlayAnimatedStyle,
              ]}
              cornerSmoothing={100}
              preserveSmoothing={true}
            >
              <View style={styles.overlayContent}>
                {shouldRenderOverlayContent ? (
                  <PopUpTask
                    id={selectedTask.id}
                    onClose={() => handleTaskPress(selectedTask.id)}
                  />
                ) : null}
              </View>
            </Squircle>
          </ReAnimated.View>
        ) : null}

      </View>
    </GestureHandlerRootView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    height: "100%",
  },

  header: {
    paddingBottom: 10,
  },

  listContainer: {
    flex: 1,
    height: "100%",
  },

  dayPage: {
    flex: 1,
  },

  overlayRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    pointerEvents: 'box-none',
  },

  overlayCard: {
    overflow: 'hidden',
    boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.12)',
  },

  overlayContent: {
    flex: 1,
  },

  title: {
    fontSize: 40,
    fontFamily: 'Satoshi-Black',
  },

  settingsLink: {
    height: 48,
    width: 48,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    display: 'flex',
    flexDirection: 'row',
  },

  calendar: {
    marginTop: 20,
    borderRadius: 10,
    height: 100,
    width: '100%',
  },

  date: {
    fontSize: 38,
    fontFamily: 'Satoshi-Bold',
    marginTop: 20,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  flatListContent: {
    paddingBottom: 120,
    paddingHorizontal: 20,
    gap: 8,
  },

  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },

  animationContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },

  lottieAnimation: {
    width: 100,
    aspectRatio: 1,
  },

  addButton: {
    height: 70,
    width: 70,
    borderRadius: 100,
    color: 'white',
    fontSize: 30,
    lineHeight: 65,
    position: 'absolute',
    bottom: 30,
    right: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },

});
