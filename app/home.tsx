import CalendarComponent from "@/components/calendar";
import PopUpTask from "@/components/popUpTask";
import ProgressBar from "@/components/progressBar";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Dimensions, StyleSheet, Text, View } from "react-native";
import DraggableFlatList from "react-native-draggable-flatlist";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import ReAnimated, { runOnJS, runOnUI, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { TaskItem } from "../components/TaskItem";
import { useTheme } from "../lib/ThemeContext";
import { cancelDailyReminder, requestNotificationPermissions, scheduleDailyReminder } from "../lib/notificationService";
import { supabase } from "../lib/supabase";
import { useStore } from "../store/store";


const LottieView = require("lottie-react-native").default;
const SCREEN_WIDTH = Dimensions.get('window').width;

export default function Home() {
  const [loading, setLoading] = useState(true);
  const storedDate = useStore((state) => state.selectedDate);
  const [selectedDate, setSelectedDate] = useState<Date>(storedDate || new Date());
  const [userName, setUserName] = useState<string>('');
  const [userHasSeenTutorial, setUserHasSeenTutorial] = useState<boolean>(false);
  const router = useRouter();
  const { colors, theme } = useTheme();
  const setStoreDate = useStore((state) => state.setSelectedDate);
  const [progress, setProgress] = useState(0);
  const [isTaskOpen, setIsTaskOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [listHeight, setListHeight] = useState(0);
  const queryClient = useQueryClient();
  const headerScale = useSharedValue(1);
  const store = useStore();
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);




  useEffect(() => {
    const initApp = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          console.log("Utilisateur connecté : ", user);
          const name = user.user_metadata?.name || user.email?.split('@')[0] || 'Utilisateur';
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


  const dateKey = useMemo(
    () => selectedDate.toISOString().split('T')[0],
    [selectedDate]
  );

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

  const currentTasks = useMemo(() => {
    if (!taskQuery.data) return [];
    // On filtre en local et on s'assure que c'est bien trié
    // On utilise startsWith pour éviter les problèmes si Supabase retourne un format Date/Time complet
    return taskQuery.data
      .filter((task: any) => task.date && task.date.startsWith(dateKey))
      .sort((a: any, b: any) => b.order - a.order);
  }, [taskQuery.data, dateKey]);

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

  const handleTaskPress = useCallback((taskId: number) => {
    setSelectedTaskId(prevId => prevId === taskId ? null : taskId);
  }, []);

  // useEffect(() => {
  //   if(selectedTaskId !== null) {
  //     setIsTaskOpen(true);
  //   }
  // }, [selectedTaskId]);

  function closeTaskPopup() {
    setIsTaskOpen(false);
  }

  const handlePlaceholderIndexChange = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const changeDate = useCallback((newDate: Date) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDate(newDate);
    setStoreDate(newDate);
  }, [setStoreDate, setSelectedDate]);

  const translateX = useSharedValue(0);

  const goToNextDay = useCallback(() => {
    const nextDate = new Date(selectedDate);
    nextDate.setDate(nextDate.getDate() + 1);
    changeDate(nextDate);
    // On repousse l'animation pour qu'elle s'exécute après le render React
    setTimeout(() => {
      runOnUI(() => {
        'worklet';
        translateX.value = SCREEN_WIDTH;
        translateX.value = withSpring(0, { damping: 50, stiffness: 350 });
      })();
    }, 0);
  }, [selectedDate, changeDate, translateX]);

  const goToPreviousDay = useCallback(() => {
    const prevDate = new Date(selectedDate);
    prevDate.setDate(prevDate.getDate() - 1);
    changeDate(prevDate);
    // On repousse l'animation pour qu'elle s'exécute après le render React
    setTimeout(() => {
      runOnUI(() => {
        'worklet';
        translateX.value = -SCREEN_WIDTH;
        translateX.value = withSpring(0, { damping: 50, stiffness: 350 });
      })();
    }, 0);
  }, [selectedDate, changeDate, translateX]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-40, 40])
    .failOffsetY([-40, 40])
    .onUpdate((e) => {
      translateX.value = e.translationX;
    })
    .onEnd((e) => {
      const springConfig = { damping: 50, stiffness: 350 };
      
      if (e.translationX < -50) {
        // Swipe gauche -> Jour suivant
        translateX.value = withTiming(-SCREEN_WIDTH, { duration: 100 }, (isFinished) => {
          if (isFinished) {
            runOnJS(goToNextDay)();
          }
        });
      } else if (e.translationX > 50) {
        // Swipe droite -> Jour précédent
        translateX.value = withTiming(SCREEN_WIDTH, { duration: 100 }, (isFinished) => {
          if (isFinished) {
            runOnJS(goToPreviousDay)();
          }
        });
      } else {
        // Retour à la position d'origine
        translateX.value = withSpring(0, springConfig);
      }
    });

  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: withSpring(headerScale.value) }],
      marginTop: withSpring(selectedTaskId !== null ? -200 : 0),
      opacity: withSpring(selectedTaskId !== null ? 0 : 1),
    };
  }, [headerScale, selectedTaskId]);

  const listAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  useEffect(() => {
    headerScale.value = selectedTaskId !== null ? 0 : 1;
  }, [selectedTaskId, headerScale]);

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

  return (

    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={theme == "dark" ? "light" : "auto"} />
      <GestureDetector gesture={panGesture}>
        <View
          style={[styles.container, { backgroundColor: colors.background, paddingBottom: 0 }]}
          onLayout={(event) => {
            const { height } = event.nativeEvent.layout;
            setListHeight(height);
          }}
        >

          <View style={styles.header}>

            <ReAnimated.View style={headerAnimatedStyle}>
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
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.text} />
            </View>
          ) : (
            <DraggableFlatList
              data={currentTasks}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={true}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={false}
              persistentScrollbar={true}
              removeClippedSubviews={false}
              contentContainerStyle={styles.flatListContent}
              activationDistance={20}
              onDragEnd={handleDragEnd}
              onPlaceholderIndexChange={handlePlaceholderIndexChange}
              renderItem={({ item, drag, isActive }) => (
                <TaskItem
                  item={item}
                  drag={drag}
                  isActive={isActive}
                  handleToggleTask={handleToggleTask}
                  handleTaskPress={handleTaskPress}
                  selectedTaskId={selectedTaskId}
                  listHeight={listHeight}
                  mode="normal"
                  isExtendable={!isCalendarExpanded}
                />
              )}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Aucune tâche pour cette date</Text>
              }
            />
          )}
        </ReAnimated.View>

        </View>
      </GestureDetector>
      {isTaskOpen && (
        <PopUpTask
          id={selectedTaskId!}
          onClose={closeTaskPopup}
        />
      )}
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
