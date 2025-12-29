import CalendarComponent from "@/components/calendar";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import DraggableFlatList from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { TaskItem } from "../components/TaskItem";
import { useTheme } from "../lib/ThemeContext";
import { taskEmitter } from "../lib/eventEmitter";
import { supabase } from "../lib/supabase";
import { useStore } from "../store/store";
const LottieView = require("lottie-react-native").default;

export default function Index() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [userName, setUserName] = useState<string>('');
  const router = useRouter();
  const { colors, theme } = useTheme();
  const setStoreDate = useStore((state) => state.setSelectedDate);

  useEffect(() => {
    const fetchUserName = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          // Essayer de récupérer le nom depuis les métadonnées utilisateur
          const name = user.user_metadata?.name || user.email?.split('@')[0] || 'Utilisateur';
          setUserName(name);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération du nom utilisateur:', error);
      }
    };

    fetchUserName();
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);

      // Récupérer l'utilisateur connecté
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.error("Utilisateur non connecté");
        setTasks([]);
        return;
      }

      // Récupérer les tâches de l'utilisateur connecté
      const { data, error } = await supabase
        .from("Tasks")
        .select("*")
        .eq("user", user.id)
        .order("order", { ascending: true });

      if (error) {
        console.error("Erreur lors de la récupération des tâches:", error);
        return;
      }

      setTasks(data || []);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();

    // Écouter l'événement de suppression
    const handleTaskDeleted = () => {
      fetchTasks();
    };

    taskEmitter.on("taskDeleted", handleTaskDeleted);
    taskEmitter.on("taskAdded", fetchTasks);
    taskEmitter.on("taskUpdated", fetchTasks);


    return () => {
      taskEmitter.off("taskDeleted", handleTaskDeleted);
    };
  }, []);

  const handleAddPress = async () => {
    router.push({
      pathname: "/create-task",
      params: { selectedDate: selectedDate as unknown as string },
    });
  };

  const handleToggleTask = async (taskId: number, currentDone: boolean) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const { error } = await supabase
        .from("Tasks")
        .update({ done: !currentDone })
        .eq("id", taskId);

      if (error) {
        console.error("Erreur lors de la mise à jour de la tâche:", error);
        return;
      }

      // Mettre à jour l'état local
      setTasks(tasks.map(task =>
        task.id === taskId ? { ...task, done: !currentDone } : task
      ));
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  const handleDeleteTask = (taskId: number) => {
    // Supprimer la tâche de la liste locale
    setTasks(tasks.filter(task => task.id !== taskId));
  };

  const handleDragEnd = async ({ data }: { data: any[] }) => {
    setTasks(data);

    // Mettre à jour l'ordre dans Supabase
    try {
      for (let i = 0; i < data.length; i++) {
        const { error } = await supabase
          .from("Tasks")
          .update({ order: i })
          .eq("id", data[i].id);

        if (error) {
          console.error("Erreur lors de la mise à jour de l'ordre:", error);
        }
      }
    } catch (error) {
      console.error("Erreur:", error);
    }
    console.log("Nouveau ordre des tâches enregistré dans Supabase");
  };

  const handleTaskPress = (taskId: number) => {
    router.push(`/details?id=${taskId}`);
  };

  const handlePlaceholderIndexChange = async (index: number) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  const [date, setDate] = useState(new Date().toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }));


  const changeDate = async (newDate: Date) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log("Date changée:", newDate);
    setSelectedDate(newDate);
    setStoreDate(newDate);
    const newString = newDate.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
    setDate(newString);
  }

  // Filtrer les tâches par date sélectionnée
  const filteredTasks = tasks.filter((task) => {
    if (!task.date) return false;
    const taskDate = new Date(task.date);
    return (
      taskDate.getDate() === selectedDate.getDate() &&
      taskDate.getMonth() === selectedDate.getMonth() &&
      taskDate.getFullYear() === selectedDate.getFullYear()
    );
  });


  return (

    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={theme == "dark" ? "light" : "auto"} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          {/* <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Headline title="Tâches" subtitle="de la journée" />

            <SecondaryButton
              onPress={() => router.push("/settings")}
              image="settings"
            />
          </View> */}

          <CalendarComponent
            slider={true}
            tasks={tasks}
            onDateSelect={(date) => changeDate(date)}
          />
          {/* <Text style={[styles.date, { color: colors.text }]}>{date}</Text> */}
        </View>

        <View style={styles.listContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.text} />
            </View>
          ) : (
            <DraggableFlatList
              data={filteredTasks}
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

        {/* <View style={styles.animationContainer}>
          <LottieView
            source={require("../assets/animations/Logo.json")}
            autoPlay
            loop={false}
            style={styles.lottieAnimation}
          />
        </View> */}

        {/* <PrimaryButton style={{ alignSelf: "flex-end" }} image="add" size="XS" onPress={handleAddPress} /> */}


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
