import CalendarComponent from "@/components/calendar";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import DraggableFlatList from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { TaskItem } from "../components/TaskItem";
import { useTheme } from "../lib/ThemeContext";
import { supabase } from "../lib/supabase";
import { useStore } from "../store/store";


const LottieView = require("lottie-react-native").default;

export default function Index() {
  const [loading, setLoading] = useState(true);
  const storedDate = useStore((state) => state.selectedDate);
  const [selectedDate, setSelectedDate] = useState<Date>(storedDate || new Date());
  const [userName, setUserName] = useState<string>('');
  const router = useRouter();
  const { colors, theme } = useTheme();
  const setStoreDate = useStore((state) => state.setSelectedDate);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUserName = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const name = user.user_metadata?.name || user.email?.split('@')[0] || 'Utilisateur';
          setUserName(name);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération du nom utilisateur:', error);
      }
    };

    fetchUserName();
  }, []);

  const dateKey = useMemo(
    () => selectedDate.toISOString().split('T')[0],
    [selectedDate]
  );

  const getTasks = async () => {
    const { data, error } = await supabase
      .from("Tasks")
      .select("id, name, done, order")
      .eq("date", dateKey)
      .order("order", { ascending: true });
    if (error) {
      console.error('Erreur lors de la récupération des tâches:', error);
      return [];
    }
    return data;
  }

  const taskQuery = useQuery({
    queryKey: ['tasks', dateKey],
    queryFn: getTasks,
  });

  useEffect(() => {
    setLoading(taskQuery.isLoading);
  }, [taskQuery.isLoading]);



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
      queryClient.invalidateQueries({ queryKey: ['tasks', selectedDate.toISOString().split('T')[0]]});
    },
  });



  const handleToggleTask = useCallback(async (taskId: number, currentDone: boolean) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      // Optimistic update : mettre à jour le cache immédiatement
      const previousTasks = queryClient.getQueryData<any[]>(['tasks', dateKey]);
      
      queryClient.setQueryData(
        ['tasks', dateKey],
        previousTasks?.map(task =>
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
          ['tasks', dateKey],
          previousTasks || []
        );
        return;
      }

      // La mutation est queuée automatiquement
      doneDayMutation.mutate({ taskId, currentDone });
    } catch (error) {
      console.error("Erreur:", error);
    }
  }, [dateKey, queryClient, doneDayMutation]);


  const handleDragEnd = useCallback(async ({ data }: { data: any[] }) => {
    // Optimistic update immédiat
    queryClient.setQueryData(
      ['tasks', dateKey],
      data
    );

    // Batch les mutations : une seule requête avec tous les ordres
    try {
      const updates = data.map((task, index) => ({
        id: task.id,
        order: index + 1,
      }));

      // Envoyer toutes les updates en une seule requête
      const { error } = await supabase
        .from("Tasks")
        .upsert(updates, { onConflict: 'id' });

      if (error) {
        console.error("Erreur lors de la mise à jour de l'ordre:", error);
        // Rollback si erreur
        queryClient.invalidateQueries({
          queryKey: ['tasks', dateKey]
        });
      }
    } catch (error) {
      console.error("Erreur:", error);
    }
  }, [dateKey, queryClient]);

  const handleTaskPress = useCallback((taskId: number) => {
    router.push(`/details?id=${taskId}`);
  }, [router]);

  const handlePlaceholderIndexChange = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const changeDate = useCallback(async (newDate: Date) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDate(newDate);
    setStoreDate(newDate);
  }, [setStoreDate, setSelectedDate]);

  return (

    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={theme == "dark" ? "light" : "auto"} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>

          <CalendarComponent
            slider={true}
            initialDate={selectedDate}
            onDateSelect={(date) => changeDate(date)}
          />

        </View>

        <View style={styles.listContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.text} />
            </View>
          ) : (
            <DraggableFlatList
              data={taskQuery.data || []}
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
                />
              )}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Aucune tâche pour cette date</Text>
              }
            />
          )}
        </View>

      </View>
    </GestureHandlerRootView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 23,
    paddingVertical: 23,
  },

  header: {
    paddingBottom: 10,
  },

  listContainer: {
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
